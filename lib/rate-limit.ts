import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimitGeneral = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "visionboard:general",
});

export const ratelimitImageGeneration = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "visionboard:image-gen",
});

export const ratelimitBackgroundRemoval = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "visionboard:bg-removal",
});

export const ratelimitUpload = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "visionboard:upload",
});

export const ratelimitGoals = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
  prefix: "visionboard:goals",
});

export type RateLimitType =
  | "general"
  | "image-gen"
  | "bg-removal"
  | "upload"
  | "goals";

const limiters: Record<RateLimitType, Ratelimit> = {
  general: ratelimitGeneral,
  "image-gen": ratelimitImageGeneration,
  "bg-removal": ratelimitBackgroundRemoval,
  upload: ratelimitUpload,
  goals: ratelimitGoals,
};

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "general",
) {
  const limiter = limiters[type];
  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset };
}
