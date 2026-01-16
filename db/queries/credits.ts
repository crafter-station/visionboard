import { eq, sql, gte, and } from "drizzle-orm";
import { db } from "..";
import { userCredits, purchases } from "../schema";
import { nanoid } from "nanoid";
import { LIMITS } from "@/lib/constants";

export function getUserLimits(credits: number = 0) {
  // Users with more than FREE_CREDITS are considered paid
  const isPaid = credits > LIMITS.FREE_CREDITS;
  return {
    maxBoards: LIMITS.MAX_BOARDS_PER_USER,
    maxPhotos: credits, // All users have credits now
    maxGoalsPerBoard: LIMITS.MAX_GOALS_PER_BOARD,
    isPaid,
    credits,
  };
}

export async function getCreditsForProfile(profileId: string): Promise<number> {
  const result = await db.query.userCredits.findFirst({
    where: eq(userCredits.profileId, profileId),
  });
  return result?.imageCredits ?? 0;
}

export async function initializeFreeCredits(profileId: string): Promise<number> {
  const existing = await getCreditsRecordForProfile(profileId);

  // Only initialize if no credits record exists
  if (existing) {
    return existing.imageCredits;
  }

  await db.insert(userCredits).values({
    profileId,
    imageCredits: LIMITS.FREE_CREDITS,
    totalPurchased: 0,
  });

  return LIMITS.FREE_CREDITS;
}

export async function getCreditsRecordForProfile(profileId: string) {
  return db.query.userCredits.findFirst({
    where: eq(userCredits.profileId, profileId),
  });
}

export async function addCredits(
  profileId: string,
  amount: number,
  polarOrderId: string,
  polarCustomerId?: string,
): Promise<{ credits: number; alreadyProcessed: boolean }> {
  const existingPurchase = await db.query.purchases.findFirst({
    where: eq(purchases.polarOrderId, polarOrderId),
  });

  if (existingPurchase) {
    const credits = await getCreditsForProfile(profileId);
    return { credits, alreadyProcessed: true };
  }

  const existing = await getCreditsRecordForProfile(profileId);

  if (existing) {
    await db
      .update(userCredits)
      .set({
        imageCredits: sql`${userCredits.imageCredits} + ${amount}`,
        totalPurchased: sql`${userCredits.totalPurchased} + ${amount}`,
        polarCustomerId: polarCustomerId ?? existing.polarCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.profileId, profileId));
  } else {
    await db.insert(userCredits).values({
      profileId,
      imageCredits: amount,
      totalPurchased: amount,
      polarCustomerId,
    });
  }

  await db.insert(purchases).values({
    id: nanoid(),
    profileId,
    polarOrderId,
    amount: 500,
    creditsAdded: amount,
  });

  const credits = await getCreditsForProfile(profileId);
  return { credits, alreadyProcessed: false };
}

export async function deductCredit(profileId: string): Promise<boolean> {
  // Atomic check-and-decrement: only deduct if credits > 0
  // This prevents race conditions where two concurrent requests could both succeed
  const result = await db
    .update(userCredits)
    .set({
      imageCredits: sql`${userCredits.imageCredits} - 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userCredits.profileId, profileId),
        sql`${userCredits.imageCredits} > 0`
      )
    );

  // If no rows were updated, the user had 0 credits
  // @ts-expect-error - rowCount exists on the result but isn't typed
  return (result.rowCount ?? result.rowsAffected ?? 0) > 0;
}

export async function addCredit(profileId: string): Promise<void> {
  const existing = await getCreditsRecordForProfile(profileId);
  if (!existing) return;

  await db
    .update(userCredits)
    .set({
      imageCredits: sql`${userCredits.imageCredits} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.profileId, profileId));
}

export async function hasPurchaseSince(
  profileId: string,
  since: Date,
): Promise<{ hasPurchase: boolean; credits: number }> {
  const recentPurchase = await db.query.purchases.findFirst({
    where: and(
      eq(purchases.profileId, profileId),
      gte(purchases.createdAt, since),
    ),
  });

  const credits = await getCreditsForProfile(profileId);
  return { hasPurchase: !!recentPurchase, credits };
}

export async function getLatestPurchaseForProfile(profileId: string) {
  return db.query.purchases.findFirst({
    where: eq(purchases.profileId, profileId),
    orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
  });
}

