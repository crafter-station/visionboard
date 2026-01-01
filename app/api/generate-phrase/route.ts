import { NextResponse } from "next/server";
import { generatePhrase } from "@/lib/openai";
import { updateGoal } from "@/db/queries";
import { getVisitorId } from "@/lib/auth";

export async function POST(request: Request) {
  const visitorId = await getVisitorId();

  if (!visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goalId, goalTitle } = await request.json();

  if (!goalId || !goalTitle) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const phrase = await generatePhrase(goalTitle);

  await updateGoal(goalId, { phrase });

  return NextResponse.json({
    goalId,
    phrase,
  });
}
