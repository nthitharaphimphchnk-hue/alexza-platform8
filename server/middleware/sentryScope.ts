/**
 * Sets Sentry scope tags for every request.
 * Run after requestIdMiddleware.
 */

import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";

export function sentryScopeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = req.requestId ?? "unknown";
  const route = (req.route?.path ?? req.path) || req.path;
  const method = req.method ?? "unknown";

  Sentry.setTag("requestId", requestId);
  Sentry.setTag("route", route);
  Sentry.setTag("method", method);

  // projectId from path params (e.g. /api/projects/:id) - opaque id, not a secret
  const projectId = req.params?.id;
  if (projectId && typeof projectId === "string" && projectId.trim()) {
    Sentry.setTag("projectId", projectId.trim());
  }

  next();
}
