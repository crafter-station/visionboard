"use client";

import { useMemo } from "react";
import { ImageCard } from "@/components/image-card";
import type { VisionBoard, Goal } from "@/db/schema";

const ROTATION_CONFIG = {
  min: -9,
  max: 14,
} as const;

function generateSeededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 10000) / 10000;
}

function getRandomRotation(id: string): number {
  const { min, max } = ROTATION_CONFIG;
  const range = max - min;
  const random = generateSeededRandom(id);
  return min + random * range;
}

interface ShareCanvasProps {
  board: VisionBoard & { goals: Goal[] };
}

export function ShareCanvas({ board }: ShareCanvasProps) {
  const goalsWithImages = board.goals.filter((g) => g.generatedImageUrl);

  const rotations = useMemo(() => {
    const map: Record<string, number> = {};
    goalsWithImages.forEach((goal) => {
      map[goal.id] = getRandomRotation(goal.id);
    });
    return map;
  }, [goalsWithImages]);

  if (goalsWithImages.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">
          This vision board is still being created.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
      {goalsWithImages.map((goal) => {
        const rotation = rotations[goal.id] ?? 0;
        return (
          <div
            key={goal.id}
            className="transition-transform hover:scale-105"
            style={{
              aspectRatio: "1618 / 2001",
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <ImageCard
              imageUrl={goal.generatedImageUrl ?? undefined}
              phrase={goal.phrase ?? undefined}
              title={goal.title}
            />
          </div>
        );
      })}
    </div>
  );
}
