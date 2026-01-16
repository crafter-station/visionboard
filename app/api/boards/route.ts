import { NextResponse } from "next/server";
import {
  getProfileByIdentifier,
  getVisionBoardsForProfile,
  deleteVisionBoard,
  createVisionBoard,
  updateVisionBoard,
  getUserLimits,
  countBoardsForProfile,
  getCreditsForProfile,
  generateDefaultBoardName,
  initializeFreeCredits,
} from "@/db/queries";
import { LIMITS } from "@/lib/constants";
import { getAuthIdentifier } from "@/lib/auth";

export async function GET() {
  const identifier = await getAuthIdentifier();

  if (!identifier) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const profile = await getProfileByIdentifier(identifier);

  if (!profile) {
    return NextResponse.json({
      boards: [],
      profile: null,
      limits: {
        MAX_BOARDS_PER_USER: LIMITS.MAX_BOARDS_PER_USER,
        MAX_GOALS_PER_BOARD: LIMITS.MAX_GOALS_PER_BOARD,
        MAX_PHOTOS_PER_USER: LIMITS.FREE_CREDITS,
      },
      usage: {
        boards: 0,
        photos: 0,
      },
      isAuthenticated: true,
      isPaid: false,
      credits: LIMITS.FREE_CREDITS,
    });
  }

  // Initialize free credits for new users
  await initializeFreeCredits(profile.id);

  const boards = await getVisionBoardsForProfile(profile.id);
  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);

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
      photos: credits, // Now photos usage is just the current credit count
    },
    isAuthenticated: true,
    isPaid: limits.isPaid,
    credits,
  });
}

export async function POST() {
  const identifier = await getAuthIdentifier();

  if (!identifier) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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

  const boardName = generateDefaultBoardName(boardCount);
  const newBoard = await createVisionBoard(profile.id, boardName);

  return NextResponse.json({
    boardId: newBoard.id,
    boardName: newBoard.name,
    profileId: profile.id,
    avatarOriginalUrl: profile.avatarOriginalUrl,
    avatarNoBgUrl: profile.avatarNoBgUrl,
  });
}

export async function DELETE(request: Request) {
  const identifier = await getAuthIdentifier();

  if (!identifier) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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

export async function PATCH(request: Request) {
  const identifier = await getAuthIdentifier();

  if (!identifier) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { boardId, name } = body;

  if (!boardId) {
    return NextResponse.json({ error: "Missing board ID" }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Invalid board name" }, { status: 400 });
  }

  const trimmedName = name.trim().slice(0, 50);

  const profile = await getProfileByIdentifier(identifier);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const boards = await getVisionBoardsForProfile(profile.id);
  const board = boards.find((b) => b.id === boardId);

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const updatedBoard = await updateVisionBoard(boardId, { name: trimmedName });

  return NextResponse.json({ success: true, board: updatedBoard });
}
