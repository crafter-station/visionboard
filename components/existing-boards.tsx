"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditableAvatar } from "@/components/editable-avatar";
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
  onRenameBoard?: (boardId: string, newName: string) => void;
  onCreateNewBoard?: () => void;
  onAvatarChange?: (noBgUrl: string) => void;
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
  onRenameBoard,
  onCreateNewBoard,
  onAvatarChange,
  limits,
  usage,
}: ExistingBoardsProps) {
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [boardToRename, setBoardToRename] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const avatarUrl = profile?.avatarNoBgUrl;
  const hasBoards = boards.length > 0;

  // Keyboard shortcut: Press "T" to create new board
  useEffect(() => {
    if (!onCreateNewBoard || !avatarUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        onCreateNewBoard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCreateNewBoard, avatarUrl]);

  // Show component if we can create boards or if we have existing boards
  if (!hasBoards && (!onCreateNewBoard || !avatarUrl)) return null;

  const handleRenameClick = (e: React.MouseEvent, board: VisionBoard & { goals: Goal[] }) => {
    e.stopPropagation();
    setBoardToRename({ id: board.id, name: board.name });
    setNewName(board.name);
  };

  const handleRenameSubmit = () => {
    if (boardToRename && newName.trim() && onRenameBoard) {
      onRenameBoard(boardToRename.id, newName.trim());
      setBoardToRename(null);
      setNewName("");
    }
  };

  return (
    <div className="space-y-6">
      {onCreateNewBoard && avatarUrl && (
        <div className="border rounded-lg p-4 sm:p-6 bg-card dark:bg-black shadow-md">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <EditableAvatar
              src={avatarUrl}
              onAvatarChange={onAvatarChange}
              editable={!!onAvatarChange}
              size="lg"
              className="rounded-full"
            />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-semibold mb-1">
                Create New Vision Board
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {onAvatarChange
                  ? "Click your photo to change it, or create a new board"
                  : "Use your existing photo to create another board with new goals"}
              </p>
              <Button onClick={onCreateNewBoard} className="gap-2">
                <Plus className="size-4" />
                Create New Board
                <kbd className="ml-1 pointer-events-none hidden sm:inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 border-muted-foreground/30 bg-gradient-to-b from-muted to-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  T
                </kbd>
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasBoards && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold">
              Your Vision Boards
            </h3>
            {limits && usage && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                {usage.boards}/
                {limits.MAX_BOARDS_PER_USER >= 99
                  ? "unlimited"
                  : limits.MAX_BOARDS_PER_USER}{" "}
                boards | {usage.photos}/{limits.MAX_PHOTOS_PER_USER} images
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {boards.map((board) => {
              // Filter out failed goals - they shouldn't count toward totals
              const activeGoals = board.goals.filter((g) => g.status !== "failed");
              const completedGoals = activeGoals.filter(
                (g) => g.generatedImageUrl,
              ).length;
              const totalGoals = activeGoals.length;

              return (
                <div
                  key={board.id}
                  className="border rounded-lg p-3 sm:p-4 bg-card dark:bg-black shadow-md hover:border-foreground/50 active:bg-accent/50 transition-colors cursor-pointer group relative"
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
                      <p className="text-sm font-medium truncate">{board.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {completedGoals}/{totalGoals} goals generated
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(board.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {onRenameBoard && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleRenameClick(e, board)}
                        >
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoardToDelete(board.id);
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={!!boardToDelete}
        onOpenChange={(open) => !open && !isDeleting && setBoardToDelete(null)}
      >
        <DialogContent
          className="sm:max-w-md rounded-lg"
          onKeyDown={async (e) => {
            if (isDeleting) return;
            if (e.key === "d" || e.key === "D") {
              e.preventDefault();
              if (boardToDelete) {
                setIsDeleting(true);
                try {
                  await onDeleteBoard(boardToDelete);
                } finally {
                  setIsDeleting(false);
                  setBoardToDelete(null);
                }
              }
            }
            if (e.key === "c" || e.key === "C") {
              e.preventDefault();
              setBoardToDelete(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Vision Board</DialogTitle>
            <DialogDescription>
              This will permanently delete this board and all its goals. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setBoardToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
              <kbd className="ml-2 pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 border-muted-foreground/30 bg-gradient-to-b from-muted to-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                C
              </kbd>
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (boardToDelete && !isDeleting) {
                  setIsDeleting(true);
                  try {
                    await onDeleteBoard(boardToDelete);
                  } finally {
                    setIsDeleting(false);
                    setBoardToDelete(null);
                  }
                }
              }}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Delete
                  <kbd className="ml-2 pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 border-muted-foreground/30 bg-gradient-to-b from-destructive/20 to-destructive/10 px-1.5 font-mono text-[10px] font-medium text-destructive-foreground/80">
                    D
                  </kbd>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!boardToRename}
        onOpenChange={(open) => {
          if (!open) {
            setBoardToRename(null);
            setNewName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Rename Vision Board</DialogTitle>
            <DialogDescription>
              Give your vision board a memorable name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter board name"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setBoardToRename(null);
                setNewName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newName.trim() || newName.trim() === boardToRename?.name}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
