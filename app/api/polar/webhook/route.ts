import { Webhooks } from "@polar-sh/nextjs";
import { addCredits, LIMITS, getOrCreateProfile } from "@/db/queries";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async (payload) => {
    const order = payload.data;
    const userId = order.customer?.externalId;

    console.log(`[Webhook] Received order.paid event for order ${order.id}, checkout ${order.checkoutId}`);

    if (!userId) {
      console.error(`[Webhook] No external user ID in order: ${order.id}`);
      return;
    }

    const profile = await getOrCreateProfile({ userId });

    const { alreadyProcessed } = await addCredits(
      profile.id,
      LIMITS.PAID_CREDITS_PER_PURCHASE,
      order.id,
      order.customer?.id,
    );

    if (alreadyProcessed) {
      console.log(`[Webhook] Order already processed: ${order.id}`);
      return;
    }

    console.log(
      `[Webhook] Added ${LIMITS.PAID_CREDITS_PER_PURCHASE} credits to profile ${profile.id} (user ${userId}) for order ${order.id}`,
    );
  },
});
