"use client";

import { SignUpButton } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeCTAProps {
  isAuthenticated: boolean;
  checkoutUrl?: string | null;
  variant?: "inline" | "card";
  message?: string;
}

export function UpgradeCTA({
  isAuthenticated,
  checkoutUrl,
  variant = "card",
  message,
}: UpgradeCTAProps) {
  if (variant === "inline") {
    if (!isAuthenticated) {
      return (
        <SignUpButton mode="modal">
          <Button size="sm" className="gap-2">
            <Sparkles className="size-4" />
            Sign Up to Continue
          </Button>
        </SignUpButton>
      );
    }

    return (
      <Button size="sm" className="gap-2" asChild>
        <a href={checkoutUrl || "#"}>
          <Sparkles className="size-4" />
          Upgrade - $5
        </a>
      </Button>
    );
  }

  return (
    <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
      <div className="flex justify-center">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="size-6" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          {isAuthenticated ? "Upgrade for More" : "Sign Up to Continue"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {message ||
            (isAuthenticated
              ? "Get 50 more image generations and unlimited boards for just $5."
              : "Sign up to unlock more goals and keep your vision boards forever.")}
        </p>
      </div>
      {isAuthenticated ? (
        <Button asChild>
          <a href={checkoutUrl || "#"}>Upgrade - $5 for more</a>
        </Button>
      ) : (
        <SignUpButton mode="modal">
          <Button>Sign Up to Continue</Button>
        </SignUpButton>
      )}
    </div>
  );
}
