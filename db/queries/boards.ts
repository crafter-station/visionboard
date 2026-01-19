import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { visionBoards } from "../schema";
import { generateBoardId } from "@/lib/id";
import type { UserIdentifier } from "./types";
import { getProfileByIdentifier } from "./profiles";

const BOARD_NAME_TEMPLATES = [
  "2026 Vision Board",
  "My Dream Year 2026",
  "2026 Goals & Dreams",
  "Vision 2026",
  "Manifest 2026",
];

export function generateDefaultBoardName(existingCount = 0): string {
  const template = BOARD_NAME_TEMPLATES[existingCount % BOARD_NAME_TEMPLATES.length];
  if (existingCount > 0 && existingCount >= BOARD_NAME_TEMPLATES.length) {
    return `${template} #${Math.floor(existingCount / BOARD_NAME_TEMPLATES.length) + 1}`;
  }
  return template;
}

export async function createVisionBoard(profileId: string, name?: string) {
  const id = generateBoardId();
  const boardName = name || generateDefaultBoardName(0);
  const [board] = await db
    .insert(visionBoards)
    .values({ id, profileId, name: boardName })
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
    orderBy: (boards, { asc }) => [asc(boards.createdAt)],
  });
}

export async function getVisionBoardsByIdentifier(identifier: UserIdentifier) {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return [];
  return getVisionBoardsForProfile(profile.id);
}

export async function countBoardsForProfile(
  profileId: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(visionBoards)
    .where(eq(visionBoards.profileId, profileId));
  return Number(result[0]?.count ?? 0);
}

export async function hasEmptyBoard(profileId: string): Promise<boolean> {
  const boards = await db.query.visionBoards.findMany({
    where: eq(visionBoards.profileId, profileId),
    with: {
      goals: true,
    },
  });
  return boards.some((board) => board.goals.length === 0);
}

export async function countBoardsByIdentifier(
  identifier: UserIdentifier,
): Promise<number> {
  const profile = await getProfileByIdentifier(identifier);
  if (!profile) return 0;
  return countBoardsForProfile(profile.id);
}

export async function deleteVisionBoard(id: string) {
  await db.delete(visionBoards).where(eq(visionBoards.id, id));
}

export async function updateVisionBoard(id: string, data: { name?: string }) {
  const [board] = await db
    .update(visionBoards)
    .set(data)
    .where(eq(visionBoards.id, id))
    .returning();
  return board;
}
