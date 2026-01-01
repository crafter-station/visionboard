"use client";

import { useMemo, useState } from "react";
import { Check, Link, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import { ImageCard } from "@/components/image-card";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/components/goal-input";

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

interface VisionCanvasProps {
  boardId?: string;
  goals: Goal[];
  onRegenerate?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onBack?: () => void;
}

export function VisionCanvas({
  boardId,
  goals,
  onRegenerate,
  onDeleteGoal,
  onBack,
}: VisionCanvasProps) {
  const [copied, setCopied] = useState(false);

  const rotations = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach((goal) => {
      map[goal.id] = getRandomRotation(goal.id);
    });
    return map;
  }, [goals]);

  const handleShare = async () => {
    if (!boardId) return;

    const url = `${window.location.origin}/board/${boardId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allGenerated = goals.every((g) => g.generatedImageUrl && !g.isGenerating);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}
          <h2 className="text-lg font-semibold">Your Vision Board</h2>
        </div>
        {boardId && allGenerated && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copied
              </>
            ) : (
              <>
                <Link className="size-4" />
                Share
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
        {goals.map((goal) => {
          const rotation = rotations[goal.id] ?? 0;
          return (
            <div
              key={goal.id}
              className="relative group"
              style={{
                aspectRatio: "1618 / 2001",
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <ImageCard
                imageUrl={goal.generatedImageUrl}
                phrase={goal.phrase}
                isLoading={goal.isGenerating}
                title={goal.title}
              />
              {goal.generatedImageUrl && !goal.isGenerating && (onRegenerate || onDeleteGoal) && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRegenerate && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8"
                      onClick={() => onRegenerate(goal.id)}
                      title="Regenerate image"
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  )}
                  {onDeleteGoal && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        if (confirm("Delete this goal?")) {
                          onDeleteGoal(goal.id);
                        }
                      }}
                      title="Delete goal"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
