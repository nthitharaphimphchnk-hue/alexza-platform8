/**
 * Admin Monitoring API - real-time operational metrics after launch.
 * GET /api/admin/metrics
 * Requires x-admin-key header (ADMIN_API_KEY).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getDb } from "./db";
import { ensureUsageIndexes } from "./usage";
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

export const adminMonitoringRouter = Router();

adminMonitoringRouter.get("/admin/metrics", requireAdminKey, async (_req, res, next) => {
  try {
    await ensureUsageIndexes();
    const db = await getDb();

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      activeUserIds,
      requestsLastMinute,
      runsLastMinute,
      errorsLastHour,
      slowRequestsLast5m,
      webhookFailuresLastHour,
      totalUsers,
      totalProjects,
      requestsSeries,
      runsSeries,
      errorsSeries,
    ] = await Promise.all([
      db
        .collection("usage_logs")
        .distinct("ownerUserId", { createdAt: { $gte: fiveMinutesAgo, $lte: now } }) as Promise<
        unknown[]
      >,
      db
        .collection("usage_logs")
        .countDocuments({ createdAt: { $gte: oneMinuteAgo, $lte: now } }),
      db
        .collection("run_logs")
        .countDocuments({ createdAt: { $gte: oneMinuteAgo, $lte: now } }),
      db
        .collection("errors")
        .countDocuments({ createdAt: { $gte: oneHourAgo, $lte: now } })
        .catch(() => 0),
      db
        .collection("usage_logs")
        .countDocuments({
          createdAt: { $gte: fiveMinutesAgo, $lte: now },
          latencyMs: { $gte: 2000 },
        })
        .catch(() => 0),
      db
        .collection("webhook_deliveries")
        .countDocuments({
          status: "failed",
          updatedAt: { $gte: oneHourAgo, $lte: now },
        })
        .catch(() => 0),
      db.collection("users").countDocuments(),
      db.collection("projects").countDocuments(),
      db
        .collection("usage_logs")
        .aggregate<{ ts: Date; count: number }>([
          { $match: { createdAt: { $gte: oneHourAgo, $lte: now } } },
          {
            $group: {
              _id: {
                $toDate: {
                  $subtract: [
                    { $toLong: "$createdAt" },
                    { $mod: [{ $toLong: "$createdAt" }, 60 * 1000] },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, ts: "$_id", count: 1 } },
        ])
        .toArray()
        .catch(() => []),
      db
        .collection("run_logs")
        .aggregate<{ ts: Date; count: number }>([
          { $match: { createdAt: { $gte: oneHourAgo, $lte: now } } },
          {
            $group: {
              _id: {
                $toDate: {
                  $subtract: [
                    { $toLong: "$createdAt" },
                    { $mod: [{ $toLong: "$createdAt" }, 60 * 1000] },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, ts: "$_id", count: 1 } },
        ])
        .toArray()
        .catch(() => []),
      db
        .collection("errors")
        .aggregate<{ ts: Date; count: number }>([
          { $match: { createdAt: { $gte: oneHourAgo, $lte: now } } },
          {
            $group: {
              _id: {
                $toDate: {
                  $subtract: [
                    { $toLong: "$createdAt" },
                    { $mod: [{ $toLong: "$createdAt" }, 60 * 1000] },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, ts: "$_id", count: 1 } },
        ])
        .toArray()
        .catch(() => []),
    ]);

    const activeUsers = Array.isArray(activeUserIds)
      ? new Set(activeUserIds.map((id) => String(id))).size
      : 0;

    return res.json({
      ok: true,
      activeUsers,
      requestsPerMinute: requestsLastMinute,
      aiRunsPerMinute: runsLastMinute,
      errorsLastHour,
      slowRequests: slowRequestsLast5m,
      webhookFailures: webhookFailuresLastHour,
      totalUsers,
      totalProjects,
      series: {
        requests: requestsSeries.map((p) => ({
          timestamp: p.ts,
          count: p.count,
        })),
        aiRuns: runsSeries.map((p) => ({
          timestamp: p.ts,
          count: p.count,
        })),
        errors: errorsSeries.map((p) => ({
          timestamp: p.ts,
          count: p.count,
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AdminMonitoring] metrics error");
    return next(error);
  }
});

