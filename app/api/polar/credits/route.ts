import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getUserCredits, getUserLimits } from "@/db/queries";

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ credits: 0, isPaid: false });
  }

  const credits = await getUserCredits(userId);
  const limits = getUserLimits(credits);

  return NextResponse.json({
    credits,
    isPaid: limits.isPaid,
    maxPhotos: limits.maxPhotos,
    maxBoards: limits.maxBoards,
  });
}

