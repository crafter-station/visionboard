import { NextResponse } from "next/server";
import { updateGoalPositions } from "@/db/queries";

export async function POST(request: Request) {
  const { positions } = await request.json();

  if (!positions || !Array.isArray(positions)) {
    return NextResponse.json(
      { error: "Invalid positions data" },
      { status: 400 }
    );
  }

  await updateGoalPositions(positions);

  return NextResponse.json({ success: true });
}

