"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { PhotoUpload } from "@/components/photo-upload";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
import { ExistingBoards } from "@/components/existing-boards";
import { ThemeSwitcherButton } from "@/components/elements/theme-switcher-button";
import { UpgradeCTA } from "@/components/upgrade-cta";
import { ProBadge } from "@/components/ui/pro-badge";
import { Button } from "@/components/ui/button";
import { useVisionBoard } from "@/hooks/use-vision-board";
import { LIMITS } from "@/lib/constants";
import { Loader2, CheckCircle, X } from "lucide-react";

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_TIME_MS = 30000;

function CheckoutVerificationHandler({
  onVerified,
  setIsVerifying,
}: {
  onVerified: () => void;
  setIsVerifying: (v: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [showCloseWhileVerifying, setShowCloseWhileVerifying] = useState(false);
  const verificationAttemptedRef = useRef(false);
  const autoRedirectRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = () => {
    if (autoRedirectRef.current) {
      clearTimeout(autoRedirectRef.current);
      autoRedirectRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleContinue = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    cleanup();
    // Force navigation by removing checkout_id from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout_id");
    url.searchParams.delete("checkoutId");
    url.searchParams.delete("customer_session_token");
    router.replace(url.pathname + url.search);
  };

  // Auto-redirect after success or error
  useEffect(() => {
    if (verificationStatus === "success") {
      autoRedirectRef.current = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout_id");
        url.searchParams.delete("checkoutId");
        url.searchParams.delete("customer_session_token");
        router.replace(url.pathname + url.search);
      }, 1200);
    } else if (verificationStatus === "error") {
      autoRedirectRef.current = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout_id");
        url.searchParams.delete("checkoutId");
        url.searchParams.delete("customer_session_token");
        router.replace(url.pathname + url.search);
      }, 3000);
    }

    return () => {
      if (autoRedirectRef.current) {
        clearTimeout(autoRedirectRef.current);
      }
    };
  }, [verificationStatus, router]);

  // Show close button after 3 seconds even while verifying
  useEffect(() => {
    if (verificationStatus === "verifying") {
      const timer = setTimeout(() => {
        setShowCloseWhileVerifying(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    setShowCloseWhileVerifying(false);
  }, [verificationStatus]);

  useEffect(() => {
    const checkoutId = searchParams.get("checkout_id");
    if (!checkoutId || verificationAttemptedRef.current) return;

    verificationAttemptedRef.current = true;
    setVerificationStatus("verifying");
    setIsVerifying(true);
    startTimeRef.current = Date.now();
    const since = new Date().toISOString();

    const poll = async () => {
      const elapsed = Date.now() - startTimeRef.current;

      try {
        const url = new URL(`/api/polar/verify`, window.location.origin);
        url.searchParams.set("checkout_id", checkoutId);
        url.searchParams.set("since", since);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.verified) {
          cleanup();
          setVerificationStatus("success");
          onVerified();
          setIsVerifying(false);
          return;
        }

        // If we've exceeded max poll time, show error state but still indicate success may come
        if (elapsed >= MAX_POLL_TIME_MS) {
          cleanup();
          setVerificationStatus("error");
          onVerified();
          setIsVerifying(false);
          return;
        }

        // Continue polling (e.g., if Polar checkout is still processing)
        pollIntervalRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // On network error, continue polling unless we've exceeded max time
        if (elapsed >= MAX_POLL_TIME_MS) {
          cleanup();
          setVerificationStatus("error");
          onVerified();
          setIsVerifying(false);
          return;
        }
        pollIntervalRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return cleanup;
  }, [searchParams, onVerified, setIsVerifying]);

  // Check if checkout_id is still in URL - if not, don't render
  const checkoutId = searchParams.get("checkout_id");
  if (!checkoutId && verificationStatus === "idle") return null;
  
  // If checkout_id was removed but we're still mounted, hide the modal
  if (!checkoutId && verificationStatus !== "idle") {
    return null;
  }

  if (verificationStatus === "idle") return null;

  const canClose = verificationStatus !== "verifying" || showCloseWhileVerifying;

  return (
    <div 
      className="fixed inset-0 z-[100] safe-area-inset flex items-center justify-center p-4"
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) {
          handleContinue(e);
        }
      }}
    >
      {/* Backdrop layer - completely non-interactive */}
      <div
        className="absolute inset-0 bg-background/80"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      />

      {/* Content layer - fully interactive */}
      <div
        className="relative bg-card border rounded-lg p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{ pointerEvents: "auto" }}
      >
          {verificationStatus === "verifying" && (
            <>
              {showCloseWhileVerifying && (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              )}
              <Loader2 className="size-12 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Verifying Payment</h3>
                <p className="text-sm text-muted-foreground">Please wait...</p>
              </div>
            </>
          )}
          {verificationStatus === "success" && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContinue(e);
                }}
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
              <CheckCircle className="size-12 mx-auto text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">Payment Successful</h3>
                <p className="text-sm text-muted-foreground">
                  Your credits have been added!
                </p>
              </div>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContinue(e);
                }}
                className="w-full min-h-[44px] touch-manipulation cursor-pointer"
              >
                Continue
              </Button>
            </>
          )}
          {verificationStatus === "error" && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContinue(e);
                }}
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
              <div className="size-12 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <span className="text-2xl text-yellow-600 dark:text-yellow-500">
                  !
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Processing Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment is being processed. Credits will appear shortly.
                </p>
              </div>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContinue(e);
                }}
                className="w-full min-h-[44px] touch-manipulation cursor-pointer"
              >
                Continue
              </Button>
            </>
          )}
        </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
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
    refetchBoards,
  } = useVisionBoard();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoadingAuth, isAuthenticated, router]);

  // Force refetch boards data when page is visited to ensure fresh credits
  useEffect(() => {
    if (isAuthenticated && !isLoadingAuth) {
      refetchBoards();
    }
  }, [isAuthenticated, isLoadingAuth, refetchBoards]);

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
    <main className="min-h-screen bg-background bg-dotted-grid flex flex-col">
      <Suspense fallback={null}>
        <CheckoutVerificationHandler
          onVerified={refetchBoards}
          setIsVerifying={setIsVerifyingPayment}
        />
      </Suspense>
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

      <div className="container mx-auto px-3 pt-8 pb-6 sm:px-4 sm:pt-14 sm:pb-12 flex-1">
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
              onAvatarChange={() => refetchBoards()}
              limits={limits}
              usage={usage}
            />

            {!canCreateNewBoard && !isPaid && (
              <UpgradeCTA
                isAuthenticated={isAuthenticated}
                checkoutUrl={checkoutUrl}
                message={`You've reached the limit of ${limits?.MAX_BOARDS_PER_USER} board${(limits?.MAX_BOARDS_PER_USER ?? LIMITS.MAX_BOARDS_PER_USER) === 1 ? "" : "s"}. Upgrade for unlimited boards and 50 more images.`}
              />
            )}
          </div>
        )}
      </div>

      <SponsorFooter />
    </main>
  );
}
