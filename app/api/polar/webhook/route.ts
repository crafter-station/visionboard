import { Webhooks } from "@polar-sh/nextjs";
import { addCredits, LIMITS } from "@/db/queries";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderPaid: async (payload) => {
    const order = payload.data as any;
    const userId = order.customer?.externalId;

    if (!userId) {
      console.error("No external user ID in order:", order.id);
      return;
    }

    const { alreadyProcessed } = await addCredits(
      userId,
      LIMITS.PAID_CREDITS_PER_PURCHASE,
      order.id,
      order.customer?.id
    );

    if (alreadyProcessed) {
      console.log("Order already processed:", order.id);
      return;
    }

    console.log(`Added ${LIMITS.PAID_CREDITS_PER_PURCHASE} credits to user ${userId}`);
  },
});

