import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, type RateLimitType } from "./rate-limit";
import type { UserIdentifier } from "@/db/queries";

export async function getVisitorId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-visitor-id");
}

export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function getAuthIdentifier(): Promise<UserIdentifier> {
  const [userId, visitorId] = await Promise.all([
    getUserId(),
    getVisitorId(),
  ]);
  
  return { userId, visitorId };
}

export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserId();
  return !!userId;
}

import { getUserCredits } from "@/db/queries";

export async function isPaidUser(): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  const credits = await getUserCredits(userId);
  return credits > 0;
}

export async function getUserCreditsCount(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;
  return getUserCredits(userId);
}

export async function validateRequest(rateLimitType: RateLimitType = "general"): Promise<{
  success: boolean;
  visitorId: string | null;
  userId: string | null;
  identifier: UserIdentifier;
  error?: string;
  remaining?: number;
}> {
  const identifier = await getAuthIdentifier();
  const { userId, visitorId } = identifier;

  const rateLimitKey = userId || visitorId;

  if (!rateLimitKey) {
    return {
      success: false,
      visitorId: null,
      userId: null,
      identifier,
      error: "Missing user identification",
    };
  }

  const { success, remaining } = await checkRateLimit(rateLimitKey, rateLimitType);

  if (!success) {
    return {
      success: false,
      visitorId: visitorId ?? null,
      userId: userId ?? null,
      identifier,
      error: "Rate limit exceeded. Please try again later.",
      remaining,
    };
  }

  return { success: true, visitorId: visitorId ?? null, userId: userId ?? null, identifier, remaining };
}
