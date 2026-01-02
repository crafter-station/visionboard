"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { PhotoUpload } from "@/components/photo-upload";
import { GoalInput } from "@/components/goal-input";
import { VisionCanvas } from "@/components/vision-canvas";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ExistingBoards } from "@/components/existing-boards";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { Button } from "@/components/ui/button";
import { useVisionBoard } from "@/hooks/use-vision-board";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

export default function Home() {
  const {
    visitorId,
    isAuthenticated,
    isLoadingAuth,
    isLoadingBoards,
    boardData,
    goals,
    setGoals,
    step,
    isGenerating,
    existingBoards,
    limits,
    usage,
    userId,
    onUploadComplete,
    generateAllImages,
    regenerateGoalImage,
    deleteGoal,
    deleteBoard,
    loadExistingBoard,
    resetToUpload,
    savePositions,
    createBoardWithExistingPhoto,
  } = useVisionBoard();

  const checkoutUrl = userId
    ? `/api/polar/checkout?products=${process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID}&customerExternalId=${userId}`
    : null;

  if (isLoadingAuth || isLoadingBoards) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </main>
    );
  }

  const canCreateNewBoard = !limits || !usage || usage.boards < limits.MAX_BOARDS_PER_USER;
  const hasExistingBoards = existingBoards.length > 0;
  const hasReachedLimit = hasExistingBoards && !canCreateNewBoard;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {step === "board" && boardData?.noBgUrl && (
                <div className="size-8 sm:size-12 rounded-full overflow-hidden border-2 border-foreground bg-muted flex-shrink-0">
                  <img
                    src={boardData.noBgUrl}
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

              <div className="flex items-center gap-1 sm:gap-2">
                {["upload", "goals", "board"].map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "flex items-center gap-1 sm:gap-2 text-xs sm:text-sm",
                      step === s
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-5 sm:size-6 flex items-center justify-center text-[10px] sm:text-xs border",
                        step === s
                          ? "bg-foreground text-background"
                          : "bg-transparent"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="hidden md:inline capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 flex-1">
        {step === "upload" && (
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            {hasExistingBoards && (
              <ExistingBoards
                boards={existingBoards}
                onSelectBoard={loadExistingBoard}
                onDeleteBoard={deleteBoard}
                onCreateNewBoard={canCreateNewBoard ? createBoardWithExistingPhoto : undefined}
                limits={limits}
                usage={usage}
              />
            )}

            {!hasExistingBoards && (
              <>
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
              </>
            )}

            {hasReachedLimit && (
              <div className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="size-6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {isAuthenticated ? "Upgrade for More Boards" : "Sign Up for More Boards"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    You have reached the limit of {limits?.MAX_BOARDS_PER_USER} board{limits?.MAX_BOARDS_PER_USER === 1 ? '' : 's'}.
                    {isAuthenticated 
                      ? " Upgrade your account to create unlimited vision boards."
                      : " Sign up and upgrade to create more vision boards."}
                  </p>
                </div>
                {isAuthenticated ? (
                  <Button asChild>
                    <a href={checkoutUrl || "#"}>
                      Upgrade - $5 for more
                    </a>
                  </Button>
                ) : (
                  <SignUpButton mode="modal">
                    <Button>
                      Sign Up to Continue
                    </Button>
                  </SignUpButton>
                )}
              </div>
            )}
          </div>
        )}

        {step === "goals" && (
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
            {boardData && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={boardData.noBgUrl}
                    alt="Your photo"
                    className="h-24 sm:h-32 w-auto object-contain"
                  />
                </div>
              </div>
            )}
            <GoalInput
              goals={goals}
              onGoalsChange={setGoals}
              onGenerate={generateAllImages}
              isGenerating={isGenerating}
              maxGoals={limits?.MAX_GOALS_PER_BOARD}
            />
          </div>
        )}

        {step === "board" && (
          <VisionCanvas
            boardId={boardData?.boardId}
            goals={goals}
            onRegenerate={regenerateGoalImage}
            onDeleteGoal={deleteGoal}
            onBack={resetToUpload}
            onSavePositions={savePositions}
          />
        )}
      </div>

      <SponsorFooter />
    </main>
  );
}
