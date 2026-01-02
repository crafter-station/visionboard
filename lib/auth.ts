import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, type RateLimitType } from "./rate-limit";
import type { UserIdentifier } from "@/db/queries";
import { getProfileByIdentifier, getCreditsForProfile } from "@/db/queries";

export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function getAuthIdentifier(): Promise<UserIdentifier | null> {
  const userId = await getUserId();
  if (!userId) return null;
  return { userId };
}

export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserId();
  return !!userId;
}

export async function getUserCreditsCount(): Promise<number> {
  const identifier = await getAuthIdentifier();
  if (!identifier) return 0;
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return 0;
  return getCreditsForProfile(profile.id);
}

export async function isPaidUser(): Promise<boolean> {
  const credits = await getUserCreditsCount();
  return credits > 0;
}

export async function validateRequest(
  rateLimitType: RateLimitType = "general",
): Promise<{
  success: boolean;
  userId: string | null;
  identifier: UserIdentifier | null;
  error?: string;
  remaining?: number;
}> {
  const userId = await getUserId();

  if (!userId) {
    return {
      success: false,
      userId: null,
      identifier: null,
      error: "Authentication required",
    };
  }

  const identifier: UserIdentifier = { userId };

  const { success, remaining } = await checkRateLimit(userId, rateLimitType);

  if (!success) {
    return {
      success: false,
      userId,
      identifier,
      error: "Rate limit exceeded. Please try again later.",
      remaining,
    };
  }

  return {
    success: true,
    userId,
    identifier,
    remaining,
  };
}
