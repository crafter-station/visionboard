import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateImageWithUser } from "@/lib/fal";
import { validateRequest } from "@/lib/auth";
import { updateGoal } from "@/db/queries";

export async function POST(request: Request) {
  const { success, error, remaining } = await validateRequest("image-gen");

  if (!success) {
    return NextResponse.json(
      { error: error || "Unauthorized", remaining },
      { status: 429 }
    );
  }

  const { userImageUrl, goalId, goalPrompt } = await request.json();

  if (!userImageUrl || !goalId || !goalPrompt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const generatedUrl = await generateImageWithUser(userImageUrl, goalPrompt);

  const response = await fetch(generatedUrl);
  const imageBuffer = await response.arrayBuffer();

  const blob = await put(`goal-${goalId}-${Date.now()}.png`, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await updateGoal(goalId, { generatedImageUrl: blob.url });

  return NextResponse.json({
    goalId,
    imageUrl: blob.url,
    remaining,
  });
}
