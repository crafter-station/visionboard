import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { getUserId } from "@/lib/auth";
import {
  addCredits,
  LIMITS,
  getOrCreateProfile,
  getCreditsForProfile,
  getUserLimits,
  getPurchaseByOrderId,
} from "@/db/queries";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkoutId = searchParams.get("checkout_id");

  if (!checkoutId) {
    return NextResponse.json({ error: "Missing checkout_id" }, { status: 400 });
  }

  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Fast path: check if webhook already processed this payment
    const existingPurchase = await getPurchaseByOrderId(checkoutId);
    if (existingPurchase) {
      const credits = await getCreditsForProfile(existingPurchase.profileId);
      const limits = getUserLimits(credits);
      return NextResponse.json({
        verified: true,
        credits,
        isPaid: limits.isPaid,
        maxPhotos: limits.maxPhotos,
        maxBoards: limits.maxBoards,
      });
    }

    // Slow path: webhook hasn't processed yet, verify with Polar API
    const checkout = await polar.checkouts.get({ id: checkoutId });

    if (checkout.status !== "succeeded") {
      return NextResponse.json({
        verified: false,
        status: checkout.status,
        credits: 0,
        isPaid: false,
      });
    }

    const customerExternalId = checkout.customerExternalId;
    if (customerExternalId !== userId) {
      return NextResponse.json(
        { error: "Checkout does not belong to this user" },
        { status: 403 },
      );
    }

    const profile = await getOrCreateProfile({ userId });

    await addCredits(
      profile.id,
      LIMITS.PAID_CREDITS_PER_PURCHASE,
      checkoutId,
      checkout.customerId ?? undefined,
    );

    const credits = await getCreditsForProfile(profile.id);
    const limits = getUserLimits(credits);

    return NextResponse.json({
      verified: true,
      credits,
      isPaid: limits.isPaid,
      maxPhotos: limits.maxPhotos,
      maxBoards: limits.maxBoards,
    });
  } catch (error) {
    console.error("Error verifying checkout:", error);
    return NextResponse.json(
      { error: "Failed to verify checkout" },
      { status: 500 },
    );
  }
}
