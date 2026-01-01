"use client";

import { PhotoUpload } from "@/components/photo-upload";
import { GoalInput } from "@/components/goal-input";
import { VisionCanvas } from "@/components/vision-canvas";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { useVisionBoard } from "@/hooks/use-vision-board";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function Home() {
  const {
    visitorId,
    isLoadingFingerprint,
    boardData,
    goals,
    setGoals,
    step,
    isGenerating,
    onUploadComplete,
    generateAllImages,
  } = useVisionBoard();

  if (isLoadingFingerprint) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {step === "board" && boardData?.noBgUrl && (
                <div className="size-12 rounded-full overflow-hidden border-2 border-foreground bg-muted flex-shrink-0">
                  <img
                    src={boardData.noBgUrl}
                    alt="Your photo"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Agentic Vision Board</h1>
                <p className="text-sm text-muted-foreground">2026 Edition</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <GithubBadge />
              <div className="flex items-center gap-2">
              {["upload", "goals", "board"].map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    step === s
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-6 flex items-center justify-center text-xs border",
                      step === s
                        ? "bg-foreground text-background"
                        : "bg-transparent"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline capitalize">{s}</span>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {step === "upload" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-center">
              <img
                src="/brand/hero-Image.png"
                alt="Vision Board AI"
                className="w-full max-w-2xl h-auto object-contain"
              />
            </div>
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                  Start with Your Photo
                </h2>
                <p className="text-muted-foreground">
                  Upload a photo of yourself. We will remove the background and use
                  it to place you in your dream scenarios.
                </p>
              </div>
              <PhotoUpload visitorId={visitorId} onUploadComplete={onUploadComplete} />
            </div>
          </div>
        )}

        {step === "goals" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {boardData && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={boardData.noBgUrl}
                    alt="Your photo"
                    className="h-32 w-auto object-contain"
                  />
                </div>
              </div>
            )}
            <GoalInput
              goals={goals}
              onGoalsChange={setGoals}
              onGenerate={generateAllImages}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {step === "board" && (
          <VisionCanvas
            boardId={boardData?.boardId}
            goals={goals}
          />
        )}
      </div>

      <SponsorFooter />
    </main>
  );
}
