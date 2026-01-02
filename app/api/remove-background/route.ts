import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { removeBackground, pixelateImage } from "@/lib/fal";
import { 
  getOrCreateProfile, 
  updateProfileAvatar, 
  createVisionBoard, 
  countBoardsForProfile, 
  getUserLimits,
  getCreditsForProfile,
} from "@/db/queries";
import { validateRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, userId, visitorId, identifier, error, remaining } = await validateRequest("bg-removal");

  if (!success || (!userId && !visitorId)) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: success ? 400 : 429, headers: remaining ? { "X-RateLimit-Remaining": String(remaining) } : {} }
    );
  }

  const profile = await getOrCreateProfile(identifier);
  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);
  const boardCount = await countBoardsForProfile(profile.id);

  if (boardCount >= limits.maxBoards) {
    return NextResponse.json(
      { 
        error: `Maximum ${limits.maxBoards} board${limits.maxBoards === 1 ? '' : 's'} allowed. ${!limits.isPaid ? 'Sign up and upgrade for more.' : 'Delete an existing board to create a new one.'}`,
        requiresUpgrade: !limits.isPaid,
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

  const blob = await put(`${profile.id}/avatar-${Date.now()}.png`, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await updateProfileAvatar(profile.id, imageUrl, blob.url);

  const board = await createVisionBoard(profile.id);

  return NextResponse.json({
    boardId: board.id,
    profileId: profile.id,
    originalUrl: imageUrl,
    noBgUrl: blob.url,
  });
}
