import { NextResponse } from "next/server";
import {
  getVisionBoardsByIdentifier,
  deleteVisionBoard,
  createVisionBoard,
  getUserLimits,
  type UserIdentifier,
} from "@/db/queries";
import { getAuthIdentifier, isPaidUser } from "@/lib/auth";

export async function GET() {
  const identifier = await getAuthIdentifier();
  const { userId, visitorId } = identifier;

  if (!userId && !visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boards = await getVisionBoardsByIdentifier(identifier);
  const isPaid = await isPaidUser();
  const limits = getUserLimits(isPaid);

  const totalPhotos = boards.reduce(
    (acc, board) => acc + board.goals.filter((g) => g.generatedImageUrl).length,
    0
  );

  return NextResponse.json({
    boards,
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
    isPaid,
  });
}

export async function POST(request: Request) {
  const identifier = await getAuthIdentifier();
  const { userId, visitorId } = identifier;

  if (!userId && !visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { reusePhotoFrom } = body;

  if (!reusePhotoFrom) {
    return NextResponse.json({ error: "Missing reusePhotoFrom board ID" }, { status: 400 });
  }

  const boards = await getVisionBoardsByIdentifier(identifier);
  const isPaid = await isPaidUser();
  const limits = getUserLimits(isPaid);

  if (boards.length >= limits.maxBoards) {
    // TODO: Polar - redirect to payment if not paid
    return NextResponse.json(
      { 
        error: "Maximum boards limit reached",
        requiresUpgrade: !isPaid,
      },
      { status: 400 }
    );
  }

  const sourceBoard = boards.find((b) => b.id === reusePhotoFrom);

  if (!sourceBoard) {
    return NextResponse.json({ error: "Source board not found" }, { status: 404 });
  }

  const newBoard = await createVisionBoard({
    visitorId: userId ? null : visitorId,
    userId: userId ?? undefined,
    userPhotoUrl: sourceBoard.userPhotoUrl,
    userPhotoNoBgUrl: sourceBoard.userPhotoNoBgUrl,
  });

  return NextResponse.json({
    boardId: newBoard.id,
    originalUrl: newBoard.userPhotoUrl,
    noBgUrl: newBoard.userPhotoNoBgUrl,
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

  const boards = await getVisionBoardsByIdentifier(identifier);
  const board = boards.find((b) => b.id === boardId);

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await deleteVisionBoard(boardId);

  return NextResponse.json({ success: true });
}
