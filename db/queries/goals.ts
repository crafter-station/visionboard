import { eq, sql, and, or, lte } from "drizzle-orm";
import { db } from "..";
import { goals, userProfiles, visionBoards, type NewGoal, type Goal } from "../schema";
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
  // Count only non-failed goals (failed goals shouldn't count toward the limit)
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .where(
      and(
        eq(goals.boardId, boardId),
        sql`${goals.status} != 'failed'`
      )
    );
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

// Stuck goal timeout in milliseconds (3 minutes)
const STUCK_GOAL_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Find goals that have been stuck in "pending" or "generating" status for too long.
 * Returns goals along with their profile ID for credit refund.
 */
export async function findStuckGoals(): Promise<
  Array<{ goal: Goal; profileId: string }>
> {
  const cutoffTime = new Date(Date.now() - STUCK_GOAL_TIMEOUT_MS);

  const stuckGoals = await db
    .select({
      goal: goals,
      profileId: visionBoards.profileId,
    })
    .from(goals)
    .innerJoin(visionBoards, eq(goals.boardId, visionBoards.id))
    .where(
      and(
        or(eq(goals.status, "pending"), eq(goals.status, "generating")),
        lte(goals.createdAt, cutoffTime)
      )
    );

  return stuckGoals;
}

/**
 * Find stuck goals for a specific board.
 * Used during polling to detect and handle stuck goals for a user's board.
 */
export async function findStuckGoalsForBoard(
  boardId: string
): Promise<Goal[]> {
  const cutoffTime = new Date(Date.now() - STUCK_GOAL_TIMEOUT_MS);

  const stuckGoals = await db.query.goals.findMany({
    where: and(
      eq(goals.boardId, boardId),
      or(eq(goals.status, "pending"), eq(goals.status, "generating")),
      lte(goals.createdAt, cutoffTime)
    ),
  });

  return stuckGoals;
}

/**
 * Mark a goal as failed (used for stuck goal cleanup).
 */
export async function markGoalAsFailed(goalId: string): Promise<Goal | null> {
  const [goal] = await db
    .update(goals)
    .set({ status: "failed" })
    .where(eq(goals.id, goalId))
    .returning();
  return goal ?? null;
}
