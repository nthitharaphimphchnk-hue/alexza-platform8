import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../utils/logger";

const SLOW_REQUEST_MS = Number.parseInt(process.env.SLOW_REQUEST_MS ?? "2000", 10) || 2000;

export function slowRequestMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path ?? req.url ?? "unknown";
  if (!path.startsWith("/api") && !path.startsWith("/v1")) {
    return next();
  }
  const start = Date.now();
  const method = req.method ?? "unknown";
  const requestId = (req as Request & { requestId?: string }).requestId ?? "unknown";

  res.on("finish", () => {
    const latencyMs = Date.now() - start;
    if (latencyMs > SLOW_REQUEST_MS) {
      logger.warn(
        { requestId, route: `${method} ${path}`, latencyMs, statusCode: res.statusCode },
        `Slow request: ${method} ${path} took ${latencyMs}ms`
      );
      Sentry.addBreadcrumb({
        category: "http.slow",
        message: `Slow request ${method} ${path}`,
        data: { requestId, latencyMs, statusCode: res.statusCode },
        level: "warning",
      });
      Sentry.setTag("slow_request", "true");
    }
  });

  next();
}
