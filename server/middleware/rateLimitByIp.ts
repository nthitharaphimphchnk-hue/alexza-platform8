/**
 * Per-IP rate limit - safety net for runtime endpoints.
 * Runs before requireApiKey so unauthenticated requests are also limited.
 */

import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { RATE_LIMIT_IP_PER_MIN } from "../config";

interface RateWindow {
  windowStartMs: number;
  count: number;
}

const WINDOW_MS = 60_000;
const windows = new Map<string, RateWindow>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "0.0.0.0";
  }
  return req.socket.remoteAddress ?? "0.0.0.0";
}

function rateLimit429(res: Response, requestId: string, retryAfterSeconds: number) {
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_IP_PER_MIN));
  res.setHeader("X-RateLimit-Remaining", "0");
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(Date.now() / 1000) + retryAfterSeconds));
  res.setHeader("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    ok: false,
    error: { code: "RATE_LIMIT", message: "Too many requests" },
    requestId,
  });
}

export function rateLimitByIp(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const current = windows.get(ip);

  if (!current || now - current.windowStartMs >= WINDOW_MS) {
    windows.set(ip, { windowStartMs: now, count: 1 });
    res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_IP_PER_MIN));
    res.setHeader("X-RateLimit-Remaining", String(RATE_LIMIT_IP_PER_MIN - 1));
    return next();
  }

  if (current.count >= RATE_LIMIT_IP_PER_MIN) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.windowStartMs + WINDOW_MS - now) / 1000));
    return rateLimit429(res, randomUUID(), retryAfterSeconds);
  }

  current.count += 1;
  windows.set(ip, current);
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_IP_PER_MIN));
  res.setHeader("X-RateLimit-Remaining", String(RATE_LIMIT_IP_PER_MIN - current.count));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil((current.windowStartMs + WINDOW_MS) / 1000)));
  return next();
}
