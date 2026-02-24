/**
 * Stripe client - production-ready singleton.
 * Throws if STRIPE_SECRET_KEY is not configured when getStripe() is called.
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is required. Set it in .env.local or environment. Get keys from https://dashboard.stripe.com/apikeys"
    );
  }
  return key;
}

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getSecretKey(), {
      typescript: true,
    });
  }
  return stripeInstance;
}
