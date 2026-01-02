import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { goals, userProfiles, type NewGoal, type Goal } from "../schema";
import { generateGoalId } from "@/lib/id";
import type { UserIdentifier } from "./types";
import { getProfileByIdentifier } from "./profiles";

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

export async function countGoalsByBoard(boardId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .where(eq(goals.boardId, boardId));
  return Number(result[0]?.count ?? 0);
}

export async function updateGoalPositions(
  updates: Array<{
    id: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
  }>,
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

export async function countGeneratedPhotosForProfile(
  profileId: string,
): Promise<number> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, profileId),
    columns: { freeImagesUsed: true },
  });
  return profile?.freeImagesUsed ?? 0;
}

export async function countGeneratedPhotosByIdentifier(
  identifier: UserIdentifier,
): Promise<number> {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return 0;
  return countGeneratedPhotosForProfile(profile.id);
}
