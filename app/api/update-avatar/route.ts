import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { removeBackground, pixelateImage } from "@/lib/fal";
import { getProfileByIdentifier, updateProfileAvatar } from "@/db/queries";
import { validateRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, identifier, error, remaining } =
    await validateRequest("bg-removal");

  if (!success || !identifier) {
    return NextResponse.json(
      { error: error || "Authentication required" },
      {
        status: identifier ? 429 : 401,
        headers: remaining
          ? { "X-RateLimit-Remaining": String(remaining) }
          : {},
      },
    );
  }

  const profile = await getProfileByIdentifier(identifier);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { imageUrl } = await request.json();

  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image URL provided" },
      { status: 400 },
    );
  }

  const pixelatedUrl = await pixelateImage(imageUrl);
  const noBgUrl = await removeBackground(pixelatedUrl);

  const response = await fetch(noBgUrl);
  const imageBuffer = await response.arrayBuffer();

  const blob = await put(
    `${profile.id}/avatar-${Date.now()}.png`,
    imageBuffer,
    {
      access: "public",
      contentType: "image/png",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
  );

  await updateProfileAvatar(profile.id, imageUrl, blob.url);

  return NextResponse.json({
    profileId: profile.id,
    originalUrl: imageUrl,
    noBgUrl: blob.url,
  });
}

