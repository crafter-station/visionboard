"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ShareCanvas } from "@/components/share-canvas";
import { GalleryView } from "@/components/gallery-view";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { UpgradeCTA } from "@/components/upgrade-cta";
import { ProBadge } from "@/components/ui/pro-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFingerprint } from "@/hooks/use-fingerprint";
import type { Goal as GoalType } from "@/components/goal-input";
import { ArrowLeft, Loader2 } from "lucide-react";

interface BoardData {
  id: string;
  profileId: string;
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
    visitorId: string | null;
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

function createAuthHeaders(visitorId: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (visitorId) {
    headers["x-visitor-id"] = visitorId;
  }
  return headers;
}

export function BoardView({ board }: BoardViewProps) {
  const router = useRouter();
  const { userId, isLoading: isLoadingAuth, isAuthenticated } = useAuth();
  const { visitorId } = useFingerprint();
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [credits, setCredits] = useState(0);
  const [usage, setUsage] = useState({ photos: 0 });
  const [maxPhotos, setMaxPhotos] = useState(3);

  const isOwner =
    board.profile.userId === userId || board.profile.visitorId === visitorId;
  const userPhotoUrl = board.profile.avatarNoBgUrl ?? undefined;

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
    if (!isOwner) return;

    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/polar/credits");
        if (res.ok) {
          const data = await res.json();
          setIsPaid(data.isPaid);
          setCredits(data.credits);
          setMaxPhotos(data.maxPhotos ?? 3);
        }
      } catch {
        // Silently fail
      }
    };

    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/boards", {
          headers: createAuthHeaders(visitorId),
        });
        if (res.ok) {
          const data = await res.json();
          setUsage({ photos: data.usage?.photos ?? 0 });
        }
      } catch {
        // Silently fail
      }
    };

    fetchCredits();
    fetchUsage();
  }, [isOwner, visitorId]);

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
          headers: createAuthHeaders(visitorId),
        });
        if (!res.ok) return;

        const updatedGoals = await res.json();
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
      } catch {
        // Silently fail
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [generatingGoalIds, board.id, visitorId, isOwner]);

  const addAndGenerateGoal = useCallback(
    async (title: string) => {
      if (!userPhotoUrl) return;

      setIsAddingGoal(true);
      let goalId: string | null = null;

      try {
        const goalRes = await fetch("/api/goals", {
          method: "POST",
          headers: createAuthHeaders(visitorId),
          body: JSON.stringify({ boardId: board.id, title }),
        });
        if (!goalRes.ok) throw new Error("Failed to create goal");
        const dbGoal = await goalRes.json();
        goalId = dbGoal.id;

        const newGoal: GoalType = {
          id: dbGoal.id,
          title,
          isGenerating: true,
          status: "pending",
        };
        setGoals((prev) => [...prev, newGoal]);

        const [imageResult, phraseResult] = await Promise.all([
          fetch("/api/generate-image", {
            method: "POST",
            headers: createAuthHeaders(visitorId),
            body: JSON.stringify({
              userImageUrl: userPhotoUrl,
              goalId: dbGoal.id,
              goalPrompt: title,
            }),
          }).then((r) => r.json()),
          fetch("/api/generate-phrase", {
            method: "POST",
            headers: createAuthHeaders(visitorId),
            body: JSON.stringify({ goalId: dbGoal.id, goalTitle: title }),
          }).then((r) => r.json()),
        ]);

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

        if (imageResult.credits !== undefined) {
          setCredits(imageResult.credits);
        }
        setUsage((prev) => ({ ...prev, photos: prev.photos + 1 }));
      } catch {
        if (goalId) {
          setGoals((prev) =>
            prev.map((g) =>
              g.id === goalId
                ? { ...g, isGenerating: false, status: "failed" as const }
                : g,
            ),
          );
        }
      } finally {
        setIsAddingGoal(false);
      }
    },
    [board.id, userPhotoUrl, visitorId],
  );

  const regenerateGoalImage = useCallback(
    async (goalId: string) => {
      if (!userPhotoUrl) return;

      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, isGenerating: true, status: "generating" as const }
            : g,
        ),
      );

      try {
        const [imageResult, phraseResult] = await Promise.all([
          fetch("/api/generate-image", {
            method: "POST",
            headers: createAuthHeaders(visitorId),
            body: JSON.stringify({
              userImageUrl: userPhotoUrl,
              goalId,
              goalPrompt: goal.title,
            }),
          }).then((r) => r.json()),
          fetch("/api/generate-phrase", {
            method: "POST",
            headers: createAuthHeaders(visitorId),
            body: JSON.stringify({ goalId, goalTitle: goal.title }),
          }).then((r) => r.json()),
        ]);

        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
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
      } catch {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? { ...g, isGenerating: false, status: "failed" as const }
              : g,
          ),
        );
      }
    },
    [goals, userPhotoUrl, visitorId],
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      try {
        await fetch(`/api/goals?id=${goalId}`, {
          method: "DELETE",
          headers: createAuthHeaders(visitorId),
        });
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
      } catch {
        // Silently fail
      }
    },
    [visitorId],
  );

  const checkoutUrl = userId
    ? `/api/polar/checkout?products=${process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID}&customerExternalId=${userId}`
    : null;

  const pendingGoals = goals.filter((g) => g.isGenerating).length;
  const effectivePhotosUsed = usage.photos + pendingGoals;
  const canAddMoreGoals = isPaid
    ? credits > pendingGoals
    : effectivePhotosUsed < maxPhotos;
  const isAtLimit = !canAddMoreGoals;

  if (isLoadingAuth) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Agentic Vision Board
                </h1>
                <p className="text-sm text-muted-foreground">2026 Edition</p>
              </div>
              <div className="flex items-center gap-4">
                <ThemeSwitcherButton />
                <GithubBadge />
                <a
                  href="/b"
                  className="text-sm font-medium hover:underline underline-offset-4"
                >
                  Create your own
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 flex-1">
          <ShareCanvas board={board} />
        </div>

        <SponsorFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {userPhotoUrl && (
                <div className="size-8 sm:size-12 rounded-full overflow-hidden border-2 border-foreground bg-muted flex-shrink-0">
                  <img
                    src={userPhotoUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              )}
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
              <ThemeSwitcherButton />
              <GithubBadge />

              {isAuthenticated ? (
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "size-8 sm:size-9",
                    },
                  }}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:inline-flex"
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="sm">Sign Up</Button>
                  </SignUpButton>
                </div>
              )}
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
            onRegenerate={regenerateGoalImage}
            onDeleteGoal={deleteGoal}
            canAddMore={canAddMoreGoals}
            isAtLimit={isAtLimit}
            isAuthenticated={isAuthenticated}
            isPro={isPaid}
            checkoutUrl={checkoutUrl}
            isAddingGoal={isAddingGoal}
          />

          {isAtLimit && !isPaid && goals.length > 0 && (
            <UpgradeCTA
              isAuthenticated={isAuthenticated}
              checkoutUrl={checkoutUrl}
              message={
                isAuthenticated
                  ? "You've used all your free images. Upgrade to get 50 more generations."
                  : "You've used all 3 free images. Sign up to get more."
              }
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
