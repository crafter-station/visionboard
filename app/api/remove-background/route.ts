import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { removeBackground } from "@/lib/fal";
import { createVisionBoard } from "@/db/queries";
import { validateRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, visitorId, error, remaining } = await validateRequest("bg-removal");

  if (!success || !visitorId) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: success ? 400 : 429, headers: remaining ? { "X-RateLimit-Remaining": String(remaining) } : {} }
    );
  }

  const { imageUrl } = await request.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
  }

  const noBgUrl = await removeBackground(imageUrl);

  const response = await fetch(noBgUrl);
  const imageBuffer = await response.arrayBuffer();

  const blob = await put(`no-bg-${Date.now()}.png`, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const board = await createVisionBoard({
    visitorId,
    userPhotoUrl: imageUrl,
    userPhotoNoBgUrl: blob.url,
  });

  return NextResponse.json({
    boardId: board.id,
    originalUrl: imageUrl,
    noBgUrl: blob.url,
  });
}
