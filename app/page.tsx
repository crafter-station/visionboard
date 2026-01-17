"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/b");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </main>
    );
  }

  if (isSignedIn) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </main>
    );
  }

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
              <SignInButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignInButton>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 pt-10 pb-6 sm:px-4 sm:pt-16 sm:pb-8 flex-1 flex flex-col items-center">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 text-center">
          <img
            src="/brand/hero-Image.png"
            alt="Vision Board AI"
            className="w-full h-auto object-contain rounded-lg"
          />
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Create Your 2026 AI Powered Vision Board
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
              Visualize your goals. Manifest your future.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <SignInButton mode="modal">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
              </SignInButton>
            </div>
            
          </div>
        </div>
      </div>

      <SponsorFooter />
    </main>
  );
}
