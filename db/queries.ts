import { eq } from "drizzle-orm";
import { db } from ".";
import {
  visionBoards,
  goals,
  type NewVisionBoard,
  type NewGoal,
  type Goal,
} from "./schema";
import { generateBoardId, generateGoalId } from "@/lib/id";

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
