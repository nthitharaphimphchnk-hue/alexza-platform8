/**
 * Stripe service - wallet credit operations.
 */

import { ObjectId } from "mongodb";
import { getCreditsForUsd } from "../../config/pricing";
import { addCreditsFromStripe } from "../../wallet";

export const MIN_TOPUP_USD = 10;
export const MAX_TOPUP_USD = 500;

/**
 * Convert USD amount to credits using volume discount tier pricing.
 */
export function usdToCredits(amountUsd: number): number {
  return getCreditsForUsd(amountUsd);
}

/**
 * Add credits to user wallet from Stripe payment.
 * Converts amountUsd to credits and records transaction with requestId for idempotency.
 */
export async function addCreditsToWallet(params: {
  userId: ObjectId;
  amountUsd: number;
  requestId: string;
  meta?: Record<string, unknown>;
}): Promise<{ balanceCredits: number; creditsAdded: number }> {
  const credits = usdToCredits(params.amountUsd);
  const result = await addCreditsFromStripe({
    userId: params.userId,
    credits,
    requestId: params.requestId,
    meta: {
      amountUsd: params.amountUsd,
      currency: "usd",
      provider: "stripe",
      ...params.meta,
    },
  });
  return {
    balanceCredits: result.balanceCredits,
    creditsAdded: credits,
  };
}
