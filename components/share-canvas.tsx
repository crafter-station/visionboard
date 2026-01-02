"use client";

import { useMemo, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { ImageCard } from "@/components/image-card";
import type { VisionBoard, Goal } from "@/db/schema";

const LEFT_ROTATION = { min: -8, max: -3 };
const RIGHT_ROTATION = { min: 3, max: 8 };

function generateSeededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 10000) / 10000;
}

function getAlternatingRotation(id: string, index: number): number {
  const isLeft = index % 2 === 0;
  const config = isLeft ? LEFT_ROTATION : RIGHT_ROTATION;
  const range = config.max - config.min;
  const random = generateSeededRandom(id);
  return config.min + random * range;
}

interface ShareCanvasProps {
  board: VisionBoard & { goals: Goal[]; profile?: { avatarNoBgUrl: string | null } | null };
}

export function ShareCanvas({ board }: ShareCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const goalsWithImages = board.goals.filter((g) => g.generatedImageUrl);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rotations = useMemo(() => {
    const map: Record<string, number> = {};
    goalsWithImages.forEach((goal, index) => {
      map[goal.id] = getAlternatingRotation(goal.id, index);
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

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="relative min-h-[500px] rounded-lg overflow-hidden p-8">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url(/bg/white-background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: isDark ? "invert(1) hue-rotate(180deg)" : undefined,
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 max-w-3xl mx-auto">
        {goalsWithImages.map((goal, index) => {
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
    </div>
  );
}
