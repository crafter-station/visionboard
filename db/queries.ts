import { eq, sql, and, isNotNull } from "drizzle-orm";
import { db } from ".";
import {
  visionBoards,
  goals,
  type NewVisionBoard,
  type NewGoal,
  type Goal,
} from "./schema";
import { generateBoardId, generateGoalId } from "@/lib/id";

export const LIMITS = {
  MAX_BOARDS_PER_USER: 2,
  MAX_GOALS_PER_BOARD: 4,
  MAX_PHOTOS_PER_USER: 8,
} as const;

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

export async function countBoardsByVisitor(visitorId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(visionBoards)
    .where(eq(visionBoards.visitorId, visitorId));
  return Number(result[0]?.count ?? 0);
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
