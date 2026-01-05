import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS, type RateLimitType } from "./constants";

export type { RateLimitType };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type UserTier = "free" | "paid";

function createLimiter(type: RateLimitType, tier: UserTier): Ratelimit {
  const config = RATE_LIMITS[type][tier];
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, `${config.window} s`),
    analytics: true,
    prefix: `visionboard:${type}:${tier}`,
  });
}

// Cache limiters to avoid recreating them on every request
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(type: RateLimitType, tier: UserTier): Ratelimit {
  const key = `${type}:${tier}`;
  if (!limiterCache.has(key)) {
    limiterCache.set(key, createLimiter(type, tier));
  }
  return limiterCache.get(key)!;
}

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "general",
  isPaid = false,
) {
  const tier: UserTier = isPaid ? "paid" : "free";
  const limiter = getLimiter(type, tier);
  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset, tier };
}
