"use client";

import { useUser } from "@clerk/nextjs";

interface AuthState {
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const { user, isLoaded: clerkLoaded } = useUser();

  const userId = user?.id ?? null;
  const isLoading = !clerkLoaded;
  const isAuthenticated = !!userId;

  return {
    userId,
    isLoading,
    isAuthenticated,
  };
}
