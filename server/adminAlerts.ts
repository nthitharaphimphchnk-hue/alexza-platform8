/**
 * Admin Alerts API - test and utilities for production alerts.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { logger } from "./utils/logger";
import { getDb } from "./db";

function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.ADMIN_API_KEY?.trim();
  if (!configured) {
    return res
      .status(503)
      .json({ ok: false, error: "ADMIN_NOT_CONFIGURED", message: "Admin API key not configured" });
  }
  const provided =
    typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"].trim() : "";
  if (provided !== configured) {
    return res
      .status(403)
      .json({ ok: false, error: "FORBIDDEN", message: "Admin key required" });
  }
  next();
}

export const adminAlertsRouter = Router();

adminAlertsRouter.post("/admin/alerts/test", requireAdminKey, async (_req, res, next) => {
  try {
    const now = new Date().toISOString();

    const message =
      `[ALEXZA Alerts] Test alert ${now}\n` +
      "This is a test production alert triggered via /api/admin/alerts/test.";

    // Reuse the alert worker's send logic.
    const { default: sendTestAlertImpl } = await import("./alerts/sendTestAlertImpl");
    await sendTestAlertImpl(message);

    logger.info("[Alerts] Test alert sent");
    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "[Alerts] Test alert failed");
    return next(error);
  }
});

