/**
 * Stripe Checkout - create session for wallet top-up.
 */

import { getStripe } from "./stripe.client";
import { usdToCredits, MIN_TOPUP_USD, MAX_TOPUP_USD } from "./stripe.service";
import { CREDIT_PRICE } from "../../wallet";
import { logger } from "../../utils/logger";
import { normalizeEnvUrl } from "../../utils/envUrls";

const APP_URL = normalizeEnvUrl(process.env.APP_URL || process.env.CLIENT_URL) || "";

export class StripeCheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: "VALIDATION_ERROR" | "CONFIG_ERROR"
  ) {
    super(message);
    this.name = "StripeCheckoutError";
  }
}

export interface CreateCheckoutSessionParams {
  amountUsd: number;
  userId: string;
}

export interface CreateCheckoutSessionResult {
  url: string | null;
  sessionId: string;
}

/**
 * Create Stripe Checkout session for wallet top-up.
 * Validates amount (min 10, max 500 USD), converts to credits.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const { amountUsd, userId } = params;

  if (!Number.isFinite(amountUsd) || amountUsd < MIN_TOPUP_USD) {
    throw new StripeCheckoutError(
      `Minimum top-up amount is $${MIN_TOPUP_USD}`,
      "VALIDATION_ERROR"
    );
  }
  if (amountUsd > MAX_TOPUP_USD) {
    throw new StripeCheckoutError(
      `Maximum top-up amount is $${MAX_TOPUP_USD}`,
      "VALIDATION_ERROR"
    );
  }

  if (!APP_URL) {
    throw new StripeCheckoutError(
      "APP_URL or CLIENT_URL is required for Stripe redirects",
      "CONFIG_ERROR"
    );
  }

  const stripe = getStripe();
  const amountCents = Math.round(amountUsd * 100);
  const credits = usdToCredits(amountUsd);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "usd",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: "ALEXZA Wallet Top-up",
            description: `${credits.toLocaleString()} credits at $${CREDIT_PRICE}/credit`,
          },
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: false,
    success_url: `${APP_URL}/app/billing/credits?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/app/billing/credits?status=cancel`,
    metadata: {
      userId,
      amountUsd: amountUsd.toFixed(2),
    },
  });

  if (!session.url) {
    logger.warn({ sessionId: session.id }, "[Stripe] Checkout session created but url is null");
  }

  return {
    url: session.url ?? null,
    sessionId: session.id,
  };
}
