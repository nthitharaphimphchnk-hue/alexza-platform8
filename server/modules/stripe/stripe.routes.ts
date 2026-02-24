/**
 * Stripe routes - checkout and webhook.
 * Mount at /api/billing/stripe
 */

import { Router } from "express";
import express from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { createCheckoutSession, StripeCheckoutError } from "./stripe.checkout";
import { handleStripeWebhook } from "./stripe.webhook";

export const stripeRouter = Router();

/** POST /api/billing/stripe/checkout - create session, returns { url, sessionId } */
stripeRouter.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const body = req.body as { amountUsd?: unknown };
    const rawAmount = typeof body.amountUsd === "number" ? body.amountUsd : Number(body.amountUsd);
    const amountUsd = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) / 100 : 0;

    const result = await createCheckoutSession({
      amountUsd,
      userId: req.user._id.toString(),
    });

    return res.json({ ok: true, url: result.url, sessionId: result.sessionId });
  } catch (err) {
    if (err instanceof StripeCheckoutError) {
      const status = err.code === "CONFIG_ERROR" ? 503 : 400;
      return res.status(status).json({
        ok: false,
        error: err.code,
        message: err.message,
      });
    }
    return next(err);
  }
});

/**
 * POST /api/billing/stripe/webhook - Stripe webhook.
 * Must be mounted with express.raw({ type: "application/json" }) BEFORE express.json().
 * Export handler for use in index.ts.
 */
export function createWebhookRoute() {
  return [
    express.raw({ type: "application/json" }),
    async (req: express.Request, res: express.Response) => {
      await handleStripeWebhook(req, res);
    },
  ];
}
