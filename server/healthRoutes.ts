/**
 * Health endpoints for status page and monitoring.
 * GET /health, /health/db, /health/stripe, /health/webhooks
 * Each returns: status, latency, timestamp
 */

import { Router, Request, Response } from "express";
import { pingDb } from "./db";
import { getStripe } from "./modules/stripe/stripe.client";
import { logger } from "./utils/logger";

export type HealthStatus = "operational" | "degraded" | "down";

export interface HealthResponse {
  status: HealthStatus;
  latency: number;
  timestamp: string;
  message?: string;
}

function measureLatency(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  return fn().then(() => performance.now() - start);
}

const router = Router();

/** GET /health - Basic API health */
router.get("/health", (_req: Request, res: Response) => {
  const start = performance.now();
  const latency = Math.round(performance.now() - start);
  res.json({
    status: "operational" as HealthStatus,
    latency,
    timestamp: new Date().toISOString(),
  } satisfies HealthResponse);
});

/** GET /health/db - Database connectivity */
router.get("/health/db", async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  try {
    const latency = await measureLatency(async () => {
      await pingDb();
    });
    res.json({
      status: "operational" as HealthStatus,
      latency: Math.round(latency),
      timestamp,
    } satisfies HealthResponse);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.warn({ err: error }, "[Health] DB check failed");
    res.status(500).json({
      status: "down" as HealthStatus,
      latency: 0,
      timestamp,
      message: msg,
    } satisfies HealthResponse);
  }
});

/** GET /health/stripe - Stripe API connectivity */
router.get("/health/stripe", async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return res.json({
      status: "degraded" as HealthStatus,
      latency: 0,
      timestamp,
      message: "Stripe not configured",
    } satisfies HealthResponse);
  }
  try {
    const stripe = getStripe();
    const latency = await measureLatency(async () => {
      await stripe.balance.retrieve();
    });
    res.json({
      status: "operational" as HealthStatus,
      latency: Math.round(latency),
      timestamp,
    } satisfies HealthResponse);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.warn({ err: error }, "[Health] Stripe check failed");
    res.status(500).json({
      status: "down" as HealthStatus,
      latency: 0,
      timestamp,
      message: msg,
    } satisfies HealthResponse);
  }
});

/** GET /health/webhooks - Webhook configuration (Stripe webhook secret) */
router.get("/health/webhooks", (_req: Request, res: Response) => {
  const start = performance.now();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const latency = Math.round(performance.now() - start);
  const status: HealthStatus = webhookSecret ? "operational" : "degraded";
  res.json({
    status,
    latency,
    timestamp: new Date().toISOString(),
    message: webhookSecret ? undefined : "Webhook secret not configured",
  } satisfies HealthResponse);
});

export const healthRouter = router;
