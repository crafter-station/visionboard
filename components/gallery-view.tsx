"use client";

import { useState, useMemo } from "react";
import { Check, Link, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import { ImageCard } from "@/components/image-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Goal } from "@/components/goal-input";

interface GalleryViewProps {
  boardId?: string;
  goals: Goal[];
  userPhotoUrl?: string;
  onAddGoal: (title: string) => void;
  onRegenerate?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  canAddMore: boolean;
  isAtLimit: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  checkoutUrl?: string | null;
  isAddingGoal?: boolean;
}

export function GalleryView({
  boardId,
  goals,
  onAddGoal,
  onRegenerate,
  onDeleteGoal,
  canAddMore,
  isAtLimit,
  isAuthenticated,
  isPro,
  checkoutUrl,
  isAddingGoal,
}: GalleryViewProps) {
  const [copied, setCopied] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  const reversedGoals = useMemo(() => [...goals].reverse(), [goals]);

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

  const allGenerated = goals.length > 0 && goals.every((g) => g.generatedImageUrl && !g.isGenerating);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Goals</h2>
        <div className="flex items-center gap-3">
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {canAddMore && (
          <div
            className="relative border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-foreground/50 hover:bg-accent/50 transition-colors"
            style={{ aspectRatio: "1618 / 2001" }}
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
              </div>
            )}
          </div>
        )}

        {isAtLimit && !isAuthenticated && (
          <SignUpButton mode="modal">
            <div
              className="relative border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-foreground/50 hover:bg-accent/50 transition-colors"
              style={{ aspectRatio: "1618 / 2001" }}
            >
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="size-6" />
                </div>
                <p className="text-sm text-muted-foreground">Sign up to add more</p>
              </div>
            </div>
          </SignUpButton>
        )}

        {isAtLimit && isAuthenticated && !isPro && checkoutUrl && (
          <a
            href={checkoutUrl}
            className="relative border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-foreground/50 hover:bg-accent/50 transition-colors"
            style={{ aspectRatio: "1618 / 2001" }}
          >
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">Upgrade to add more</p>
            </div>
          </a>
        )}

        {reversedGoals.map((goal) => (
          <div
            key={goal.id}
            className="relative group"
            style={{ aspectRatio: "1618 / 2001" }}
          >
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
                    onClick={() => onRegenerate(goal.id)}
                    title="Regenerate"
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
                    title="Delete"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {goals.length === 0 && !isAddingNew && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Click the + card above to add your first goal
          </p>
        </div>
      )}
    </div>
  );
}

