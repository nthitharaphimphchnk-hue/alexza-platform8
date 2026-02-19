import type { NextFunction, Request, Response } from "express";
import { RATE_LIMIT_REQUESTS_PER_MINUTE } from "../config";

interface RateWindow {
  windowStartMs: number;
  count: number;
}

const WINDOW_MS = 60_000;
const windows = new Map<string, RateWindow>();

function tooManyRequests(res: Response, retryAfterSeconds: number) {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    ok: false,
    error: "RATE_LIMITED",
    message: "Too many requests. Try again later.",
    details: {
      retryAfterSeconds,
      limit: RATE_LIMIT_REQUESTS_PER_MINUTE,
      windowSeconds: 60,
    },
  });
}

export function rateLimitByApiKey(req: Request, res: Response, next: NextFunction) {
  const keyId = req.apiKey?.id;
  if (!keyId) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const now = Date.now();
  const current = windows.get(keyId);
  if (!current || now - current.windowStartMs >= WINDOW_MS) {
    windows.set(keyId, { windowStartMs: now, count: 1 });
    return next();
  }

  if (current.count >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.windowStartMs + WINDOW_MS - now) / 1000));
    return tooManyRequests(res, retryAfterSeconds);
  }

  current.count += 1;
  windows.set(keyId, current);
  return next();
}
