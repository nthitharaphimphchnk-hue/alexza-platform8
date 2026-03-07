/**
 * Admin Platform Analytics - platform-wide usage and growth metrics.
 * Requires x-admin-key header.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getDb } from "./db";
import { ensureUsageIndexes } from "./usage";
import { logger } from "./utils/logger";

function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.ADMIN_API_KEY?.trim();
  if (!configured) {
    return res.status(503).json({ ok: false, error: "ADMIN_NOT_CONFIGURED", message: "Admin API key not configured" });
  }
  const provided = typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"].trim() : "";
  if (provided !== configured) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin key required" });
  }
  next();
}

const DEFAULT_DAYS = 30;

const router = Router();

router.get("/admin/analytics", requireAdminKey, async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days), 10) || DEFAULT_DAYS));
    await ensureUsageIndexes();
    const db = await getDb();
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUserIds,
      apiRequestsTotal,
      tokenUsageTotal,
      topTemplates,
      topAgents,
      topApps,
      revenueResult,
      dailyRequests,
      dailyTokens,
      dailyNewUsers,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db
        .collection("usage_logs")
        .distinct("ownerUserId", { createdAt: { $gte: from, $lte: to } }) as Promise<unknown[]>,
      db
        .collection("usage_logs")
        .aggregate<{ total: number }>([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          { $count: "total" },
        ])
        .toArray(),
      db
        .collection("usage_logs")
        .aggregate<{ total: number }>([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$totalTokens", 0] } } } },
          { $project: { _id: 0, total: 1 } },
        ])
        .toArray(),
      db
        .collection("marketplace_templates")
        .find({ visibility: "public" })
        .sort({ downloads: -1 })
        .limit(10)
        .project({ name: 1, downloads: 1 })
        .toArray(),
      db
        .collection("agents")
        .find({})
        .sort({ updatedAt: -1 })
        .limit(10)
        .project({ name: 1 })
        .toArray(),
      db
        .collection("apps")
        .find({ visibility: "public" })
        .sort({ downloads: -1 })
        .limit(10)
        .project({ name: 1, downloads: 1 })
        .toArray(),
      db
        .collection("wallet_transactions")
        .aggregate<{ revenue: number }>([
          { $match: { type: "topup", "meta.amountUsd": { $exists: true, $ne: null } } },
          {
            $group: {
              _id: null,
              revenue: {
                $sum: { $convert: { input: "$meta.amountUsd", to: "double", onError: 0, onNull: 0 } },
              },
            },
          },
          { $project: { _id: 0, revenue: 1 } },
        ])
        .toArray(),
      db
        .collection("usage_logs")
        .aggregate<{ date: string; count: number }>([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", count: 1, _id: 0 } },
        ])
        .toArray(),
      db
        .collection("usage_logs")
        .aggregate<{ date: string; tokens: number }>([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
              tokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", tokens: 1, _id: 0 } },
        ])
        .toArray(),
      db
        .collection("users")
        .aggregate<{ date: string; count: number }>([
          { $match: { createdAt: { $exists: true, $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", count: 1, _id: 0 } },
        ])
        .toArray(),
    ]);

    const activeUsers = new Set(activeUserIds.map((id) => String(id))).size;
    const revenue = revenueResult[0]?.revenue ?? 0;

    return res.json({
      ok: true,
      metrics: {
        totalUsers,
        activeUsers,
        apiRequests: apiRequestsTotal[0]?.total ?? 0,
        tokenUsage: tokenUsageTotal[0]?.total ?? 0,
        revenue,
      },
      topTemplates: topTemplates.map((t: { _id?: unknown; name?: string; downloads?: number }) => ({
        name: t.name,
        downloads: t.downloads ?? 0,
      })),
      topAgents: topAgents.map((a: { _id?: unknown; name?: string }) => ({ name: a.name })),
      topApps: topApps.map((a: { _id?: unknown; name?: string; downloads?: number }) => ({
        name: a.name,
        downloads: a.downloads ?? 0,
      })),
      charts: {
        dailyRequests: dailyRequests,
        dailyTokens: dailyTokens,
        dailyNewUsers: dailyNewUsers,
      },
      periodDays: days,
    });
  } catch (error) {
    logger.error({ err: error }, "[AdminAnalytics] error");
    return next(error);
  }
});

export { router as adminAnalyticsRouter };
