import { NextResponse } from "next/server";
import { getUserId, getVisitorId } from "@/lib/auth";
import { migrateProfileToUser } from "@/db/queries";

export async function POST() {
  const userId = await getUserId();
  const visitorId = await getVisitorId();

  if (!userId) {
    return NextResponse.json(
      { error: "Must be authenticated to migrate" },
      { status: 401 }
    );
  }

  if (!visitorId) {
    return NextResponse.json(
      { error: "Missing visitor ID for migration" },
      { status: 400 }
    );
  }

  const profile = await migrateProfileToUser(visitorId, userId);

  return NextResponse.json({
    success: true,
    migrated: !!profile,
    profileId: profile?.id,
  });
}
