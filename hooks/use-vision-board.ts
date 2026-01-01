"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { Goal } from "@/components/goal-input";
import { useFingerprint } from "./use-fingerprint";

interface BoardData {
  boardId: string;
  originalUrl: string;
  noBgUrl: string;
}

interface Position {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DBGoal {
  id: string;
  boardId: string;
  title: string;
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
    throw new Error("Failed to save goal");
  }
  return res.json();
}

export function useVisionBoard() {
  const { visitorId, isLoading: isLoadingFingerprint } = useFingerprint();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [step, setStep] = useState<"upload" | "goals" | "canvas">("upload");

  const uploadMutation = useMutation({
    mutationFn: async (data: BoardData) => {
      setBoardData(data);
      return data;
    },
    onSuccess: () => {
      setStep("goals");
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async ({
      goalId,
      goalPrompt,
    }: {
      goalId: string;
      goalPrompt: string;
    }) => {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: createAuthHeaders(visitorId),
        body: JSON.stringify({
          userImageUrl: boardData?.noBgUrl,
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

  const saveLayoutMutation = useMutation({
    mutationFn: async (positions: Position[]) => {
      const res = await fetch("/api/save-layout", {
        method: "POST",
        headers: createAuthHeaders(visitorId),
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) throw new Error("Failed to save layout");
      return res.json();
    },
  });

  const generateAllImages = useCallback(async () => {
    if (!boardData) return;

    setStep("canvas");

    const savedGoals = await Promise.all(
      goals.map(async (goal) => {
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

    const CONCURRENCY = 3;

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

    for (let i = 0; i < savedGoals.length; i += CONCURRENCY) {
      const batch = savedGoals.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(processGoal));
    }
  }, [boardData, goals, visitorId, generateImageMutation, generatePhraseMutation]);

  const handlePositionChange = useCallback(
    (newPositions: Position[]) => {
      setPositions(newPositions);
      saveLayoutMutation.mutate(newPositions);
    },
    [saveLayoutMutation]
  );

  const isGenerating = goals.some((g) => g.isGenerating);

  return {
    visitorId,
    isLoadingFingerprint,
    boardData,
    goals,
    setGoals,
    positions,
    step,
    setStep,
    isGenerating,
    onUploadComplete: uploadMutation.mutate,
    generateAllImages,
    handlePositionChange,
  };
}
