import { NextResponse } from "next/server";
import { createGoal, deleteGoal, getVisionBoard, countGoalsByBoard, getUserLimits } from "@/db/queries";
import { validateRequest, isPaidUser } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, error, remaining } = await validateRequest("goals");

  if (!success) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 429, headers: remaining ? { "X-RateLimit-Remaining": String(remaining) } : {} }
    );
  }

  const { boardId, title } = await request.json();

  if (!boardId || !title) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (title.length > 200) {
    return NextResponse.json(
      { error: "Goal title too long. Max 200 characters" },
      { status: 400 }
    );
  }

  const isPaid = await isPaidUser();
  const limits = getUserLimits(isPaid);

  const goalCount = await countGoalsByBoard(boardId);
  if (goalCount >= limits.maxGoalsPerBoard) {
    return NextResponse.json(
      { error: `Maximum ${limits.maxGoalsPerBoard} goals per board allowed` },
      { status: 400 }
    );
  }

  const goal = await createGoal({ boardId, title });

  return NextResponse.json(goal);
}

export async function DELETE(request: Request) {
  const { success, error, remaining } = await validateRequest("goals");

  if (!success) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 429, headers: remaining ? { "X-RateLimit-Remaining": String(remaining) } : {} }
    );
  }

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
