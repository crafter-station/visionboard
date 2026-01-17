export const LIMITS = {
  FREE_CREDITS: 3,
  PAID_CREDITS_PER_PURCHASE: 10,
  CREDIT_COST_PER_IMAGE: 1,
  MAX_BOARDS_PER_USER: 999,
  MAX_GOALS_PER_BOARD: 999,
} as const;

export type Limits = typeof LIMITS;

// Rate limits: [requests, window in seconds]
// In development with DEV_MOCK_FAL, use more generous limits for testing
const isDev = process.env.DEV_MOCK_FAL === "true";

export const RATE_LIMITS = {
  general: {
    free: { requests: isDev ? 100 : 20, window: 60 },      // 20/min (100 in dev)
    paid: { requests: isDev ? 200 : 60, window: 60 },      // 60/min (200 in dev)
  },
  "image-gen": {
    free: { requests: isDev ? 100 : 10, window: 3600 },    // 10/hour (100 in dev)
    paid: { requests: isDev ? 500 : 100, window: 3600 },   // 100/hour (500 in dev)
  },
  "bg-removal": {
    free: { requests: isDev ? 50 : 3, window: 3600 },      // 3/hour (50 in dev)
    paid: { requests: isDev ? 100 : 20, window: 3600 },    // 20/hour (100 in dev)
  },
  upload: {
    free: { requests: isDev ? 50 : 5, window: 3600 },      // 5/hour (50 in dev)
    paid: { requests: isDev ? 100 : 30, window: 3600 },    // 30/hour (100 in dev)
  },
  goals: {
    free: { requests: isDev ? 200 : 30, window: 3600 },    // 30/hour (200 in dev)
    paid: { requests: isDev ? 500 : 200, window: 3600 },   // 200/hour (500 in dev)
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

