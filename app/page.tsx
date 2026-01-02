"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { PhotoUpload } from "@/components/photo-upload";
import { GalleryView } from "@/components/gallery-view";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ExistingBoards } from "@/components/existing-boards";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { UpgradeCTA } from "@/components/upgrade-cta";
import { ProBadge } from "@/components/ui/pro-badge";
import { Button } from "@/components/ui/button";
import { useVisionBoard } from "@/hooks/use-vision-board";
import { ArrowLeft, Loader2 } from "lucide-react";

function CheckoutSuccessHandler({ onSuccess }: { onSuccess: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      onSuccess();
      router.replace("/");
    }
  }, [searchParams, onSuccess, router]);

  return null;
}

export default function Home() {
  const {
    visitorId,
    isAuthenticated,
    isLoadingAuth,
    isLoadingBoards,
    boardData,
    profile,
    goals,
    step,
    isGenerating,
    isAddingGoal,
    existingBoards,
    limits,
    usage,
    userId,
    isPaid,
    credits,
    hasExistingPhoto,
    canAddMoreGoals,
    isAtLimit,
    onUploadComplete,
    addAndGenerateGoal,
    regenerateGoalImage,
    deleteGoal,
    deleteBoard,
    loadExistingBoard,
    resetToBoards,
    createBoardWithExistingPhoto,
    refetchBoards,
  } = useVisionBoard();

  const checkoutUrl = userId
    ? `/api/polar/checkout?products=${process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID}&customerExternalId=${userId}`
    : null;

  if (isLoadingAuth || isLoadingBoards) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  const canCreateNewBoard = !limits || !usage || usage.boards < limits.MAX_BOARDS_PER_USER;
  const hasExistingBoards = existingBoards.length > 0;
  const showUpload = !hasExistingPhoto && step === "upload";
  const showBoardsList = hasExistingBoards && step === "upload" && !boardData;
  const showGallery = step === "gallery" && boardData;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={null}>
        <CheckoutSuccessHandler onSuccess={refetchBoards} />
      </Suspense>
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {showGallery && boardData?.avatarNoBgUrl && (
                <div className="size-8 sm:size-12 rounded-full overflow-hidden border-2 border-foreground bg-muted flex-shrink-0">
                  <img
                    src={boardData.avatarNoBgUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
                  Vision Board
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">2026 Edition</p>
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
                      avatarBox: "size-8 sm:size-9"
                    }
                  }}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 flex-1">
        {showUpload && (
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
                      Upload a photo of yourself. We will remove the background and use
                      it to place you in your dream scenarios.
                    </p>
                  </div>
                  <PhotoUpload visitorId={visitorId} onUploadComplete={onUploadComplete} />
                </div>
          </div>
            )}

        {showBoardsList && (
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            <ExistingBoards
              boards={existingBoards}
              profile={profile}
              onSelectBoard={loadExistingBoard}
              onDeleteBoard={deleteBoard}
              onCreateNewBoard={canCreateNewBoard ? createBoardWithExistingPhoto : undefined}
              limits={limits}
              usage={usage}
            />

            {!canCreateNewBoard && !isPaid && (
              <UpgradeCTA
                isAuthenticated={isAuthenticated}
                checkoutUrl={checkoutUrl}
                message={`You've reached the limit of ${limits?.MAX_BOARDS_PER_USER} board${(limits?.MAX_BOARDS_PER_USER ?? 1) === 1 ? '' : 's'}. Upgrade for unlimited boards and 50 more images.`}
              />
            )}
          </div>
        )}

        {showGallery && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToBoards}
                className="gap-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
                </div>

            <GalleryView
              boardId={boardData?.boardId}
              goals={goals}
              userPhotoUrl={boardData?.avatarNoBgUrl ?? undefined}
              onAddGoal={addAndGenerateGoal}
              onRegenerate={regenerateGoalImage}
              onDeleteGoal={deleteGoal}
              canAddMore={canAddMoreGoals}
              isAtLimit={isAtLimit}
              isAuthenticated={isAuthenticated}
              isPro={isPaid}
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
        )}
      </div>

      <SponsorFooter />
    </main>
  );
}
