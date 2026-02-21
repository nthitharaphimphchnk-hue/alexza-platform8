/**
 * Per-API-key rate limit for runtime endpoints.
 * Free=30 req/min, Pro=120 req/min (configurable).
 * Requires requireApiKey to run first.
 */

import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  RATE_LIMIT_FREE_PER_MIN,
  RATE_LIMIT_PRO_PER_MIN,
} from "../config";
import { getUserBillingState } from "../billing";

interface RateWindow {
  windowStartMs: number;
  count: number;
}

const WINDOW_MS = 60_000;
const windows = new Map<string, RateWindow>();

function rateLimit429(
  res: Response,
  requestId: string,
  limit: number,
  retryAfterSeconds: number
) {
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", "0");
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(Date.now() / 1000) + retryAfterSeconds));
  res.setHeader("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    ok: false,
    error: { code: "RATE_LIMIT", message: "Too many requests" },
    requestId,
  });
}

export async function rateLimitByApiKey(req: Request, res: Response, next: NextFunction) {
  const keyId = req.apiKey?.id;
  if (!keyId) {
    return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
  }

  let limit = RATE_LIMIT_FREE_PER_MIN;
  try {
    const billing = await getUserBillingState(req.apiKey!.ownerUserId);
    limit = billing.plan === "pro" ? RATE_LIMIT_PRO_PER_MIN : RATE_LIMIT_FREE_PER_MIN;
  } catch {
    // fallback to free limit
  }

  const windowKey = `${keyId}:${limit}`;
  const now = Date.now();
  const current = windows.get(windowKey);

  if (!current || now - current.windowStartMs >= WINDOW_MS) {
    windows.set(windowKey, { windowStartMs: now, count: 1 });
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(limit - 1));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + WINDOW_MS) / 1000)));
    return next();
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.windowStartMs + WINDOW_MS - now) / 1000));
    return rateLimit429(res, randomUUID(), limit, retryAfterSeconds);
  }

  current.count += 1;
  windows.set(windowKey, current);
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(limit - current.count));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil((current.windowStartMs + WINDOW_MS) / 1000)));
  return next();
}
