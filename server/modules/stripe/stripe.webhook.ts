/**
 * Stripe webhook handler - signature verification, idempotency.
 * Must be mounted with express.raw({ type: "application/json" }).
 */

import type { Request, Response } from "express";
import type Stripe from "stripe";
import { getStripe } from "./stripe.client";
import { addCreditsToWallet } from "./stripe.service";
import { getDb } from "../../db";
import { logger } from "../../utils/logger";
import { ObjectId } from "mongodb";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const STRIPE_EVENTS_COLLECTION = "stripe_events";

/** Returns true if inserted (new), false if already processed (duplicate) */
async function tryMarkSessionProcessed(sessionId: string): Promise<boolean> {
  const db = await getDb();
  try {
    await db.collection(STRIPE_EVENTS_COLLECTION).insertOne({
      sessionId,
      processedAt: new Date(),
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) return false; // duplicate key
    throw err;
  }
}

/** Ensure stripe_events collection exists with unique index */
let stripeEventsReady: Promise<void> | null = null;
async function ensureStripeEventsCollection(): Promise<void> {
  if (!stripeEventsReady) {
    stripeEventsReady = (async () => {
      const db = await getDb();
      await db.collection(STRIPE_EVENTS_COLLECTION).createIndex({ sessionId: 1 }, { unique: true });
    })();
  }
  await stripeEventsReady;
}

export interface WebhookHandlerOptions {
  rawBody: Buffer;
  signature: string;
}

/**
 * Handle Stripe webhook - verify signature, process checkout.session.completed.
 * Idempotent: duplicate events are ignored.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  if (!STRIPE_WEBHOOK_SECRET) {
    logger.warn("[Stripe] Webhook secret not configured");
    res.status(500).json({
      ok: false,
      error: "STRIPE_WEBHOOK_NOT_CONFIGURED",
      message: "STRIPE_WEBHOOK_SECRET is required. Local: run 'stripe listen --forward-to localhost:3002/api/billing/stripe/webhook'. Production: use signing secret from Stripe Dashboard.",
    });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).json({ ok: false, error: "Missing stripe-signature header" });
    return;
  }

  const rawBody = req.body;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    res.status(400).json({ ok: false, error: "Invalid webhook body" });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    logger.warn({ message: msg }, "[Stripe] Webhook signature verification failed");
    res.status(400).json({
      ok: false,
      error: "WEBHOOK_SIGNATURE_VERIFICATION_FAILED",
      message: "Invalid webhook signature. Ensure STRIPE_WEBHOOK_SECRET matches Stripe CLI output.",
    });
    return;
  }

  if (event.type !== "checkout.session.completed") {
    res.status(200).json({ received: true });
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  await ensureStripeEventsCollection();
  const isNew = await tryMarkSessionProcessed(sessionId);
  if (!isNew) {
    res.status(200).json({ received: true });
    return;
  }

  const amountTotal = session.amount_total;
  const currency = session.currency;
  const metadata = session.metadata;

  if (!amountTotal || currency !== "usd") {
    logger.warn({ sessionId }, "[Stripe] Invalid session: amount_total or currency");
    res.status(200).json({ received: true });
    return;
  }

  const userIdRaw = metadata?.userId;
  if (typeof userIdRaw !== "string" || !ObjectId.isValid(userIdRaw)) {
    logger.warn({ sessionId }, "[Stripe] Invalid metadata userId");
    res.status(200).json({ received: true });
    return;
  }

  const amountUsd = amountTotal / 100;
  const userId = new ObjectId(userIdRaw);

  try {
    await addCreditsToWallet({
      userId,
      amountUsd,
      requestId: sessionId,
    });
    logger.info(
      { sessionId, userId: userIdRaw, amountUsd },
      "[Stripe] Webhook processed"
    );
  } catch (err) {
    logger.error({ err }, "[Stripe] Webhook processing failed");
    const db = await getDb();
    await db.collection(STRIPE_EVENTS_COLLECTION).deleteOne({ sessionId });
    res.status(500).json({ ok: false, error: "WEBHOOK_PROCESSING_FAILED" });
    return;
  }

  res.status(200).json({ received: true });
}
