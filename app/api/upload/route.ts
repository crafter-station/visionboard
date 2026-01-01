import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { validateRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const { success, visitorId, error, remaining } = await validateRequest("upload");

  if (!success || !visitorId) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: success ? 400 : 429, headers: remaining ? { "X-RateLimit-Remaining": String(remaining) } : {} }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, or WebP" }, { status: 400 });
  }

  const filename = `${visitorId}/${uuidv4()}-${file.name}`;
  const blob = await put(filename, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url });
}
