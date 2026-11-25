import Stripe from "stripe";

let cachedStripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedStripeClient) return cachedStripeClient;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  cachedStripeClient = new Stripe(stripeSecretKey, {
    appInfo: {
      name: "Panel Profits & CBSE",
      version: "1.0.0",
    },
  });
  return cachedStripeClient;
}
