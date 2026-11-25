import Stripe from "stripe";

export function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

  return new Stripe(stripeSecretKey, {
    appInfo: {
      name: "Panel Profits & CBSE",
      version: "1.0.0",
    },
  });
}

export const stripe = getStripeClient();
