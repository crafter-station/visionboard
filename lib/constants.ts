export const LIMITS = {
  FREE_MAX_BOARDS: 1,
  FREE_MAX_PHOTOS: 1,
  PAID_MAX_BOARDS: 99,
  PAID_CREDITS_PER_PURCHASE: 50,
  MAX_GOALS_PER_BOARD: 99,
} as const;

export type Limits = typeof LIMITS;

