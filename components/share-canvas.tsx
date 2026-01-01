"use client";

import { ImageCard } from "@/components/image-card";
import type { VisionBoard, Goal } from "@/db/schema";

interface ShareCanvasProps {
  board: VisionBoard & { goals: Goal[] };
}

export function ShareCanvas({ board }: ShareCanvasProps) {
  const goalsWithImages = board.goals.filter((g) => g.generatedImageUrl);

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
    <div className="space-y-6">
      <div className="flex justify-center">
        <img
          src={board.userPhotoNoBgUrl}
          alt="Creator"
          className="h-24 w-auto object-contain"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {goalsWithImages.map((goal) => (
          <div
            key={goal.id}
            style={{ aspectRatio: "1618 / 2001" }}
          >
            <ImageCard
              imageUrl={goal.generatedImageUrl ?? undefined}
              phrase={goal.phrase ?? undefined}
              title={goal.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
