"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useEffect } from "react";
import type { Goal } from "@/components/goal-input";
import { useAuth } from "./use-auth";
import type { VisionBoard, Goal as DBGoalType } from "@/db/schema";

interface ProfileData {
  id: string;
  avatarOriginalUrl: string | null;
  avatarNoBgUrl: string | null;
}

interface BoardData {
  boardId: string;
  profileId: string;
  avatarOriginalUrl: string | null;
  avatarNoBgUrl: string | null;
}

interface DBGoal {
  id: string;
  boardId: string;
  title: string;
}

interface BoardsResponse {
  boards: (VisionBoard & { goals: DBGoalType[] })[];
  profile: ProfileData | null;
  limits: {
    MAX_BOARDS_PER_USER: number;
    MAX_GOALS_PER_BOARD: number;
    MAX_PHOTOS_PER_USER: number;
  };
  usage: {
    boards: number;
    photos: number;
  };
  isAuthenticated: boolean;
  isPaid: boolean;
  credits: number;
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
  const { userId, visitorId, isLoading: isLoadingAuth, isAuthenticated, hasMigrated } = useAuth();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [step, setStep] = useState<"upload" | "gallery">("upload");
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const queryKey = ["boards", userId || visitorId];

  const { data: boardsData, isLoading: isLoadingBoards, refetch: refetchBoards } = useQuery<BoardsResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch("/api/boards", {
        headers: createAuthHeaders(visitorId),
      });
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
    enabled: !isLoadingAuth && (!!userId || !!visitorId),
  });

  useEffect(() => {
    if (hasMigrated) {
      refetchBoards();
    }
  }, [hasMigrated, refetchBoards]);

  const uploadMutation = useMutation({
    mutationFn: async (data: { boardId: string; profileId: string; originalUrl: string; noBgUrl: string }) => {
      const boardData: BoardData = {
        boardId: data.boardId,
        profileId: data.profileId,
        avatarOriginalUrl: data.originalUrl,
        avatarNoBgUrl: data.noBgUrl,
      };
      setBoardData(boardData);
      return boardData;
    },
    onSuccess: () => {
      setStep("gallery");
      queryClient.invalidateQueries({ queryKey });
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
      queryClient.invalidateQueries({ queryKey });
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
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const loadExistingBoard = useCallback((board: VisionBoard & { goals: DBGoalType[] }) => {
    const profile = boardsData?.profile;
    setBoardData({
      boardId: board.id,
      profileId: board.profileId,
      avatarOriginalUrl: profile?.avatarOriginalUrl ?? null,
      avatarNoBgUrl: profile?.avatarNoBgUrl ?? null,
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
    setStep("gallery");
  }, [boardsData?.profile]);

  const addAndGenerateGoal = useCallback(
    async (title: string) => {
      if (!boardData?.avatarNoBgUrl) return;

      setIsAddingGoal(true);

      try {
        const dbGoal = await saveGoalToDatabase(boardData.boardId, title, visitorId);

        const newGoal: Goal = {
          id: dbGoal.id,
          title,
          isGenerating: true,
        };

        setGoals((prev) => [...prev, newGoal]);

        const [imageResult, phraseResult] = await Promise.all([
          generateImageMutation.mutateAsync({
            goalId: dbGoal.id,
            goalPrompt: title,
            userImageUrl: boardData.avatarNoBgUrl!,
          }),
          generatePhraseMutation.mutateAsync({
            goalId: dbGoal.id,
            goalTitle: title,
          }),
        ]);

        setGoals((prev) =>
          prev.map((g) =>
            g.id === dbGoal.id
              ? {
                  ...g,
                  isGenerating: false,
                  generatedImageUrl: imageResult.imageUrl,
                  phrase: phraseResult.phrase,
                }
              : g
          )
        );

        queryClient.invalidateQueries({ queryKey });
      } catch (error) {
        setGoals((prev) => prev.filter((g) => g.title !== title || !g.isGenerating));
        throw error;
      } finally {
        setIsAddingGoal(false);
      }
    },
    [boardData, visitorId, generateImageMutation, generatePhraseMutation, queryClient, queryKey]
  );

  const regenerateGoalImage = useCallback(
    async (goalId: string) => {
      if (!boardData?.avatarNoBgUrl) return;

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
            userImageUrl: boardData.avatarNoBgUrl,
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

        queryClient.invalidateQueries({ queryKey });
      } catch {
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? { ...g, isGenerating: false } : g))
        );
      }
    },
    [boardData, goals, generateImageMutation, generatePhraseMutation, queryClient, queryKey]
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

  const resetToBoards = useCallback(() => {
    setBoardData(null);
    setGoals([]);
    setStep("upload");
  }, []);

  const createBoardWithExistingPhoto = useCallback(async () => {
    const profile = boardsData?.profile;
    if (!profile?.avatarNoBgUrl) return;
    if (!userId && !visitorId) return;

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: createAuthHeaders(visitorId),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create board");
    }

    const data = await res.json();
    setBoardData({
      boardId: data.boardId,
      profileId: data.profileId,
      avatarOriginalUrl: data.avatarOriginalUrl,
      avatarNoBgUrl: data.avatarNoBgUrl,
    });
    setGoals([]);
    setStep("gallery");
    queryClient.invalidateQueries({ queryKey });
  }, [boardsData, userId, visitorId, queryClient, queryKey]);

  const profile = boardsData?.profile;
  const hasExistingPhoto = !!profile?.avatarNoBgUrl;
  const isPaid = boardsData?.isPaid ?? false;
  const credits = boardsData?.credits ?? 0;
  const photosUsed = boardsData?.usage?.photos ?? 0;
  const maxPhotos = boardsData?.limits?.MAX_PHOTOS_PER_USER ?? 3;

  const pendingGoals = goals.filter((g) => g.isGenerating).length;
  const effectivePhotosUsed = photosUsed + pendingGoals;
  const canAddMoreGoals = isPaid ? credits > pendingGoals : effectivePhotosUsed < maxPhotos;
  const isAtLimit = !canAddMoreGoals;
  const isGenerating = goals.some((g) => g.isGenerating);

  return {
    visitorId,
    userId,
    isAuthenticated,
    hasMigrated,
    isLoadingAuth,
    isLoadingBoards,
    boardData,
    profile,
    goals,
    setGoals,
    step,
    setStep,
    isGenerating,
    isAddingGoal,
    existingBoards: boardsData?.boards ?? [],
    limits: boardsData?.limits,
    usage: boardsData?.usage,
    isPaid,
    credits,
    hasExistingPhoto,
    canAddMoreGoals,
    isAtLimit,
    onUploadComplete: uploadMutation.mutate,
    addAndGenerateGoal,
    regenerateGoalImage,
    deleteGoal,
    deleteBoard,
    loadExistingBoard,
    resetToBoards,
    createBoardWithExistingPhoto,
    refetchBoards,
  };
}
