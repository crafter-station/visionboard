import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateImageWithUser } from "@/lib/fal";
import { validateRequest, getUserCreditsCount } from "@/lib/auth";
import {
  updateGoal,
  countGeneratedPhotosByIdentifier,
  getUserLimits,
  deductCredit,
  LIMITS,
} from "@/db/queries";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { success, userId, visitorId, identifier, error, remaining } = await validateRequest("image-gen");

  if (!success || (!userId && !visitorId)) {
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

  const boardUserId = existingGoal.board.userId;
  const boardVisitorId = existingGoal.board.visitorId;
  const isOwner = (userId && boardUserId === userId) || (visitorId && boardVisitorId === visitorId);

  if (!isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const isRegeneration = !!existingGoal.generatedImageUrl;
  const credits = userId ? await getUserCreditsCount() : 0;
  const limits = getUserLimits(credits);

  if (!isRegeneration) {
    if (limits.isPaid) {
      if (credits <= 0) {
        return NextResponse.json(
          {
            error: "No credits remaining. Purchase more to continue generating images.",
            requiresUpgrade: true,
            credits: 0,
          },
          { status: 400 }
        );
      }
    } else {
      const photoCount = await countGeneratedPhotosByIdentifier(identifier);
      if (photoCount >= LIMITS.FREE_MAX_PHOTOS) {
        return NextResponse.json(
          {
            error: `Free limit of ${LIMITS.FREE_MAX_PHOTOS} images reached. Sign in and purchase credits for unlimited boards and 50 more images.`,
            requiresUpgrade: true,
          },
          { status: 400 }
        );
      }
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

  let newCredits = credits;
  if (limits.isPaid && !isRegeneration && userId) {
    await deductCredit(userId);
    newCredits = credits - 1;
  }

  return NextResponse.json({
    goalId,
    imageUrl: blob.url,
    remaining,
    credits: newCredits,
  });
}
