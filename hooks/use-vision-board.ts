"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useEffect } from "react";
import type { Goal } from "@/components/goal-input";
import { useFingerprint } from "./use-fingerprint";
import type { VisionBoard, Goal as DBGoalType } from "@/db/schema";

interface BoardData {
  boardId: string;
  originalUrl: string;
  noBgUrl: string;
}

interface DBGoal {
  id: string;
  boardId: string;
  title: string;
}

interface BoardsResponse {
  boards: (VisionBoard & { goals: DBGoalType[] })[];
  limits: {
    MAX_BOARDS_PER_USER: number;
    MAX_GOALS_PER_BOARD: number;
    MAX_PHOTOS_PER_USER: number;
  };
  usage: {
    boards: number;
    photos: number;
  };
}

function createAuthHeaders(visitorId: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (visitorId) {
    headers["x-visitor-id"] = visitorId;
  }
  return headers;
}

async function saveGoalToDatabase(
  boardId: string,
  title: string,
  visitorId: string | null
): Promise<DBGoal> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: createAuthHeaders(visitorId),
    body: JSON.stringify({ boardId, title }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to save goal");
  }
  return res.json();
}

export function useVisionBoard() {
  const queryClient = useQueryClient();
  const { visitorId, isLoading: isLoadingFingerprint } = useFingerprint();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [step, setStep] = useState<"upload" | "goals" | "board">("upload");

  const { data: boardsData, isLoading: isLoadingBoards } = useQuery<BoardsResponse>({
    queryKey: ["boards", visitorId],
    queryFn: async () => {
      const res = await fetch("/api/boards", {
        headers: createAuthHeaders(visitorId),
      });
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
    enabled: !!visitorId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: BoardData) => {
      setBoardData(data);
      return data;
    },
    onSuccess: () => {
      setStep("goals");
      queryClient.invalidateQueries({ queryKey: ["boards", visitorId] });
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async ({
      goalId,
      goalPrompt,
      userImageUrl,
    }: {
      goalId: string;
      goalPrompt: string;
      userImageUrl: string;
    }) => {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: createAuthHeaders(visitorId),
        body: JSON.stringify({
          userImageUrl,
          goalId,
          goalPrompt,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate image");
      }
      return res.json();
    },
  });

  const generatePhraseMutation = useMutation({
    mutationFn: async ({ goalId, goalTitle }: { goalId: string; goalTitle: string }) => {
      const res = await fetch("/api/generate-phrase", {
        method: "POST",
        headers: createAuthHeaders(visitorId),
        body: JSON.stringify({ goalId, goalTitle }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate phrase");
      }
      return res.json();
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`/api/goals?id=${goalId}`, {
        method: "DELETE",
        headers: createAuthHeaders(visitorId),
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", visitorId] });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const res = await fetch(`/api/boards?id=${boardId}`, {
        method: "DELETE",
        headers: createAuthHeaders(visitorId),
      });
      if (!res.ok) throw new Error("Failed to delete board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", visitorId] });
    },
  });

  const loadExistingBoard = useCallback((board: VisionBoard & { goals: DBGoalType[] }) => {
    setBoardData({
      boardId: board.id,
      originalUrl: board.userPhotoUrl,
      noBgUrl: board.userPhotoNoBgUrl,
    });
    setGoals(
      board.goals.map((g) => ({
        id: g.id,
        title: g.title,
        generatedImageUrl: g.generatedImageUrl ?? undefined,
        phrase: g.phrase ?? undefined,
        isGenerating: false,
      }))
    );
    setStep("board");
  }, []);

  const generateAllImages = useCallback(async () => {
    if (!boardData) return;

    setStep("board");

    const goalsToSave = goals.filter((g) => !g.generatedImageUrl && !g.id.startsWith("goal_"));
    const existingGoals = goals.filter((g) => g.generatedImageUrl || g.id.startsWith("goal_"));
    const newGoals = goals.filter((g) => !g.id.startsWith("goal_") && !g.generatedImageUrl);

    const savedGoals = await Promise.all(
      newGoals.map(async (goal) => {
        const dbGoal = await saveGoalToDatabase(
          boardData.boardId,
          goal.title,
          visitorId
        );
        return { localId: goal.id, dbId: dbGoal.id, title: goal.title };
      })
    );

    const idMap = new Map(savedGoals.map((g) => [g.localId, g.dbId]));

    setGoals((prev) =>
      prev.map((g) => ({
        ...g,
        id: idMap.get(g.id) || g.id,
      }))
    );

    const allGoalsToProcess = [
      ...savedGoals,
      ...existingGoals
        .filter((g) => !g.generatedImageUrl)
        .map((g) => ({ localId: g.id, dbId: g.id, title: g.title })),
    ];

    const CONCURRENCY = 4;

    const processGoal = async (goalMapping: {
      localId: string;
      dbId: string;
      title: string;
    }) => {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalMapping.dbId ? { ...g, isGenerating: true } : g
        )
      );

      try {
        const [imageResult, phraseResult] = await Promise.all([
          generateImageMutation.mutateAsync({
            goalId: goalMapping.dbId,
            goalPrompt: goalMapping.title,
            userImageUrl: boardData.noBgUrl,
          }),
          generatePhraseMutation.mutateAsync({
            goalId: goalMapping.dbId,
            goalTitle: goalMapping.title,
          }),
        ]);

        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalMapping.dbId
              ? {
                  ...g,
                  isGenerating: false,
                  generatedImageUrl: imageResult.imageUrl,
                  phrase: phraseResult.phrase,
                }
              : g
          )
        );
      } catch {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalMapping.dbId ? { ...g, isGenerating: false } : g
          )
        );
      }
    };

    for (let i = 0; i < allGoalsToProcess.length; i += CONCURRENCY) {
      const batch = allGoalsToProcess.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(processGoal));
    }

    queryClient.invalidateQueries({ queryKey: ["boards", visitorId] });
  }, [boardData, goals, visitorId, generateImageMutation, generatePhraseMutation, queryClient]);

  const regenerateGoalImage = useCallback(
    async (goalId: string) => {
      if (!boardData) return;

      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, isGenerating: true } : g))
      );

      try {
        const [imageResult, phraseResult] = await Promise.all([
          generateImageMutation.mutateAsync({
            goalId,
            goalPrompt: goal.title,
            userImageUrl: boardData.noBgUrl,
          }),
          generatePhraseMutation.mutateAsync({
            goalId,
            goalTitle: goal.title,
          }),
        ]);

        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  isGenerating: false,
                  generatedImageUrl: imageResult.imageUrl,
                  phrase: phraseResult.phrase,
                }
              : g
          )
        );

        queryClient.invalidateQueries({ queryKey: ["boards", visitorId] });
      } catch {
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? { ...g, isGenerating: false } : g))
        );
      }
    },
    [boardData, goals, generateImageMutation, generatePhraseMutation, queryClient, visitorId]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      await deleteGoalMutation.mutateAsync(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    },
    [deleteGoalMutation]
  );

  const deleteBoard = useCallback(
    async (boardId: string) => {
      await deleteBoardMutation.mutateAsync(boardId);
      if (boardData?.boardId === boardId) {
        setBoardData(null);
        setGoals([]);
        setStep("upload");
      }
    },
    [deleteBoardMutation, boardData]
  );

  const resetToUpload = useCallback(() => {
    setBoardData(null);
    setGoals([]);
    setStep("upload");
  }, []);

  const savePositions = useCallback(
    async (positions: Array<{ id: string; x: number; y: number; width: number; height: number }>) => {
      try {
        await fetch("/api/save-layout", {
          method: "POST",
          headers: createAuthHeaders(visitorId),
          body: JSON.stringify({ positions }),
        });
      } catch (error) {
        console.error("Failed to save positions:", error);
      }
    },
    [visitorId]
  );

  const isGenerating = goals.some((g) => g.isGenerating);

  return {
    visitorId,
    isLoadingFingerprint,
    isLoadingBoards,
    boardData,
    goals,
    setGoals,
    step,
    setStep,
    isGenerating,
    existingBoards: boardsData?.boards ?? [],
    limits: boardsData?.limits,
    usage: boardsData?.usage,
    onUploadComplete: uploadMutation.mutate,
    generateAllImages,
    regenerateGoalImage,
    deleteGoal,
    deleteBoard,
    loadExistingBoard,
    resetToUpload,
    savePositions,
  };
}
