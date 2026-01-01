"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { Check, Link, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import { ImageCard } from "@/components/image-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Goal } from "@/components/goal-input";

const FRAME_RATIO = 1618 / 2001;
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

interface Position {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisionCanvasProps {
  boardId?: string;
  goals: Goal[];
  onRegenerate?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onBack?: () => void;
  onSavePositions?: (positions: Position[]) => void;
}

export function VisionCanvas({
  boardId,
  goals,
  onRegenerate,
  onDeleteGoal,
  onBack,
  onSavePositions,
}: VisionCanvasProps) {
  const [copied, setCopied] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const rotations = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach((goal, index) => {
      map[goal.id] = getAlternatingRotation(goal.id, index);
    });
    return map;
  }, [goals]);

  const debouncedSave = useCallback(
    (newPositions: Position[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onSavePositions?.(newPositions);
      }, 500);
    },
    [onSavePositions]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const getPosition = useCallback(
    (goalId: string, index: number): Position => {
      const existing = positions.find((p) => p.id === goalId);
      if (existing) return existing;

      const cols = 2;
      const row = Math.floor(index / cols);
      const col = index % cols;
      const spacing = 80;
      const cardWidth = 220;
      const cardHeight = Math.round(cardWidth / FRAME_RATIO);

      return {
        id: goalId,
        x: col * (cardWidth + spacing) + spacing,
        y: row * (cardHeight + spacing) + spacing,
        width: cardWidth,
        height: cardHeight,
      };
    },
    [positions]
  );

  const handleDragStop = useCallback(
    (goalId: string, x: number, y: number) => {
      setPositions((prev) => {
        const newPositions = prev.filter((p) => p.id !== goalId);
        const current = prev.find((p) => p.id === goalId);
        const defaultWidth = 220;
        const defaultHeight = Math.round(defaultWidth / FRAME_RATIO);
        newPositions.push({
          id: goalId,
          x,
          y,
          width: current?.width || defaultWidth,
          height: current?.height || defaultHeight,
        });
        debouncedSave(newPositions);
        return newPositions;
      });
    },
    [debouncedSave]
  );

  const handleResizeStop = useCallback(
    (goalId: string, width: number, height: number, x: number, y: number) => {
      setPositions((prev) => {
        const newPositions = prev.filter((p) => p.id !== goalId);
        newPositions.push({ id: goalId, x, y, width, height });
        debouncedSave(newPositions);
        return newPositions;
      });
    },
    [debouncedSave]
  );

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
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Drag and resize to arrange
          </p>
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
      </div>

      <div
        ref={canvasRef}
        className="relative w-full min-h-[600px] rounded-lg overflow-hidden"
        style={{
          height: "calc(100vh - 250px)",
          backgroundImage: "url(/bg/white-background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {goals.map((goal, index) => {
          const pos = getPosition(goal.id, index);
          const rotation = rotations[goal.id] ?? 0;

          return (
            <Rnd
              key={goal.id}
              default={{
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
              }}
              position={{ x: pos.x, y: pos.y }}
              size={{ width: pos.width, height: pos.height }}
              minWidth={150}
              minHeight={Math.round(150 / FRAME_RATIO)}
              lockAspectRatio={FRAME_RATIO}
              bounds="parent"
              onDragStop={(e, d) => handleDragStop(goal.id, d.x, d.y)}
              onResizeStop={(e, direction, ref, delta, position) => {
                handleResizeStop(
                  goal.id,
                  parseInt(ref.style.width),
                  parseInt(ref.style.height),
                  position.x,
                  position.y
                );
              }}
              className={cn(
                "shadow-lg transition-shadow hover:shadow-xl",
                "cursor-move"
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
              resizeHandleStyles={{
                bottomRight: {
                  width: 20,
                  height: 20,
                  bottom: 0,
                  right: 0,
                  cursor: "se-resize",
                },
              }}
            >
              <div className="relative w-full h-full group">
                <ImageCard
                  imageUrl={goal.generatedImageUrl}
                  phrase={goal.phrase}
                  isLoading={goal.isGenerating}
                  title={goal.title}
                />
                {goal.generatedImageUrl && !goal.isGenerating && (onRegenerate || onDeleteGoal) && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {onRegenerate && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegenerate(goal.id);
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation();
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
            </Rnd>
          );
        })}
      </div>
    </div>
  );
}
