"use client";

import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VisionBoard, Goal } from "@/db/schema";

interface ProfileData {
  id: string;
  avatarOriginalUrl: string | null;
  avatarNoBgUrl: string | null;
}

interface ExistingBoardsProps {
  boards: (VisionBoard & { goals: Goal[] })[];
  profile?: ProfileData | null;
  onSelectBoard: (board: VisionBoard & { goals: Goal[] }) => void;
  onDeleteBoard: (boardId: string) => void;
  onCreateNewBoard?: () => void;
  limits?: {
    MAX_BOARDS_PER_USER: number;
    MAX_GOALS_PER_BOARD: number;
    MAX_PHOTOS_PER_USER: number;
  };
  usage?: {
    boards: number;
    photos: number;
  };
}

export function ExistingBoards({
  boards,
  profile,
  onSelectBoard,
  onDeleteBoard,
  onCreateNewBoard,
  limits,
  usage,
}: ExistingBoardsProps) {
  if (boards.length === 0) return null;

  const avatarUrl = profile?.avatarNoBgUrl;

  return (
    <div className="space-y-6">
      {onCreateNewBoard && avatarUrl && (
        <div className="border-2 border-dashed rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="size-16 sm:size-20 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-foreground">
              <img
                src={avatarUrl}
                alt="Your photo"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-semibold mb-1">Create New Vision Board</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use your existing photo to create another board with new goals
              </p>
              <Button onClick={onCreateNewBoard} className="gap-2">
                <Plus className="size-4" />
                Create New Board
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold">Your Vision Boards</h3>
          {limits && usage && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              {usage.boards}/{limits.MAX_BOARDS_PER_USER === Infinity ? "unlimited" : limits.MAX_BOARDS_PER_USER} boards | {usage.photos}/{limits.MAX_PHOTOS_PER_USER} images
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {boards.map((board) => {
            const completedGoals = board.goals.filter((g) => g.generatedImageUrl).length;
            const totalGoals = board.goals.length;

            return (
              <div
                key={board.id}
                className="border rounded-lg p-3 sm:p-4 hover:border-foreground/50 active:bg-accent/50 transition-colors cursor-pointer group relative"
                onClick={() => onSelectBoard(board)}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className="size-14 sm:size-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-sm font-medium truncate">
                      {totalGoals} goal{totalGoals !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {completedGoals}/{totalGoals} generated
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(board.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 sm:size-9 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this board and all its goals?")) {
                        onDeleteBoard(board.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
