import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { getUserId } from "@/lib/auth";
import {
  addCredits,
  LIMITS,
  getOrCreateProfile,
  getCreditsForProfile,
  getUserLimits,
  hasPurchaseSince,
} from "@/db/queries";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkoutId = searchParams.get("checkout_id");
  const sinceParam = searchParams.get("since");
  const useFallback = searchParams.get("fallback") === "1";

  if (!checkoutId) {
    return NextResponse.json({ error: "Missing checkout_id" }, { status: 400 });
  }

  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const profile = await getOrCreateProfile({ userId });

    // DB-first: check if webhook has already processed the payment
    if (sinceParam) {
      const since = new Date(sinceParam);
      const { hasPurchase, credits } = await hasPurchaseSince(profile.id, since);

      if (hasPurchase) {
        const limits = getUserLimits(credits);
        return NextResponse.json({
          verified: true,
          credits,
          isPaid: limits.isPaid,
          maxPhotos: limits.maxPhotos,
          maxBoards: limits.maxBoards,
        });
      }

      // No recent purchase found yet - if not using fallback, return pending
      if (!useFallback) {
        const currentCredits = await getCreditsForProfile(profile.id);
        return NextResponse.json({
          verified: false,
          status: "pending",
          credits: currentCredits,
          isPaid: currentCredits > 0,
        });
      }
    }

    // Fallback: call Polar API directly
    const checkout = await polar.checkouts.get({ id: checkoutId });

    if (checkout.status !== "succeeded") {
      const currentCredits = await getCreditsForProfile(profile.id);
      return NextResponse.json({
        verified: false,
        status: checkout.status,
        credits: currentCredits,
        isPaid: currentCredits > 0,
      });
    }

    const customerExternalId = checkout.customerExternalId;
    if (customerExternalId !== userId) {
      return NextResponse.json(
        { error: "Checkout does not belong to this user" },
        { status: 403 },
      );
    }

    // Use the order ID from the checkout for idempotent addCredits (matches webhook)
    const orderId = (checkout as any).order?.id ?? checkoutId;

    await addCredits(
      profile.id,
      LIMITS.PAID_CREDITS_PER_PURCHASE,
      orderId,
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
    // On error, still return current credits state
    try {
      const profile = await getOrCreateProfile({ userId });
      const credits = await getCreditsForProfile(profile.id);
      return NextResponse.json({
        verified: false,
        status: "error",
        credits,
        isPaid: credits > 0,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to verify checkout" },
        { status: 500 },
      );
    }
  }
}
