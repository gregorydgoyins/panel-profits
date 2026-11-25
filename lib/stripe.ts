import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.acacia" as any,
  appInfo: {
    name: "Panel Profits & CBSE",
    version: "1.0.0",
  },
});
