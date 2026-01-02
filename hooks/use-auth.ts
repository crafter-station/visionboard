"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useCallback, useState } from "react";
import { useFingerprint } from "./use-fingerprint";

interface AuthState {
  userId: string | null;
  visitorId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasMigrated: boolean;
}

export function useAuth(): AuthState & { triggerMigration: () => Promise<void> } {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { visitorId, isLoading: fingerprintLoading } = useFingerprint();
  const [hasMigrated, setHasMigrated] = useState(false);
  const migrationAttemptedRef = useRef(false);

  const userId = user?.id ?? null;
  const isLoading = !clerkLoaded || fingerprintLoading;
  const isAuthenticated = !!userId;

  const triggerMigration = useCallback(async () => {
    if (!userId || !visitorId || hasMigrated || migrationAttemptedRef.current) {
      return;
    }

    migrationAttemptedRef.current = true;

    try {
      const res = await fetch("/api/auth/migrate-boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-visitor-id": visitorId,
        },
      });

      if (res.ok) {
        setHasMigrated(true);
      }
    } catch {
      migrationAttemptedRef.current = false;
    }
  }, [userId, visitorId, hasMigrated]);

  useEffect(() => {
    if (isAuthenticated && visitorId && !hasMigrated) {
      triggerMigration();
    }
  }, [isAuthenticated, visitorId, hasMigrated, triggerMigration]);

  return {
    userId,
    visitorId,
    isLoading,
    isAuthenticated,
    hasMigrated,
    triggerMigration,
  };
}

