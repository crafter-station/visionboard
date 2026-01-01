import { headers } from "next/headers";
import { checkRateLimit, type RateLimitType } from "./rate-limit";

export async function getVisitorId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-visitor-id");
}

export async function validateRequest(rateLimitType: RateLimitType = "general"): Promise<{
  success: boolean;
  visitorId: string | null;
  error?: string;
  remaining?: number;
}> {
  const visitorId = await getVisitorId();

  if (!visitorId) {
    return {
      success: false,
      visitorId: null,
      error: "Missing visitor identification",
    };
  }

  const { success, remaining } = await checkRateLimit(visitorId, rateLimitType);

  if (!success) {
    return {
      success: false,
      visitorId,
      error: "Rate limit exceeded. Please try again later.",
      remaining,
    };
  }

  return { success: true, visitorId, remaining };
}
