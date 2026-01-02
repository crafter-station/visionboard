import { eq, sql, and, isNotNull, isNull, or } from "drizzle-orm";
import { db } from ".";
import {
  visionBoards,
  goals,
  userCredits,
  purchases,
  type NewVisionBoard,
  type NewGoal,
  type Goal,
} from "./schema";
import { generateBoardId, generateGoalId } from "@/lib/id";
import { nanoid } from "nanoid";

export const LIMITS = {
  FREE_MAX_BOARDS: 1,
  FREE_MAX_PHOTOS: 3,
  PAID_MAX_BOARDS: Infinity,
  PAID_CREDITS_PER_PURCHASE: 50,
  MAX_GOALS_PER_BOARD: 4,
} as const;

export type UserIdentifier = {
  visitorId?: string | null;
  userId?: string | null;
};

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

export async function getUserCredits(userId: string): Promise<number> {
  const result = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });
  return result?.imageCredits ?? 0;
}

export async function getUserCreditsRecord(userId: string) {
  return db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });
}

export async function addCredits(
  userId: string,
  amount: number,
  polarOrderId: string,
  polarCustomerId?: string
): Promise<{ credits: number; alreadyProcessed: boolean }> {
  const existingPurchase = await db.query.purchases.findFirst({
    where: eq(purchases.polarOrderId, polarOrderId),
  });

  if (existingPurchase) {
    const credits = await getUserCredits(userId);
    return { credits, alreadyProcessed: true };
  }

  const existing = await getUserCreditsRecord(userId);

  if (existing) {
    await db
      .update(userCredits)
      .set({
        imageCredits: sql`${userCredits.imageCredits} + ${amount}`,
        totalPurchased: sql`${userCredits.totalPurchased} + ${amount}`,
        polarCustomerId: polarCustomerId ?? existing.polarCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));
  } else {
    await db.insert(userCredits).values({
      userId,
      imageCredits: amount,
      totalPurchased: amount,
      polarCustomerId,
    });
  }

  await db.insert(purchases).values({
    id: nanoid(),
    userId,
    polarOrderId,
    amount: 500,
    creditsAdded: amount,
  });

  const credits = await getUserCredits(userId);
  return { credits, alreadyProcessed: false };
}

export async function deductCredit(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  if (credits <= 0) return false;

  await db
    .update(userCredits)
    .set({
      imageCredits: sql`${userCredits.imageCredits} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, userId));

  return true;
}

export async function createVisionBoard(data: Omit<NewVisionBoard, "id">) {
  const id = generateBoardId();
  const [board] = await db
    .insert(visionBoards)
    .values({ ...data, id })
    .returning();
  return board;
}

export async function getVisionBoard(id: string) {
  return db.query.visionBoards.findFirst({
    where: eq(visionBoards.id, id),
    with: {
      goals: true,
    },
  });
}

export async function getVisionBoardsByVisitor(visitorId: string) {
  return db.query.visionBoards.findMany({
    where: eq(visionBoards.visitorId, visitorId),
    with: {
      goals: true,
    },
    orderBy: (boards, { desc }) => [desc(boards.createdAt)],
  });
}

export async function getVisionBoardsByUser(userId: string) {
  return db.query.visionBoards.findMany({
    where: eq(visionBoards.userId, userId),
    with: {
      goals: true,
    },
    orderBy: (boards, { desc }) => [desc(boards.createdAt)],
  });
}

export async function getVisionBoardsByIdentifier(identifier: UserIdentifier) {
  const { userId, visitorId } = identifier;
  
  if (userId) {
    return getVisionBoardsByUser(userId);
  }
  
  if (visitorId) {
    return getVisionBoardsByVisitor(visitorId);
  }
  
  return [];
}

export async function countBoardsByVisitor(visitorId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(visionBoards)
    .where(eq(visionBoards.visitorId, visitorId));
  return Number(result[0]?.count ?? 0);
}

export async function countBoardsByUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(visionBoards)
    .where(eq(visionBoards.userId, userId));
  return Number(result[0]?.count ?? 0);
}

export async function countBoardsByIdentifier(identifier: UserIdentifier): Promise<number> {
  const { userId, visitorId } = identifier;
  
  if (userId) {
    return countBoardsByUser(userId);
  }
  
  if (visitorId) {
    return countBoardsByVisitor(visitorId);
  }
  
  return 0;
}

export async function countGoalsByBoard(boardId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .where(eq(goals.boardId, boardId));
  return Number(result[0]?.count ?? 0);
}

export async function countGeneratedPhotosByVisitor(visitorId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .innerJoin(visionBoards, eq(goals.boardId, visionBoards.id))
    .where(
      and(
        eq(visionBoards.visitorId, visitorId),
        isNotNull(goals.generatedImageUrl)
      )
    );
  return Number(result[0]?.count ?? 0);
}

export async function countGeneratedPhotosByUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .innerJoin(visionBoards, eq(goals.boardId, visionBoards.id))
    .where(
      and(
        eq(visionBoards.userId, userId),
        isNotNull(goals.generatedImageUrl)
      )
    );
  return Number(result[0]?.count ?? 0);
}

export async function countGeneratedPhotosByIdentifier(identifier: UserIdentifier): Promise<number> {
  const { userId, visitorId } = identifier;
  
  if (userId) {
    return countGeneratedPhotosByUser(userId);
  }
  
  if (visitorId) {
    return countGeneratedPhotosByVisitor(visitorId);
  }
  
  return 0;
}

export async function deleteVisionBoard(id: string) {
  await db.delete(visionBoards).where(eq(visionBoards.id, id));
}

export async function createGoal(data: Omit<NewGoal, "id">) {
  const id = generateGoalId();
  const [goal] = await db
    .insert(goals)
    .values({ ...data, id })
    .returning();
  return goal;
}

export async function updateGoal(id: string, data: Partial<Goal>) {
  const [goal] = await db
    .update(goals)
    .set(data)
    .where(eq(goals.id, id))
    .returning();
  return goal;
}

export async function deleteGoal(id: string) {
  await db.delete(goals).where(eq(goals.id, id));
}

export async function updateGoalPositions(
  updates: Array<{ id: string; positionX: number; positionY: number; width: number; height: number }>
) {
  for (const update of updates) {
    await db
      .update(goals)
      .set({
        positionX: update.positionX,
        positionY: update.positionY,
        width: update.width,
        height: update.height,
      })
      .where(eq(goals.id, update.id));
  }
}

export async function migrateBoardsToUser(visitorId: string, userId: string): Promise<number> {
  const result = await db
    .update(visionBoards)
    .set({ userId, visitorId: null })
    .where(
      and(
        eq(visionBoards.visitorId, visitorId),
        isNull(visionBoards.userId)
      )
    )
    .returning();
  return result.length;
}
