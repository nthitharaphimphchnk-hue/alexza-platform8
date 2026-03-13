/**
 * Admin Soft Launch Metrics API - focused early launch dashboard.
 * GET /api/admin/soft-launch-metrics
 * Requires x-admin-key header (ADMIN_API_KEY).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { ObjectId } from "mongodb";
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
    return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin key required" });
  }
  next();
}

export const adminSoftLaunchRouter = Router();

function resolveWindow(raw: unknown): { label: string; from: Date; to: Date } {
  const now = new Date();
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "7d") {
    return { label: "7d", from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  }
  if (value === "30d") {
    return { label: "30d", from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
  }
  return { label: "24h", from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
}

adminSoftLaunchRouter.get(
  "/admin/soft-launch-metrics",
  requireAdminKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDb();
      const window = resolveWindow(req.query.window);

      const { from, to } = window;

      const [
        newSignups,
        newSignups7d,
        newWorkspaces,
        newProjects,
        firstSuccessfulRuns,
        totalApiRuns,
        feedbackCount,
        criticalFeedbackCount,
        webhookFailures,
        errorCount,
        signupsSeries,
        runsSeries,
        feedbackSeries,
      ] = await Promise.all([
        db.collection("users").countDocuments({ createdAt: { $gte: from, $lte: to } }),
        db
          .collection("users")
          .countDocuments({
            createdAt: {
              $gte: new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000),
              $lte: to,
            },
          }),
        db.collection("workspaces").countDocuments({ createdAt: { $gte: from, $lte: to } }),
        db.collection("projects").countDocuments({ createdAt: { $gte: from, $lte: to } }),
        db
          .collection("usage_logs")
          .distinct("ownerUserId", {
            status: "success",
            createdAt: { $gte: from, $lte: to },
          })
          .then((ids) => new Set(ids.map((id) => String(id))).size)
          .catch(() => 0),
        db
          .collection("usage_logs")
          .countDocuments({ createdAt: { $gte: from, $lte: to } })
          .catch(() => 0),
        db
          .collection("feedback")
          .countDocuments({ createdAt: { $gte: from, $lte: to } })
          .catch(() => 0),
        db
          .collection("feedback")
          .countDocuments({
            createdAt: { $gte: from, $lte: to },
            priority: "critical",
          })
          .catch(() => 0),
        db
          .collection("webhook_deliveries")
          .countDocuments({
            status: "failed",
            updatedAt: { $gte: from, $lte: to },
          })
          .catch(() => 0),
        db
          .collection("errors")
          .countDocuments({ createdAt: { $gte: from, $lte: to } })
          .catch(() => 0),
        db
          .collection("users")
          .aggregate<{ ts: Date; count: number }>([
            { $match: { createdAt: { $gte: from, $lte: to } } },
            {
              $group: {
                _id: {
                  $toDate: {
                    $subtract: [
                      { $toLong: "$createdAt" },
                      { $mod: [{ $toLong: "$createdAt" }, 60 * 60 * 1000] },
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
          .collection("usage_logs")
          .aggregate<{ ts: Date; count: number }>([
            { $match: { createdAt: { $gte: from, $lte: to } } },
            {
              $group: {
                _id: {
                  $toDate: {
                    $subtract: [
                      { $toLong: "$createdAt" },
                      { $mod: [{ $toLong: "$createdAt" }, 60 * 60 * 1000] },
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
          .collection("feedback")
          .aggregate<{ ts: Date; count: number }>([
            { $match: { createdAt: { $gte: from, $lte: to } } },
            {
              $group: {
                _id: {
                  $toDate: {
                    $subtract: [
                      { $toLong: "$createdAt" },
                      { $mod: [{ $toLong: "$createdAt" }, 60 * 60 * 1000] },
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

      return res.json({
        ok: true,
        window: window.label,
        range: { from, to },
        metrics: {
          newSignups,
          newSignups7d,
          newWorkspaces,
          newProjects,
          firstSuccessfulRuns,
          totalApiRuns,
          feedbackCount,
          criticalFeedbackCount,
          webhookFailures,
          errorCount,
        },
        series: {
          signups: signupsSeries.map((p) => ({ timestamp: p.ts, count: p.count })),
          runs: runsSeries.map((p) => ({ timestamp: p.ts, count: p.count })),
          feedback: feedbackSeries.map((p) => ({ timestamp: p.ts, count: p.count })),
        },
      });
    } catch (error) {
      logger.error({ err: error }, "[AdminSoftLaunch] metrics error");
      return next(error);
    }
  }
);

