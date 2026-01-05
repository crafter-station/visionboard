export const LIMITS = {
  FREE_MAX_BOARDS: 1,
  FREE_MAX_PHOTOS: 1,
  PAID_MAX_BOARDS: 99,
  PAID_CREDITS_PER_PURCHASE: 50,
  MAX_GOALS_PER_BOARD: 99,
} as const;

export type Limits = typeof LIMITS;

// Rate limits: [requests, window in seconds]
export const RATE_LIMITS = {
  general: {
    free: { requests: 20, window: 60 },      // 20/min
    paid: { requests: 60, window: 60 },      // 60/min
  },
  "image-gen": {
    free: { requests: 10, window: 3600 },    // 10/hour
    paid: { requests: 100, window: 3600 },   // 100/hour
  },
  "bg-removal": {
    free: { requests: 3, window: 3600 },     // 3/hour
    paid: { requests: 20, window: 3600 },    // 20/hour
  },
  upload: {
    free: { requests: 5, window: 3600 },     // 5/hour
    paid: { requests: 30, window: 3600 },    // 30/hour
  },
  goals: {
    free: { requests: 30, window: 3600 },    // 30/hour
    paid: { requests: 200, window: 3600 },   // 200/hour
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

