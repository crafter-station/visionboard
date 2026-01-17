import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { generateImageWithUser } from "@/lib/fal";
import { validateRequest } from "@/lib/auth";
import {
  updateGoal,
  getUserLimits,
  deductCredit,
  addCredit,
  LIMITS,
  getProfileByIdentifier,
  getCreditsForProfile,
  initializeFreeCredits,
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

  // Prevent duplicate FAL requests if goal is already generating
  if (existingGoal.status === "generating") {
    return NextResponse.json(
      { error: "Image generation already in progress" },
      { status: 409 },
    );
  }

  // Initialize free credits if this is a new user
  await initializeFreeCredits(profile.id);

  const isRegeneration = !!existingGoal.generatedImageUrl;
  let credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);

  // For new generations, check and deduct credits
  let creditDeducted = false;

  if (!isRegeneration) {
    // Check if user has enough credits
    if (credits < LIMITS.CREDIT_COST_PER_IMAGE) {
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

    // Deduct credit BEFORE calling FAL to prevent abuse
    const success = await deductCredit(profile.id);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to deduct credit", requiresUpgrade: true },
        { status: 400 },
      );
    }
    creditDeducted = true;
    credits = credits - LIMITS.CREDIT_COST_PER_IMAGE;
  }

  await updateGoal(goalId, { status: "generating" });

  try {
    // Pass scene data to generate more accurate images
    const sceneData = existingGoal.sceneData ?? undefined;
    console.log(`[generate-image] Goal ${goalId}: fetched sceneData:`, sceneData ? JSON.stringify(sceneData) : "undefined");
    const generatedUrl = await generateImageWithUser(userImageUrl, goalPrompt, sceneData);

    const response = await fetch(generatedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image: ${response.status} ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();
    if (imageBuffer.byteLength === 0) {
      throw new Error("Generated image is empty");
    }

    // Use the content type from the response, fallback to png
    const contentType = response.headers.get("content-type") || "image/png";
    const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";

    const blob = await put(`goal-${goalId}-${Date.now()}.${extension}`, imageBuffer, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await updateGoal(goalId, {
      generatedImageUrl: blob.url,
      status: "completed",
    });

    // Fetch current credits after generation completes to avoid returning stale values
    // when multiple images are generated in parallel
    const currentCredits = await getCreditsForProfile(profile.id);

    return NextResponse.json({
      goalId,
      imageUrl: blob.url,
      remaining,
      credits: currentCredits,
    });
  } catch (err) {
    console.error(`[generate-image] Error for goal ${goalId}:`, err);
    await updateGoal(goalId, { status: "failed" });

    // Refund credit if FAL generation failed
    if (creditDeducted) {
      await addCredit(profile.id);
      console.log(`[generate-image] Refunded credit for failed goal ${goalId}`);
    }

    throw err;
  }
}
