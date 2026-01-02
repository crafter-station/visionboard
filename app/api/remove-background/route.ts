import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { removeBackground, pixelateImage } from "@/lib/fal";
import { createVisionBoard, countBoardsByIdentifier, getUserLimits } from "@/db/queries";
import { validateRequest, isPaidUser } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, userId, visitorId, identifier, error, remaining } = await validateRequest("bg-removal");

  if (!success || (!userId && !visitorId)) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: success ? 400 : 429, headers: remaining ? { "X-RateLimit-Remaining": String(remaining) } : {} }
    );
  }

  const isPaid = await isPaidUser();
  const limits = getUserLimits(isPaid);
  const boardCount = await countBoardsByIdentifier(identifier);

  if (boardCount >= limits.maxBoards) {
    // TODO: Polar - redirect to payment if not paid
    return NextResponse.json(
      { 
        error: `Maximum ${limits.maxBoards} board${limits.maxBoards === 1 ? '' : 's'} allowed. ${!isPaid ? 'Sign up and upgrade for more.' : 'Delete an existing board to create a new one.'}`,
        requiresUpgrade: !isPaid,
      },
      { status: 400 }
    );
  }

  const { imageUrl } = await request.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
  }

  const pixelatedUrl = await pixelateImage(imageUrl);
  const noBgUrl = await removeBackground(pixelatedUrl);

  const response = await fetch(noBgUrl);
  const imageBuffer = await response.arrayBuffer();

  const blob = await put(`no-bg-${Date.now()}.png`, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const board = await createVisionBoard({
    visitorId: userId ? null : visitorId,
    userId: userId ?? undefined,
    userPhotoUrl: imageUrl,
    userPhotoNoBgUrl: blob.url,
  });

  return NextResponse.json({
    boardId: board.id,
    originalUrl: imageUrl,
    noBgUrl: blob.url,
  });
}
