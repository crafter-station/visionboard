import { NextResponse } from "next/server";
import { getAuthIdentifier } from "@/lib/auth";
import {
  getProfileByIdentifier,
  getCreditsForProfile,
  getUserLimits,
} from "@/db/queries";

export async function GET() {
  const identifier = await getAuthIdentifier();
  const { userId } = identifier;

  if (!userId) {
    return NextResponse.json({ credits: 0, isPaid: false });
  }

  const profile = await getProfileByIdentifier(identifier);

  if (!profile) {
    return NextResponse.json({ credits: 0, isPaid: false });
  }

  const credits = await getCreditsForProfile(profile.id);
  const limits = getUserLimits(credits);

  return NextResponse.json({
    credits,
    isPaid: limits.isPaid,
    maxPhotos: limits.maxPhotos,
    maxBoards: limits.maxBoards,
  });
}
