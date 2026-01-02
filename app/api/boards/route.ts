import { NextResponse } from "next/server";
import {
  getProfileByIdentifier,
  getVisionBoardsForProfile,
  deleteVisionBoard,
  createVisionBoard,
  getUserLimits,
  countBoardsForProfile,
  getCreditsForProfile,
} from "@/db/queries";
import { getAuthIdentifier } from "@/lib/auth";

export async function GET() {
  const identifier = await getAuthIdentifier();
  const { userId, visitorId } = identifier;

  if (!userId && !visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByIdentifier(identifier);

  if (!profile) {
    return NextResponse.json({
      boards: [],
      profile: null,
      limits: {
        MAX_BOARDS_PER_USER: 1,
        MAX_GOALS_PER_BOARD: 4,
        MAX_PHOTOS_PER_USER: 3,
      },
      usage: {
        boards: 0,
        photos: 0,
      },
      isAuthenticated: !!userId,
      isPaid: false,
      credits: 0,
    });
  }

  const boards = await getVisionBoardsForProfile(profile.id);
  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);

  const totalPhotos = boards.reduce(
    (acc, board) => acc + board.goals.filter((g) => g.generatedImageUrl).length,
    0,
  );

  return NextResponse.json({
    boards,
    profile: {
      id: profile.id,
      avatarOriginalUrl: profile.avatarOriginalUrl,
      avatarNoBgUrl: profile.avatarNoBgUrl,
    },
    limits: {
      MAX_BOARDS_PER_USER: limits.maxBoards,
      MAX_GOALS_PER_BOARD: limits.maxGoalsPerBoard,
      MAX_PHOTOS_PER_USER: limits.maxPhotos,
    },
    usage: {
      boards: boards.length,
      photos: totalPhotos,
    },
    isAuthenticated: !!userId,
    isPaid: limits.isPaid,
    credits,
  });
}

export async function POST(request: Request) {
  const identifier = await getAuthIdentifier();
  const { userId, visitorId } = identifier;

  if (!userId && !visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByIdentifier(identifier);

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Upload a photo first." },
      { status: 400 },
    );
  }

  if (!profile.avatarNoBgUrl) {
    return NextResponse.json(
      { error: "No avatar found. Upload a photo first." },
      { status: 400 },
    );
  }

  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);
  const boardCount = await countBoardsForProfile(profile.id);

  if (boardCount >= limits.maxBoards) {
    return NextResponse.json(
      {
        error: "Maximum boards limit reached",
        requiresUpgrade: !limits.isPaid,
      },
      { status: 400 },
    );
  }

  const newBoard = await createVisionBoard(profile.id);

  return NextResponse.json({
    boardId: newBoard.id,
    profileId: profile.id,
    avatarOriginalUrl: profile.avatarOriginalUrl,
    avatarNoBgUrl: profile.avatarNoBgUrl,
  });
}

export async function DELETE(request: Request) {
  const identifier = await getAuthIdentifier();
  const { userId, visitorId } = identifier;

  if (!userId && !visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("id");

  if (!boardId) {
    return NextResponse.json({ error: "Missing board ID" }, { status: 400 });
  }

  const profile = await getProfileByIdentifier(identifier);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const boards = await getVisionBoardsForProfile(profile.id);
  const board = boards.find((b) => b.id === boardId);

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await deleteVisionBoard(boardId);

  return NextResponse.json({ success: true });
}
