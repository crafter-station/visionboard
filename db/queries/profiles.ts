import { eq } from "drizzle-orm";
import { db } from "..";
import { userProfiles, type UserProfile } from "../schema";
import { nanoid } from "nanoid";
import type { UserIdentifier } from "./types";
import { getVisionBoardsForProfile } from "./boards";
import { getCreditsForProfile } from "./credits";

function generateProfileId(): string {
  return `profile_${nanoid()}`;
}

export async function getProfileByUserId(
  userId: string,
): Promise<UserProfile | undefined> {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
}

export async function getProfileByIdentifier(
  identifier: UserIdentifier,
): Promise<UserProfile | undefined> {
  return getProfileByUserId(identifier.userId);
}

export async function getOrCreateProfile(
  identifier: UserIdentifier,
): Promise<UserProfile> {
  const profile = await getProfileByIdentifier(identifier);

  if (profile) {
    return profile;
  }

  const id = generateProfileId();
  const [newProfile] = await db
    .insert(userProfiles)
    .values({
      id,
      userId: identifier.userId,
    })
    .returning();

  return newProfile;
}

export async function updateProfileAvatar(
  profileId: string,
  avatarOriginalUrl: string,
  avatarNoBgUrl: string,
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
