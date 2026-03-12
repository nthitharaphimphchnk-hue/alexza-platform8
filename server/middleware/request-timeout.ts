import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../utils/logger";
import { REQUEST_TIMEOUT_MS as DEFAULT_REQUEST_TIMEOUT_MS } from "../config";

type TimeoutKind = "default" | "ai_run" | "webhook" | "workflow_step";

export interface TimeoutRequest extends Request {
  /** Set by middleware when the HTTP response has been timed out server-side. */
  timedOut?: boolean;
}

/**
 * Normalize timeout value from env or override.
 */
function resolveTimeoutMs(kind: TimeoutKind, overrideMs?: number): number {
  if (typeof overrideMs === "number" && overrideMs > 0) {
    return overrideMs;
  }
  // For now all kinds use the same HTTP guard window; more specific
  // limits are enforced deeper in the stack (providers, webhooks, workflows).
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

/**
 * Express middleware factory to guard HTTP requests with a hard timeout.
 *
 * - Sends 504 with a structured JSON error when the limit is exceeded.
 * - Marks `req.timedOut = true` so downstream code can bail early.
 * - Logs with pino and captures a breadcrumb in Sentry.
 *
 * NOTE: This does not forcibly kill ongoing DB/AI work, but it ensures
 * clients receive a timely response and prevents hung HTTP connections.
 */
export function requestTimeout(kind: TimeoutKind = "default", overrideMs?: number) {
  const timeoutMs = resolveTimeoutMs(kind, overrideMs);

  return (req: TimeoutRequest, res: Response, next: NextFunction) => {
    // Only guard API/runtime endpoints.
    const path = req.path ?? req.url ?? "";
    if (!path.startsWith("/api") && !path.startsWith("/v1")) {
      return next();
    }

    const method = req.method ?? "UNKNOWN";
    const requestId = (req as Request & { requestId?: string }).requestId ?? "unknown";
    const startedAt = Date.now();

    let finished = false;

    const clear = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      if (res.headersSent) {
        return;
      }
      req.timedOut = true;
      const latencyMs = Date.now() - startedAt;

      const errorCode = "request_timeout";
      const message = "The request took too long to complete.";

      logger.warn(
        {
          requestId,
          route: `${method} ${path}`,
          latencyMs,
          timeoutMs,
          kind,
          statusCode: 504,
          error: errorCode,
        },
        "[Timeout] HTTP request timed out"
      );

      Sentry.addBreadcrumb({
        category: "http.timeout",
        message: `Request timeout ${method} ${path}`,
        data: { requestId, latencyMs, timeoutMs, kind },
        level: "error",
      });

      Sentry.captureException(new Error(`HTTP request timeout (${kind})`), {
        tags: {
          timeout_kind: kind,
        },
        extra: {
          requestId,
          route: `${method} ${path}`,
          latencyMs,
          timeoutMs,
        },
      });

      res.status(504).json({
        error: errorCode,
        message,
      });
    }, timeoutMs);

    res.on("finish", clear);
    res.on("close", clear);

    next();
  };
}

