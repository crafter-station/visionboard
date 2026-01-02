"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { Loader2, ArrowRight } from "lucide-react";

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
              <ThemeSwitcherButton />
              <GithubBadge />
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
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-12 flex-1 flex flex-col items-center justify-center">
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 text-center">
          <div className="flex justify-center">
            <img
              src="/brand/hero-Image.png"
              alt="Vision Board AI"
              className="w-full max-w-md sm:max-w-2xl h-auto object-contain"
            />
          </div>
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Create Your 2026 Vision Board
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Upload your photo and let AI place you in your dream scenarios.
                Visualize your goals and manifest your future.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignUpButton mode="modal">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
              </SignUpButton>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => router.push("/b")}
              >
                Try without account
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SponsorFooter />
    </main>
  );
}
