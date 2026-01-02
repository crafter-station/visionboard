import { NextResponse } from "next/server";
import { updateGoalPositions } from "@/db/queries";
import { validateRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, error, remaining } = await validateRequest("general");

  if (!success) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      {
        status: 429,
        headers: remaining
          ? { "X-RateLimit-Remaining": String(remaining) }
          : {},
      },
    );
  }

  const { positions } = await request.json();

  if (!positions || !Array.isArray(positions)) {
    return NextResponse.json(
      { error: "Invalid positions data" },
      { status: 400 },
    );
  }

  await updateGoalPositions(positions);

  return NextResponse.json({ success: true });
}
