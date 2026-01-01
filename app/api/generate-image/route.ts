import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateImageWithUser } from "@/lib/fal";
import { validateRequest } from "@/lib/auth";
import { updateGoal, countGeneratedPhotosByVisitor, LIMITS } from "@/db/queries";
import { db } from "@/db";
import { goals, visionBoards } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { success, visitorId, error, remaining } = await validateRequest("image-gen");

  if (!success || !visitorId) {
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

  const existingGoal = await db.query.goals.findFirst({
    where: eq(goals.id, goalId),
    with: { board: true },
  });

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  if (existingGoal.board.visitorId !== visitorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const isRegeneration = !!existingGoal.generatedImageUrl;

  if (!isRegeneration) {
    const photoCount = await countGeneratedPhotosByVisitor(visitorId);
    if (photoCount >= LIMITS.MAX_PHOTOS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${LIMITS.MAX_PHOTOS_PER_USER} generated photos allowed. Delete some goals to generate new ones.` },
        { status: 400 }
      );
    }
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
