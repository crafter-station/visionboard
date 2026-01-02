import { Checkout } from "@polar-sh/nextjs";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: `${appUrl}/?checkout_id={CHECKOUT_ID}`,
  server: "production",
});

