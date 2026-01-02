import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateImageWithUser } from "@/lib/fal";
import { validateRequest } from "@/lib/auth";
import {
  updateGoal,
  countGeneratedPhotosForProfile,
  getUserLimits,
  deductCredit,
  LIMITS,
  getProfileByIdentifier,
  getCreditsForProfile,
  incrementFreeImagesUsed,
} from "@/db/queries";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { success, identifier, error, remaining } =
    await validateRequest("image-gen");

  if (!success || !identifier) {
    return NextResponse.json(
      { error: error || "Authentication required", remaining },
      { status: identifier ? 429 : 401 },
    );
  }

  const { userImageUrl, goalId, goalPrompt } = await request.json();

  if (!userImageUrl || !goalId || !goalPrompt) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const existingGoal = await db.query.goals.findFirst({
    where: eq(goals.id, goalId),
    with: { board: { with: { profile: true } } },
  });

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const profile = await getProfileByIdentifier(identifier);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isOwner = existingGoal.board.profileId === profile.id;

  if (!isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const isRegeneration = !!existingGoal.generatedImageUrl;
  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);

  if (!isRegeneration) {
    if (limits.isPaid) {
      if (credits <= 0) {
        return NextResponse.json(
          {
            error:
              "No credits remaining. Purchase more to continue generating images.",
            requiresUpgrade: true,
            credits: 0,
          },
          { status: 400 },
        );
      }
    } else {
      const photoCount = await countGeneratedPhotosForProfile(profile.id);
      if (photoCount >= LIMITS.FREE_MAX_PHOTOS) {
        return NextResponse.json(
          {
            error: `Free limit of ${LIMITS.FREE_MAX_PHOTOS} image${LIMITS.FREE_MAX_PHOTOS === 1 ? "" : "s"} reached. Purchase credits for more.`,
            requiresUpgrade: true,
          },
          { status: 400 },
        );
      }
    }
  }

  await updateGoal(goalId, { status: "generating" });

  try {
    const generatedUrl = await generateImageWithUser(userImageUrl, goalPrompt);

    const response = await fetch(generatedUrl);
    const imageBuffer = await response.arrayBuffer();

    const blob = await put(`goal-${goalId}-${Date.now()}.png`, imageBuffer, {
      access: "public",
      contentType: "image/png",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await updateGoal(goalId, {
      generatedImageUrl: blob.url,
      status: "completed",
    });

    let newCredits = credits;
    if (!isRegeneration) {
      if (limits.isPaid) {
        await deductCredit(profile.id);
        newCredits = credits - 1;
      } else {
        await incrementFreeImagesUsed(profile.id);
      }
    }

    return NextResponse.json({
      goalId,
      imageUrl: blob.url,
      remaining,
      credits: newCredits,
    });
  } catch (err) {
    await updateGoal(goalId, { status: "failed" });
    throw err;
  }
}
