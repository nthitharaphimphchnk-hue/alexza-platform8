/**
 * Plan-based API rate limiting for runtime endpoints.
 *
 * Applies different limits based on billing plan:
 * - Free: 30 req/min (RATE_LIMIT_FREE)
 * - Pro: 120 req/min (RATE_LIMIT_PRO)
 * - Enterprise: 600 req/min (RATE_LIMIT_ENTERPRISE)
 *
 * Requires requireApiKey to run first. Used on:
 * - POST /v1/projects/:projectId/run/:actionName
 * - POST /v1/run
 */

import type { Request, Response } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import {
  RATE_LIMIT_FREE_PER_MIN,
  RATE_LIMIT_PRO_PER_MIN,
  RATE_LIMIT_ENTERPRISE_PER_MIN,
} from "../config";
import { getUserBillingState } from "../billing";
import { logger } from "../utils/logger";

const WINDOW_MS = 60_000;

function getLimitForPlan(plan: string): number {
  switch (plan) {
    case "enterprise":
      return RATE_LIMIT_ENTERPRISE_PER_MIN;
    case "pro":
      return RATE_LIMIT_PRO_PER_MIN;
    default:
      return RATE_LIMIT_FREE_PER_MIN;
  }
}

export const rateLimitByPlan = rateLimit({
  windowMs: WINDOW_MS,
  limit: async (req: Request) => {
    const userId = (req as Request & { apiKey?: { ownerUserId: unknown } }).apiKey?.ownerUserId;
    if (!userId) return RATE_LIMIT_FREE_PER_MIN;
    try {
      const billing = await getUserBillingState(userId as import("mongodb").ObjectId);
      return getLimitForPlan(billing.plan);
    } catch {
      return RATE_LIMIT_FREE_PER_MIN;
    }
  },
  keyGenerator: (req: Request) => {
    const keyId = (req as Request & { apiKey?: { id: string } }).apiKey?.id;
    if (keyId) return keyId;
    const ip = req.ip;
    return ip ? ipKeyGenerator(ip) : "unknown";
  },
  standardHeaders: false,
  legacyHeaders: true,
  message: { error: "rate_limit_exceeded" },
  statusCode: 429,
  handler: (req: Request, res: Response, _next, options) => {
    const keyId = (req as Request & { apiKey?: { id: string } }).apiKey?.id;
    const keyPrefix = (req as Request & { apiKey?: { keyPrefix?: string } }).apiKey?.keyPrefix;
    logger.warn(
      {
        keyId: keyId ?? "unknown",
        keyPrefix: keyPrefix ?? undefined,
        ip: req.ip,
        path: req.path,
      },
      "[RateLimit] rate_limit_exceeded"
    );
    res.status(options.statusCode).json(options.message);
  },
  validate: { xForwardedForHeader: false },
});
