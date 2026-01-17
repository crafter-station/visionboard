"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { UserButton } from "@clerk/nextjs";
import { ShareCanvas } from "@/components/share-canvas";
import { GalleryView } from "@/components/gallery-view";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { UpgradeCTA } from "@/components/upgrade-cta";
import { ProBadge } from "@/components/ui/pro-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LIMITS } from "@/lib/constants";
import type { Goal as GoalType } from "@/components/goal-input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { EditableAvatar } from "@/components/editable-avatar";
import { generateGoalId } from "@/lib/id";

interface BoardData {
  id: string;
  profileId: string;
  name: string;
  createdAt: Date;
  goals: Array<{
    id: string;
    boardId: string;
    title: string;
    generatedImageUrl: string | null;
    phrase: string | null;
    status: "pending" | "generating" | "completed" | "failed";
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    createdAt: Date;
  }>;
  profile: {
    id: string;
    userId: string | null;
    avatarOriginalUrl: string | null;
    avatarNoBgUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface BoardViewProps {
  board: BoardData;
}

const defaultHeaders: HeadersInit = { "Content-Type": "application/json" };

export function BoardView({ board }: BoardViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId, isLoading: isLoadingAuth, isAuthenticated } = useAuth();
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [credits, setCredits] = useState(0);

  // Helper to update credits and recalculate isPaid status
  const updateCreditsAndPaidStatus = useCallback((newCredits: number) => {
    setCredits(newCredits);
    // User is "paid" if they have more credits than the free tier
    setIsPaid(newCredits > LIMITS.FREE_CREDITS);
  }, []);

  const isOwner = isAuthenticated && board.profile.userId === userId;
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | undefined>(
    board.profile.avatarNoBgUrl ?? undefined,
  );

  useEffect(() => {
    setGoals(
      board.goals.map((g) => ({
        id: g.id,
        title: g.title,
        generatedImageUrl: g.generatedImageUrl ?? undefined,
        phrase: g.phrase ?? undefined,
        isGenerating: g.status === "generating" || g.status === "pending",
        status: g.status,
      })),
    );
  }, [board.goals]);

  useEffect(() => {
    // Only fetch if authenticated and potentially the owner
    if (!isAuthenticated || isLoadingAuth) return;
    // Only fetch for owners
    if (board.profile.userId !== userId) return;

    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/polar/credits");
        if (res.ok) {
          const data = await res.json();
          updateCreditsAndPaidStatus(data.credits);
        }
      } catch {
        // Silently fail
      }
    };

    fetchCredits();
  }, [isAuthenticated, isLoadingAuth, userId, board.profile.userId, board.id, updateCreditsAndPaidStatus]);

  const generatingGoalIds = goals
    .filter((g) => g.status === "generating" || g.status === "pending")
    .map((g) => g.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!generatingGoalIds || !isOwner) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/goals?boardId=${board.id}`, {
          headers: defaultHeaders,
        });
        if (!res.ok) return;

        const updatedGoals = await res.json();
        let hasNewCompletions = false;

        setGoals((prev) =>
          prev.map((g) => {
            const updated = updatedGoals.find(
              (u: {
                id: string;
                status: string;
                generatedImageUrl: string | null;
                phrase: string | null;
              }) => u.id === g.id,
            );
            if (!updated) return g;
            if (updated.status === "completed" || updated.status === "failed") {
              if (g.isGenerating && updated.status === "completed") {
                hasNewCompletions = true;
              }
              return {
                ...g,
                isGenerating: false,
                generatedImageUrl: updated.generatedImageUrl ?? undefined,
                phrase: updated.phrase ?? undefined,
                status: updated.status,
              };
            }
            return g;
          }),
        );

        // Re-fetch actual freeImagesUsed from server when completions detected
        if (hasNewCompletions) {
          const creditsRes = await fetch("/api/polar/credits");
          if (creditsRes.ok) {
            const data = await creditsRes.json();
            updateCreditsAndPaidStatus(data.credits);
            // Invalidate boards query so dashboard shows fresh credits
            queryClient.invalidateQueries({ queryKey: ["boards", userId] });
          }
        }
      } catch {
        // Silently fail
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [generatingGoalIds, board.id, isOwner, queryClient, userId, updateCreditsAndPaidStatus]);

  const addAndGenerateGoal = useCallback(
    async (title: string) => {
      if (!userPhotoUrl) return;

      setIsAddingGoal(true);

      // Optimistic: Decrement credit immediately
      const previousCredits = credits;
      setCredits((prev) => Math.max(0, prev - 1));

      // Optimistic: Add goal to UI immediately with temp ID
      const tempId = `temp-${generateGoalId()}`;
      const optimisticGoal: GoalType = {
        id: tempId,
        title,
        isGenerating: true,
        status: "pending",
      };
      setGoals((prev) => [...prev, optimisticGoal]);

      let realGoalId: string | null = null;

      try {
        // Create goal in database
        const goalRes = await fetch("/api/goals", {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify({ boardId: board.id, title }),
        });
        if (!goalRes.ok) throw new Error("Failed to create goal");
        const dbGoal = await goalRes.json();
        realGoalId = dbGoal.id;

        // Update temp ID to real ID
        setGoals((prev) =>
          prev.map((g) => (g.id === tempId ? { ...g, id: dbGoal.id } : g)),
        );

        // Generate phrase first (creates scene data), then image (uses scene data)
        const phraseRes = await fetch("/api/generate-phrase", {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify({ goalId: dbGoal.id, goalTitle: title }),
        });
        const phraseResult = await phraseRes.json();

        const imageRes = await fetch("/api/generate-image", {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify({
            userImageUrl: userPhotoUrl,
            goalId: dbGoal.id,
            goalPrompt: title,
          }),
        });
        const imageResult = await imageRes.json();

        // Check if image generation succeeded and returned a valid URL
        if (!imageRes.ok || !imageResult.imageUrl) {
          // Keep goal in generating state so polling can pick it up, or mark as failed
          setGoals((prev) =>
            prev.map((g) =>
              g.id === dbGoal.id
                ? { ...g, isGenerating: true, status: "generating" as const }
                : g,
            ),
          );
        } else {
          // Only mark as completed when we have a valid imageUrl
          setGoals((prev) =>
            prev.map((g) =>
              g.id === dbGoal.id
                ? {
                    ...g,
                    isGenerating: false,
                    generatedImageUrl: imageResult.imageUrl,
                    phrase: phraseResult.phrase,
                    status: "completed" as const,
                  }
                : g,
            ),
          );
        }

        // Update credits from server response or refetch
        if (imageResult.credits !== undefined) {
          updateCreditsAndPaidStatus(imageResult.credits);
        } else {
          const creditsRes = await fetch("/api/polar/credits");
          if (creditsRes.ok) {
            const data = await creditsRes.json();
            updateCreditsAndPaidStatus(data.credits);
          }
        }

        // Invalidate boards query so dashboard shows fresh credits when navigating back
        queryClient.invalidateQueries({ queryKey: ["boards", userId] });
      } catch {
        // Restore credit on error
        updateCreditsAndPaidStatus(previousCredits);

        // Remove optimistic goal or mark as failed
        setGoals((prev) => {
          const goalToUpdate = prev.find(
            (g) => g.id === tempId || g.id === realGoalId,
          );
          if (!goalToUpdate) return prev;

          // If we have a real ID, mark as failed; otherwise remove the temp goal
          if (realGoalId) {
            return prev.map((g) =>
              g.id === realGoalId
                ? { ...g, isGenerating: false, status: "failed" as const }
                : g,
            );
          }
          return prev.filter((g) => g.id !== tempId);
        });
      } finally {
        setIsAddingGoal(false);
      }
    },
    [board.id, userPhotoUrl, credits, queryClient, userId],
  );

  const deleteGoal = useCallback((goalId: string) => {
    // Optimistic: remove from UI immediately
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    // Fire API call in background
    fetch(`/api/goals?id=${goalId}`, {
      method: "DELETE",
      headers: defaultHeaders,
    }).catch(() => {
      // If delete fails, we could restore the goal, but for now just log
      console.error(`Failed to delete goal ${goalId}`);
    });
  }, []);

  const checkoutUrl = userId
    ? `/api/polar/checkout?products=${process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID}&customerExternalId=${userId}`
    : null;

  const pendingGoals = goals.filter((g) => g.isGenerating).length;
  // Simplified: can add more goals if credits (minus pending) > 0
  const canAddMoreGoals = credits > pendingGoals;
  const isAtLimit = !canAddMoreGoals;

  if (isLoadingAuth) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </main>
    );
  }

  // Public view for non-owners
  if (!isOwner) {
    return (
      <main className="min-h-screen bg-background bg-dotted-grid flex flex-col">
        <header className="sticky top-4 sm:top-6 z-50 container mx-auto px-3 sm:px-4">
          <div className="max-w-4xl mx-auto py-2 sm:py-2.5 px-3 sm:px-4 bg-card dark:bg-black/90 backdrop-blur border rounded-lg shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
                  Vision Board
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  2026 Edition
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <ThemeSwitcherButton />
                <GithubBadge />
                <Button size="sm" asChild>
                  <a href="/b">
                    <span className="hidden sm:inline">Create your own</span>
                    <span className="sm:hidden">Create</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1">
          <div className="max-w-4xl mx-auto">
            <ShareCanvas board={board} />
          </div>
        </div>

        <SponsorFooter />
      </main>
    );
  }

  // Owner view with editing capabilities
  return (
    <main className="min-h-screen bg-background bg-dotted-grid flex flex-col">
      <header className="sticky top-4 sm:top-6 z-50 container mx-auto px-3 sm:px-4">
        <div className="max-w-4xl mx-auto py-2 sm:py-2.5 px-3 sm:px-4 bg-card dark:bg-black/90 backdrop-blur border rounded-lg shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <EditableAvatar
                src={userPhotoUrl}
                onAvatarChange={setUserPhotoUrl}
                editable={isOwner}
                size="md"
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
                  Vision Board
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  2026 Edition
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {isPaid && <ProBadge credits={credits} />}
              {!isPaid && (
                <span className="text-xs h-9 px-2.5 sm:px-3 inline-flex items-center bg-muted rounded-md text-muted-foreground">
                  Free
                </span>
              )}
              <ThemeSwitcherButton />
              <GithubBadge />
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "size-8 sm:size-9",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/b")}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>

          <GalleryView
            boardId={board.id}
            goals={goals}
            userPhotoUrl={userPhotoUrl}
            onAddGoal={addAndGenerateGoal}
            onDeleteGoal={deleteGoal}
            canAddMore={canAddMoreGoals}
            isAtLimit={isAtLimit}
            isAuthenticated={isAuthenticated}
            isPro={isPaid}
            checkoutUrl={checkoutUrl}
            isAddingGoal={isAddingGoal}
            credits={credits}
          />

          {isAtLimit && !isPaid && goals.length > 0 && (
            <UpgradeCTA
              isAuthenticated={isAuthenticated}
              checkoutUrl={checkoutUrl}
              message="You've used all your free images. Upgrade to get more"
            />
          )}

          {isPaid && credits === 0 && (
            <UpgradeCTA
              isAuthenticated={isAuthenticated}
              checkoutUrl={checkoutUrl}
              message="You've used all your credits. Purchase more to continue generating images."
            />
          )}
        </div>
      </div>

      <SponsorFooter />
    </main>
  );
}
