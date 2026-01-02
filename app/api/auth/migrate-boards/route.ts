import { NextResponse } from "next/server";
import { getUserId, getVisitorId } from "@/lib/auth";
import { migrateBoardsToUser } from "@/db/queries";

export async function POST() {
  const userId = await getUserId();
  const visitorId = await getVisitorId();

  if (!userId) {
    return NextResponse.json(
      { error: "Must be authenticated to migrate boards" },
      { status: 401 }
    );
  }

  if (!visitorId) {
    return NextResponse.json(
      { error: "Missing visitor ID for migration" },
      { status: 400 }
    );
  }

  const migratedCount = await migrateBoardsToUser(visitorId, userId);

  return NextResponse.json({
    success: true,
    migratedCount,
  });
}

