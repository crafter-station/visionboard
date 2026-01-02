"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useEffect, useRef } from "react";
import type { Goal } from "@/components/goal-input";
import { useAuth } from "./use-auth";
import type { VisionBoard, Goal as DBGoalType } from "@/db/schema";
import { LIMITS } from "@/lib/constants";

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

const defaultHeaders: HeadersInit = { "Content-Type": "application/json" };

async function saveGoalToDatabase(
  boardId: string,
  title: string,
): Promise<DBGoal> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: defaultHeaders,
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
  const { userId, isLoading: isLoadingAuth, isAuthenticated } = useAuth();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [step, setStep] = useState<"upload" | "gallery">("upload");
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const queryKey = ["boards", userId];

  const {
    data: boardsData,
    isLoading: isLoadingBoards,
    refetch: refetchBoards,
  } = useQuery<BoardsResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch("/api/boards", { headers: defaultHeaders });
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
    enabled: !isLoadingAuth && isAuthenticated,
  });

  const goalsRef = useRef(goals);
  goalsRef.current = goals;

  const generatingGoalIds = goals
    .filter((g) => g.status === "generating" || g.status === "pending")
    .map((g) => g.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!generatingGoalIds || !boardData?.boardId) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/goals?boardId=${boardData.boardId}`, {
          headers: defaultHeaders,
        });
        if (!res.ok) return;

        const updatedGoals = await res.json();
        setGoals((prev) =>
          prev.map((g) => {
            const updated = updatedGoals.find((u: DBGoalType) => u.id === g.id);
            if (!updated) return g;
            if (updated.status === "completed" || updated.status === "failed") {
              return {
                ...g,
                isGenerating: false,
                generatedImageUrl: updated.generatedImageUrl ?? undefined,
                phrase: updated.phrase ?? undefined,
                status: updated.status,
              };
            }
            return g;
          }),
        );
      } catch {
        // Silently fail polling
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [generatingGoalIds, boardData?.boardId]);

  const uploadMutation = useMutation({
    mutationFn: async (data: {
      boardId: string;
      profileId: string;
      originalUrl: string;
      noBgUrl: string;
    }) => {
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
        headers: defaultHeaders,
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
    mutationFn: async ({
      goalId,
      goalTitle,
    }: {
      goalId: string;
      goalTitle: string;
    }) => {
      const res = await fetch("/api/generate-phrase", {
        method: "POST",
        headers: defaultHeaders,
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
        headers: defaultHeaders,
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
        headers: defaultHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const renameBoardMutation = useMutation({
    mutationFn: async ({ boardId, name }: { boardId: string; name: string }) => {
      const res = await fetch("/api/boards", {
        method: "PATCH",
        headers: defaultHeaders,
        body: JSON.stringify({ boardId, name }),
      });
      if (!res.ok) throw new Error("Failed to rename board");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const loadExistingBoard = useCallback(
    (board: VisionBoard & { goals: DBGoalType[] }) => {
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
          isGenerating: g.status === "generating" || g.status === "pending",
          status: g.status,
        })),
      );
      setStep("gallery");
    },
    [boardsData?.profile],
  );

  const addAndGenerateGoal = useCallback(
    async (title: string) => {
      if (!boardData?.avatarNoBgUrl) return;

      setIsAddingGoal(true);
      let goalId: string | null = null;

      try {
        const dbGoal = await saveGoalToDatabase(boardData.boardId, title);
        goalId = dbGoal.id;

        const newGoal: Goal = {
          id: dbGoal.id,
          title,
          isGenerating: true,
          status: "pending",
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
                  status: "completed" as const,
                }
              : g,
          ),
        );

        queryClient.invalidateQueries({ queryKey });
      } catch (error) {
        if (goalId) {
          setGoals((prev) =>
            prev.map((g) =>
              g.id === goalId
                ? { ...g, isGenerating: false, status: "failed" as const }
                : g,
            ),
          );
        }
        throw error;
      } finally {
        setIsAddingGoal(false);
      }
    },
    [boardData, generateImageMutation, generatePhraseMutation, queryClient, queryKey],
  );

  const regenerateGoalImage = useCallback(
    async (goalId: string) => {
      if (!boardData?.avatarNoBgUrl) return;

      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, isGenerating: true, status: "generating" as const }
            : g,
        ),
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
                  status: "completed" as const,
                }
              : g,
          ),
        );

        queryClient.invalidateQueries({ queryKey });
      } catch {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? { ...g, isGenerating: false, status: "failed" as const }
              : g,
          ),
        );
      }
    },
    [boardData, goals, generateImageMutation, generatePhraseMutation, queryClient, queryKey],
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      await deleteGoalMutation.mutateAsync(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    },
    [deleteGoalMutation],
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
    [deleteBoardMutation, boardData],
  );

  const renameBoard = useCallback(
    async (boardId: string, newName: string) => {
      await renameBoardMutation.mutateAsync({ boardId, name: newName });
    },
    [renameBoardMutation],
  );

  const resetToBoards = useCallback(() => {
    setBoardData(null);
    setGoals([]);
    setStep("upload");
  }, []);

  const createBoardWithExistingPhoto = useCallback(async (): Promise<string | null> => {
    const profile = boardsData?.profile;
    if (!profile?.avatarNoBgUrl) return null;
    if (!userId) return null;

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: defaultHeaders,
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
    return data.boardId;
  }, [boardsData, userId, queryClient, queryKey]);

  const profile = boardsData?.profile;
  const hasExistingPhoto = !!profile?.avatarNoBgUrl;
  const isPaid = boardsData?.isPaid ?? false;
  const credits = boardsData?.credits ?? 0;
  const photosUsed = boardsData?.usage?.photos ?? 0;
  const maxPhotos = boardsData?.limits?.MAX_PHOTOS_PER_USER ?? LIMITS.FREE_MAX_PHOTOS;

  const pendingGoals = goals.filter((g) => g.isGenerating).length;
  const effectivePhotosUsed = photosUsed + pendingGoals;
  const canAddMoreGoals = isPaid
    ? credits > pendingGoals
    : effectivePhotosUsed < maxPhotos;
  const isAtLimit = !canAddMoreGoals;
  const isGenerating = goals.some((g) => g.isGenerating);

  return {
    userId,
    isAuthenticated,
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
    renameBoard,
    loadExistingBoard,
    resetToBoards,
    createBoardWithExistingPhoto,
    refetchBoards,
  };
}
