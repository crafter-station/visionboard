import { eq, sql, and, isNotNull } from "drizzle-orm";
import { db } from ".";
import {
  userProfiles,
  visionBoards,
  goals,
  userCredits,
  purchases,
  type NewVisionBoard,
  type NewGoal,
  type Goal,
  type UserProfile,
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

function generateProfileId(): string {
  return `profile_${nanoid()}`;
}

export async function getProfileByVisitorId(visitorId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.visitorId, visitorId),
  });
}

export async function getProfileByUserId(userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
}

export async function getProfileByIdentifier(identifier: UserIdentifier): Promise<UserProfile | undefined> {
  const { userId, visitorId } = identifier;
  
  if (userId) {
    return getProfileByUserId(userId);
  }
  
  if (visitorId) {
    return getProfileByVisitorId(visitorId);
  }
  
  return undefined;
}

export async function getOrCreateProfile(identifier: UserIdentifier): Promise<UserProfile> {
  const { userId, visitorId } = identifier;
  
  let profile = await getProfileByIdentifier(identifier);
  
  if (profile) {
    return profile;
  }
  
  const id = generateProfileId();
  const [newProfile] = await db
    .insert(userProfiles)
    .values({
      id,
      visitorId: userId ? null : visitorId,
      userId: userId ?? null,
    })
    .returning();
  
  return newProfile;
}

export async function updateProfileAvatar(
  profileId: string,
  avatarOriginalUrl: string,
  avatarNoBgUrl: string
) {
  const [profile] = await db
    .update(userProfiles)
    .set({
      avatarOriginalUrl,
      avatarNoBgUrl,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, profileId))
    .returning();
  return profile;
}

export async function migrateProfileToUser(visitorId: string, userId: string): Promise<UserProfile | null> {
  const visitorProfile = await getProfileByVisitorId(visitorId);
  if (!visitorProfile) return null;
  
  const existingUserProfile = await getProfileByUserId(userId);
  
  if (existingUserProfile) {
    if (!existingUserProfile.avatarOriginalUrl && visitorProfile.avatarOriginalUrl) {
      await db
        .update(userProfiles)
        .set({
          avatarOriginalUrl: visitorProfile.avatarOriginalUrl,
          avatarNoBgUrl: visitorProfile.avatarNoBgUrl,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, existingUserProfile.id));
    }
    
    await db
      .update(visionBoards)
      .set({ profileId: existingUserProfile.id })
      .where(eq(visionBoards.profileId, visitorProfile.id));
    
    await db.delete(userProfiles).where(eq(userProfiles.id, visitorProfile.id));
    
    const updatedProfile = await getProfileByUserId(userId);
    return updatedProfile ?? null;
  }
  
  const [updatedProfile] = await db
    .update(userProfiles)
    .set({
      userId,
      visitorId: null,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, visitorProfile.id))
    .returning();
  
  return updatedProfile;
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
  polarCustomerId?: string
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

export async function createVisionBoard(profileId: string) {
  const id = generateBoardId();
  const [board] = await db
    .insert(visionBoards)
    .values({ id, profileId })
    .returning();
  return board;
}

export async function getVisionBoard(id: string) {
  return db.query.visionBoards.findFirst({
    where: eq(visionBoards.id, id),
    with: {
      goals: true,
      profile: true,
    },
  });
}

export async function getVisionBoardsForProfile(profileId: string) {
  return db.query.visionBoards.findMany({
    where: eq(visionBoards.profileId, profileId),
    with: {
      goals: true,
    },
    orderBy: (boards, { desc }) => [desc(boards.createdAt)],
  });
}

export async function getVisionBoardsByIdentifier(identifier: UserIdentifier) {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return [];
  return getVisionBoardsForProfile(profile.id);
}

export async function countBoardsForProfile(profileId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(visionBoards)
    .where(eq(visionBoards.profileId, profileId));
  return Number(result[0]?.count ?? 0);
}

export async function countBoardsByIdentifier(identifier: UserIdentifier): Promise<number> {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return 0;
  return countBoardsForProfile(profile.id);
}

export async function countGoalsByBoard(boardId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .where(eq(goals.boardId, boardId));
  return Number(result[0]?.count ?? 0);
}

export async function countGeneratedPhotosForProfile(profileId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(goals)
    .innerJoin(visionBoards, eq(goals.boardId, visionBoards.id))
    .where(
      and(
        eq(visionBoards.profileId, profileId),
        isNotNull(goals.generatedImageUrl)
      )
    );
  return Number(result[0]?.count ?? 0);
}

export async function countGeneratedPhotosByIdentifier(identifier: UserIdentifier): Promise<number> {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return 0;
  return countGeneratedPhotosForProfile(profile.id);
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

export async function getProfileWithBoards(identifier: UserIdentifier) {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return null;
  
  const boards = await getVisionBoardsForProfile(profile.id);
  const credits = await getCreditsForProfile(profile.id);
  
  return {
    profile,
    boards,
    credits,
  };
}

