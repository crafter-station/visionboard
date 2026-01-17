"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Check,
  Download,
  FileDown,
  Link,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { downloadImageWithFrame } from "@/lib/download-image";
import { SignUpButton } from "@clerk/nextjs";
import { ImageCard } from "@/components/image-card";
import { PDFExportDialog } from "@/components/pdf-export-dialog";
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
import type { Goal } from "@/components/goal-input";

const LEFT_ROTATION = { min: -8, max: -2 };
const RIGHT_ROTATION = { min: 2, max: 8 };

function generateSeededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
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

interface GalleryViewProps {
  boardId?: string;
  goals: Goal[];
  userPhotoUrl?: string;
  onAddGoal: (title: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  canAddMore: boolean;
  isAtLimit: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  checkoutUrl?: string | null;
  isAddingGoal?: boolean;
  credits?: number;
}

export function GalleryView({
  boardId,
  goals,
  onAddGoal,
  onDeleteGoal,
  canAddMore,
  isAtLimit,
  isAuthenticated,
  isPro,
  checkoutUrl,
  isAddingGoal,
  credits,
}: GalleryViewProps) {
  const [copied, setCopied] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Filter out failed goals - they shouldn't clutter the UI
  const reversedGoals = useMemo(
    () => [...goals].filter((g) => g.status !== "failed").reverse(),
    [goals]
  );

  // Keyboard shortcut: Press "T" to add a new goal
  useEffect(() => {
    if (!canAddMore || isAddingNew) return;

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
        setIsAddingNew(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAddMore, isAddingNew]);

  const rotations = useMemo(() => {
    const map: Record<string, number> = {};
    reversedGoals.forEach((goal, index) => {
      map[goal.id] = getAlternatingRotation(goal.id, index);
    });
    return map;
  }, [reversedGoals]);

  const handleShare = async () => {
    if (!boardId) return;
    const url = `${window.location.origin}/b/${boardId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) return;
    onAddGoal(newGoalTitle.trim());
    setNewGoalTitle("");
    setIsAddingNew(false);
  };

  const handleAddCardClick = () => {
    if (canAddMore) {
      setIsAddingNew(true);
    }
  };

  const handleDownload = async (
    goalId: string,
    imageUrl: string,
    phrase: string | undefined,
    title: string,
  ) => {
    setDownloadingId(goalId);
    try {
      const sanitizedTitle = title
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 30);
      await downloadImageWithFrame(
        imageUrl,
        phrase || "",
        `vision-board-${sanitizedTitle}`,
        goalId,
      );
    } catch (error) {
      console.error("Failed to download image:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const allGenerated =
    goals.length > 0 &&
    goals.every((g) => g.generatedImageUrl && !g.isGenerating);

  const hasAnyCompletedImages = goals.some((g) => g.generatedImageUrl && !g.isGenerating);

  const getLimitsDisplay = () => {
    // Unified credit system for all users
    if (credits !== undefined) {
      if (credits === 0) {
        return isAuthenticated ? "Get more credits" : "Sign up for credits";
      }
      return `${credits} credit${credits !== 1 ? "s" : ""} remaining`;
    }
    return null;
  };

  const limitsDisplay = getLimitsDisplay();

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Your Goals</h2>
          {limitsDisplay && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {limitsDisplay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {boardId && hasAnyCompletedImages && (
            <PDFExportDialog
              boardId={boardId}
              goals={goals}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="size-4" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              }
            />
          )}
          {boardId && allGenerated && goals.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Link className="size-4" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {canAddMore && (
          <div
            className="relative border-2 rounded-lg flex items-center justify-center cursor-pointer bg-card dark:bg-black shadow-md hover:border-foreground/50 hover:bg-accent/50 dark:hover:bg-accent/20 transition-colors"
            style={{ aspectRatio: "3 / 4" }}
            onClick={!isAddingNew ? handleAddCardClick : undefined}
          >
            {isAddingNew ? (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center gap-3">
                <Input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGoal();
                    if (e.key === "Escape") {
                      setIsAddingNew(false);
                      setNewGoalTitle("");
                    }
                  }}
                  placeholder="Enter your goal..."
                  className="text-center"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddGoal}
                    disabled={!newGoalTitle.trim() || isAddingGoal}
                  >
                    {isAddingGoal ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewGoalTitle("");
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="size-6" />
                </div>
                <p className="text-sm text-muted-foreground">Add a goal</p>
                <kbd className="pointer-events-none hidden sm:inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 border-muted-foreground/30 bg-gradient-to-b from-muted to-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  T
                </kbd>
              </div>
            )}
          </div>
        )}

        {isAtLimit && !isAuthenticated && (
          <SignUpButton mode="modal">
            <div
              className="relative border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-foreground/50 hover:bg-accent/50 transition-colors"
              style={{ aspectRatio: "3 / 4" }}
            >
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="size-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign up to add more
                </p>
              </div>
            </div>
          </SignUpButton>
        )}

        {isAtLimit && isAuthenticated && !isPro && checkoutUrl && (
          <a
            href={checkoutUrl}
            className="relative border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-foreground/50 hover:bg-accent/50 transition-colors"
            style={{ aspectRatio: "3 / 4" }}
          >
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                Upgrade to add more
              </p>
            </div>
          </a>
        )}

        {reversedGoals.map((goal, index) => {
          const rotation = rotations[goal.id] ?? 0;
          return (
            <div
              key={goal.id}
              className="relative group"
              style={{ aspectRatio: "3 / 4" }}
            >
              <ImageCard
                id={goal.id}
                imageUrl={goal.generatedImageUrl}
                phrase={goal.phrase}
                isLoading={goal.isGenerating}
                title={goal.title}
                rotation={rotation}
              />
            {goal.generatedImageUrl && !goal.isGenerating && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    handleDownload(
                      goal.id,
                      goal.generatedImageUrl!,
                      goal.phrase,
                      goal.title,
                    )
                  }
                  disabled={downloadingId === goal.id}
                  title="Download"
                >
                  {downloadingId === goal.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </Button>
                {onDeleteGoal && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    onClick={() => setDeleteGoalId(goal.id)}
                    title="Delete"
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

      {goals.length === 0 && !isAddingNew && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Click the + card above to add your first goal
          </p>
        </div>
      )}

      <Dialog
        open={deleteGoalId !== null}
        onOpenChange={(open) => !open && setDeleteGoalId(null)}
      >
        <DialogContent
          className="sm:max-w-md"
          onKeyDown={(e) => {
            if (e.key === "d" || e.key === "D") {
              e.preventDefault();
              if (deleteGoalId && onDeleteGoal) {
                onDeleteGoal(deleteGoalId);
                setDeleteGoalId(null);
              }
            }
            if (e.key === "c" || e.key === "C") {
              e.preventDefault();
              setDeleteGoalId(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this goal? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteGoalId(null)}>
              Cancel
              <kbd className="ml-2 pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 border-muted-foreground/30 bg-gradient-to-b from-muted to-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                C
              </kbd>
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteGoalId && onDeleteGoal) {
                  onDeleteGoal(deleteGoalId);
                  setDeleteGoalId(null);
                }
              }}
            >
              Delete
              <kbd className="ml-2 pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 border-muted-foreground/30 bg-gradient-to-b from-destructive/20 to-destructive/10 px-1.5 font-mono text-[10px] font-medium text-destructive-foreground/80">
                D
              </kbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
