import { NextResponse } from "next/server";
import { generatePhrase } from "@/lib/openai";
import { updateGoal } from "@/db/queries";
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

  const { goalId, goalTitle } = await request.json();

  if (!goalId || !goalTitle) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const phrase = await generatePhrase(goalTitle);

  await updateGoal(goalId, { phrase });

  return NextResponse.json({
    goalId,
    phrase,
  });
}
