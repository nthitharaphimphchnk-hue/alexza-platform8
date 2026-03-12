/**
 * Admin Launch Dashboard API - soft launch monitoring.
 * Requires x-admin-key header (same as adminAnalytics).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getDb } from "./db";
import { logger } from "./utils/logger";

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

export const adminLaunchRouter = Router();

adminLaunchRouter.get("/admin/launch", requireAdminKey, async (_req, res, next) => {
  try {
    const db = await getDb();
    const now = new Date();
    const from24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers24h,
      requestVolume24h,
      errorCount24h,
      webhookFailures24h,
      billingEvents24h,
      featuredTemplates,
      featuredAgents,
      featuredWorkflows,
      featuredPacks,
      featuredApps,
      health,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("usage_logs").distinct("ownerUserId", {
        createdAt: { $gte: from24h, $lte: now },
      }) as Promise<unknown[]>,
      db
        .collection("usage_logs")
        .countDocuments({ createdAt: { $gte: from24h, $lte: now } }),
      db
        .collection("errors")
        .countDocuments({ createdAt: { $gte: from24h, $lte: now } })
        .catch(() => 0),
      db
        .collection("webhook_deliveries")
        .countDocuments({ status: "failed", updatedAt: { $gte: from24h, $lte: now } })
        .catch(() => 0),
      db
        .collection("wallet_transactions")
        .countDocuments({ createdAt: { $gte: from24h, $lte: now } })
        .catch(() => 0),
      db
        .collection("action_templates")
        .countDocuments({ visibility: "public", tags: { $in: ["demo", "featured"] } })
        .catch(() => 0),
      db
        .collection("agents")
        .countDocuments({ description: { $regex: "demo", $options: "i" } })
        .catch(() => 0),
      db
        .collection("workflows")
        .countDocuments({ name: { $regex: "demo", $options: "i" } })
        .catch(() => 0),
      db
        .collection("template_packs")
        .countDocuments({ tags: { $in: ["demo", "featured"] } })
        .catch(() => 0),
      db
        .collection("apps")
        .countDocuments({ visibility: "public", tags: { $in: ["demo", "featured"] } })
        .catch(() => 0),
      (async () => {
        try {
          const response = await fetch(
            process.env.READINESS_BASE_URL
              ? `${process.env.READINESS_BASE_URL}/api/health`
              : `${process.env.CLIENT_URL || ""}/api/health`
          );
          return { ok: response.ok, status: response.status };
        } catch {
          return { ok: false, status: 0 };
        }
      })(),
    ]);

    const activeUsersCount = Array.isArray(activeUsers24h)
      ? new Set(activeUsers24h.map((id) => String(id))).size
      : 0;

    const readinessStatus =
      health.ok && health.status === 200 && requestVolume24h > 0 ? "PASS" : "WARN";

    return res.json({
      ok: true,
      readiness: {
        status: readinessStatus,
        healthStatus: health.status,
      },
      totals: {
        users: totalUsers,
        activeUsers24h: activeUsersCount,
        requestVolume24h,
        errorCount24h,
        webhookFailures24h,
        billingEvents24h,
      },
      featured: {
        templates: featuredTemplates,
        agents: featuredAgents,
        workflows: featuredWorkflows,
        packs: featuredPacks,
        apps: featuredApps,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AdminLaunch] error");
    return next(error);
  }
});

