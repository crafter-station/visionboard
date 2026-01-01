import { NextResponse } from "next/server";
import { getVisionBoardsByVisitor, deleteVisionBoard, LIMITS } from "@/db/queries";
import { getVisitorId } from "@/lib/auth";

export async function GET() {
  const visitorId = await getVisitorId();

  if (!visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boards = await getVisionBoardsByVisitor(visitorId);

  const totalPhotos = boards.reduce(
    (acc, board) => acc + board.goals.filter((g) => g.generatedImageUrl).length,
    0
  );

  return NextResponse.json({
    boards,
    limits: LIMITS,
    usage: {
      boards: boards.length,
      photos: totalPhotos,
    },
  });
}

export async function DELETE(request: Request) {
  const visitorId = await getVisitorId();

  if (!visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("id");

  if (!boardId) {
    return NextResponse.json({ error: "Missing board ID" }, { status: 400 });
  }

  const boards = await getVisionBoardsByVisitor(visitorId);
  const board = boards.find((b) => b.id === boardId);

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await deleteVisionBoard(boardId);

  return NextResponse.json({ success: true });
}

