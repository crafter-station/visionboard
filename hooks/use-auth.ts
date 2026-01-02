"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useCallback } from "react";
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
  const hasMigratedRef = useRef(false);
  const migrationAttemptedRef = useRef(false);

  const userId = user?.id ?? null;
  const isLoading = !clerkLoaded || fingerprintLoading;
  const isAuthenticated = !!userId;

  const triggerMigration = useCallback(async () => {
    if (!userId || !visitorId || hasMigratedRef.current || migrationAttemptedRef.current) {
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
        hasMigratedRef.current = true;
      }
    } catch {
      migrationAttemptedRef.current = false;
    }
  }, [userId, visitorId]);

  useEffect(() => {
    if (isAuthenticated && visitorId && !hasMigratedRef.current) {
      triggerMigration();
    }
  }, [isAuthenticated, visitorId, triggerMigration]);

  return {
    userId,
    visitorId,
    isLoading,
    isAuthenticated,
    hasMigrated: hasMigratedRef.current,
    triggerMigration,
  };
}

