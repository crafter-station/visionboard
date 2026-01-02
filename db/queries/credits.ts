import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { userCredits, purchases } from "../schema";
import { nanoid } from "nanoid";
import { LIMITS } from "@/lib/constants";

export function getUserLimits(credits: number = 0) {
  const isPaid = credits > 0;
  return {
    maxBoards: isPaid ? LIMITS.PAID_MAX_BOARDS : LIMITS.FREE_MAX_BOARDS,
    maxPhotos: isPaid ? credits : LIMITS.FREE_MAX_PHOTOS,
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
  const credits = await getCreditsForProfile(profileId);
  if (credits <= 0) return false;

  await db
    .update(userCredits)
    .set({
      imageCredits: sql`${userCredits.imageCredits} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.profileId, profileId));

  return true;
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

