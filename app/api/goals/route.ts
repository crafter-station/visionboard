import { NextResponse } from "next/server";
import { createGoal, deleteGoal, getVisionBoard } from "@/db/queries";

export async function POST(request: Request) {
  const { boardId, title } = await request.json();

  if (!boardId || !title) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const goal = await createGoal({ boardId, title });

  return NextResponse.json(goal);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("id");

  if (!goalId) {
    return NextResponse.json(
      { error: "Missing goal ID" },
      { status: 400 }
    );
  }

  await deleteGoal(goalId);

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json(
      { error: "Missing board ID" },
      { status: 400 }
    );
  }

  const board = await getVisionBoard(boardId);

  if (!board) {
    return NextResponse.json(
      { error: "Board not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(board.goals);
}

