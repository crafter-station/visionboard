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

  if (!checkoutId) {
    return NextResponse.json({ error: "Missing checkout_id" }, { status: 400 });
  }

  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const profile = await getOrCreateProfile({ userId });

    // DB-first: check if webhook has already processed the payment (fast path)
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
      // If webhook hasn't processed yet, immediately fall through to Polar API
      // instead of waiting for fallback flag (removes 3-second delay)
    }

    // Call Polar API directly to verify checkout status
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

    // Get the order associated with this checkout to ensure consistent order ID
    // This matches what the webhook receives (order.id)
    const ordersResponse = await polar.orders.list({ checkoutId: checkoutId, limit: 1 });
    const orders = ordersResponse.result.items;

    if (!orders || orders.length === 0) {
      console.error("No order found for checkout:", checkoutId);
      const currentCredits = await getCreditsForProfile(profile.id);
      return NextResponse.json({
        verified: false,
        status: "no_order",
        credits: currentCredits,
        isPaid: currentCredits > 0,
      });
    }

    const order = orders[0];
    console.log(`[Verify] Processing order ${order.id} for checkout ${checkoutId}`);

    await addCredits(
      profile.id,
      LIMITS.PAID_CREDITS_PER_PURCHASE,
      order.id,
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
