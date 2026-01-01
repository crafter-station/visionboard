"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { Check, Link } from "lucide-react";
import { ImageCard } from "@/components/image-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Goal } from "@/components/goal-input";

const FRAME_RATIO = 1618 / 2001;

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
  positions: Position[];
  onPositionChange: (positions: Position[]) => void;
}

export function VisionCanvas({
  boardId,
  goals,
  positions,
  onPositionChange,
}: VisionCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const rotations = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach((goal) => {
      map[goal.id] = getRandomRotation(goal.id);
    });
    return map;
  }, [goals]);

  const getPosition = (goalId: string, index: number): Position => {
    const existing = positions.find((p) => p.id === goalId);
    if (existing) return existing;

    const cols = 3;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const spacing = 20;
    const cardWidth = 200;
    const cardHeight = Math.round(cardWidth / FRAME_RATIO);

    return {
      id: goalId,
      x: col * (cardWidth + spacing) + spacing,
      y: row * (cardHeight + spacing) + spacing + 100,
      width: cardWidth,
      height: cardHeight,
    };
  };

  const handleDragStop = useCallback(
    (goalId: string, x: number, y: number) => {
      const newPositions = positions.filter((p) => p.id !== goalId);
      const current = positions.find((p) => p.id === goalId);
      const defaultWidth = 200;
      const defaultHeight = Math.round(defaultWidth / FRAME_RATIO);
      newPositions.push({
        id: goalId,
        x,
        y,
        width: current?.width || defaultWidth,
        height: current?.height || defaultHeight,
      });
      onPositionChange(newPositions);
    },
    [positions, onPositionChange]
  );

  const handleResizeStop = useCallback(
    (goalId: string, width: number, height: number, x: number, y: number) => {
      const newPositions = positions.filter((p) => p.id !== goalId);
      newPositions.push({ id: goalId, x, y, width, height });
      onPositionChange(newPositions);
    },
    [positions, onPositionChange]
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
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold">Your Vision Board</h2>
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
        className="relative w-full min-h-[600px] border overflow-hidden"
        style={{
          height: "calc(100vh - 200px)",
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
              minWidth={120}
              minHeight={Math.round(120 / FRAME_RATIO)}
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
              <ImageCard
                imageUrl={goal.generatedImageUrl}
                phrase={goal.phrase}
                isLoading={goal.isGenerating}
                title={goal.title}
              />
            </Rnd>
          );
        })}
      </div>
    </div>
  );
}
