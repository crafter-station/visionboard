"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { PhotoUpload } from "@/components/photo-upload";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ExistingBoards } from "@/components/existing-boards";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { UpgradeCTA } from "@/components/upgrade-cta";
import { ProBadge } from "@/components/ui/pro-badge";
import { useVisionBoard } from "@/hooks/use-vision-board";
import { LIMITS } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoadingAuth,
    isLoadingBoards,
    profile,
    existingBoards,
    limits,
    usage,
    userId,
    isPaid,
    credits,
    hasExistingPhoto,
    onUploadComplete,
    deleteBoard,
    renameBoard,
    createBoardWithExistingPhoto,
  } = useVisionBoard();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoadingAuth, isAuthenticated, router]);

  const checkoutUrl = userId
    ? `/api/polar/checkout?products=${process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID}&customerExternalId=${userId}`
    : null;

  if (isLoadingAuth || isLoadingBoards || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  const canCreateNewBoard =
    !limits || !usage || usage.boards < limits.MAX_BOARDS_PER_USER;
  const hasExistingBoards = existingBoards.length > 0;

  const handleSelectBoard = (board: { id: string }) => {
    router.push(`/b/${board.id}`);
  };

  const handleCreateBoard = async () => {
    if (!hasExistingPhoto) return;
    const boardId = await createBoardWithExistingPhoto();
    if (boardId) {
      router.push(`/b/${boardId}`);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
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
              {isPaid && <ProBadge credits={credits} />}
              {!isPaid && (
                <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
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
        {!hasExistingPhoto && (
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            <div className="flex justify-center">
              <img
                src="/brand/hero-Image.png"
                alt="Vision Board AI"
                className="w-full max-w-md sm:max-w-2xl h-auto object-contain"
              />
            </div>
            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
                  Start with Your Photo
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Upload a photo of yourself. We will remove the background and
                  use it to place you in your dream scenarios.
                </p>
              </div>
              <PhotoUpload
                onUploadComplete={(data) => {
                  onUploadComplete(data);
                  router.push(`/b/${data.boardId}`);
                }}
              />
            </div>
          </div>
        )}

        {hasExistingPhoto && (
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            <ExistingBoards
              boards={existingBoards}
              profile={profile}
              onSelectBoard={handleSelectBoard}
              onDeleteBoard={deleteBoard}
              onRenameBoard={renameBoard}
              onCreateNewBoard={
                canCreateNewBoard ? handleCreateBoard : undefined
              }
              limits={limits}
              usage={usage}
            />

            {!canCreateNewBoard && !isPaid && (
              <UpgradeCTA
                isAuthenticated={isAuthenticated}
                checkoutUrl={checkoutUrl}
                message={`You've reached the limit of ${limits?.MAX_BOARDS_PER_USER} board${(limits?.MAX_BOARDS_PER_USER ?? LIMITS.FREE_MAX_BOARDS) === 1 ? "" : "s"}. Upgrade for unlimited boards and 50 more images.`}
              />
            )}
          </div>
        )}
      </div>

      <SponsorFooter />
    </main>
  );
}
