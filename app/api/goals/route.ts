import { NextResponse } from "next/server";
import {
  createGoal,
  deleteGoal,
  getVisionBoard,
  countGoalsByBoard,
  getUserLimits,
  getProfileByIdentifier,
  getCreditsForProfile,
  findStuckGoalsForBoard,
  markGoalAsFailed,
  addCredit,
} from "@/db/queries";
import { validateRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, identifier, error, remaining } =
    await validateRequest("goals");

  if (!success || !identifier) {
    return NextResponse.json(
      { error: error || "Authentication required" },
      {
        status: identifier ? 429 : 401,
        headers: remaining
          ? { "X-RateLimit-Remaining": String(remaining) }
          : {},
      },
    );
  }

  const { boardId, title } = await request.json();

  if (!boardId || !title) {
    console.error(`[Goals API] Missing fields - boardId: ${boardId}, title: ${title}`);
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (title.length > 200) {
    console.error(`[Goals API] Title too long: ${title.length} chars`);
    return NextResponse.json(
      { error: "Goal title too long. Max 200 characters" },
      { status: 400 },
    );
  }

  const profile = await getProfileByIdentifier(identifier);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);

  const goalCount = await countGoalsByBoard(boardId);
  console.log(`[Goals API] Board ${boardId} has ${goalCount} goals, limit is ${limits.maxGoalsPerBoard}`);

  if (goalCount >= limits.maxGoalsPerBoard) {
    console.error(`[Goals API] Goal limit reached: ${goalCount} >= ${limits.maxGoalsPerBoard}`);
    return NextResponse.json(
      { error: `Maximum ${limits.maxGoalsPerBoard} goals per board allowed` },
      { status: 400 },
    );
  }

  const goal = await createGoal({ boardId, title });

  return NextResponse.json(goal);
}

export async function DELETE(request: Request) {
  const { success, identifier, error, remaining } = await validateRequest("goals");

  if (!success || !identifier) {
    return NextResponse.json(
      { error: error || "Authentication required" },
      {
        status: identifier ? 429 : 401,
        headers: remaining
          ? { "X-RateLimit-Remaining": String(remaining) }
          : {},
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("id");

  if (!goalId) {
    return NextResponse.json({ error: "Missing goal ID" }, { status: 400 });
  }

  const profile = await getProfileByIdentifier(identifier);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Verify ownership before deleting
  const { goals: goalsTable } = await import("@/db/schema");
  const { db } = await import("@/db");
  const { eq } = await import("drizzle-orm");

  const goal = await db.query.goals.findFirst({
    where: eq(goalsTable.id, goalId),
    with: { board: true },
  });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  if (goal.board.profileId !== profile.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await deleteGoal(goalId);

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json({ error: "Missing board ID" }, { status: 400 });
  }

  const board = await getVisionBoard(boardId);

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Check for and cleanup stuck goals (generating for > 3 minutes)
  // This runs during polling to automatically detect and recover from FAL API failures
  const stuckGoals = await findStuckGoalsForBoard(boardId);

  for (const stuckGoal of stuckGoals) {
    console.log(`[Goals API] Cleaning up stuck goal ${stuckGoal.id} (created ${stuckGoal.createdAt})`);

    // Mark as failed
    await markGoalAsFailed(stuckGoal.id);

    // Refund credit if this goal didn't have a generated image
    // (meaning the user was charged but generation failed)
    if (!stuckGoal.generatedImageUrl) {
      await addCredit(board.profileId);
      console.log(`[Goals API] Refunded credit for stuck goal ${stuckGoal.id}`);
    }
  }

  // Re-fetch goals if we cleaned up any stuck ones
  if (stuckGoals.length > 0) {
    const updatedBoard = await getVisionBoard(boardId);
    return NextResponse.json(updatedBoard?.goals ?? []);
  }

  return NextResponse.json(board.goals);
}
