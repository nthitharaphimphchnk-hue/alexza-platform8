/**
 * Admin billing analytics - revenue, cost, margin by model/user/day.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { getDb } from "../db";
import { logger } from "../utils/logger";

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

router.get("/admin/billing/analytics", requireAdminKey, async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days), 10) || DEFAULT_DAYS));
    const db = await getDb();
    const col = db.collection("billing_ledger");
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      summary,
      byModel,
      byDay,
      topUsers,
      topProjects,
    ] = await Promise.all([
      col.aggregate<{ totalCredits: number; totalCost: number; totalRevenue: number; totalMargin: number; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$creditsCharged" },
            totalCost: { $sum: "$costUsd" },
            totalRevenue: { $sum: "$revenueUsd" },
            totalMargin: { $sum: "$marginUsd" },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, totalCredits: 1, totalCost: 1, totalRevenue: 1, totalMargin: 1, count: 1 } },
      ]).toArray(),
      col.aggregate<{ model: string; credits: number; cost: number; revenue: number; margin: number; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: "$model",
            credits: { $sum: "$creditsCharged" },
            cost: { $sum: "$costUsd" },
            revenue: { $sum: "$revenueUsd" },
            margin: { $sum: "$marginUsd" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { model: "$_id", credits: 1, cost: 1, revenue: 1, margin: 1, count: 1, _id: 0 } },
      ]).toArray(),
      col.aggregate<{ date: string; credits: number; cost: number; revenue: number; margin: number; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
            credits: { $sum: "$creditsCharged" },
            cost: { $sum: "$costUsd" },
            revenue: { $sum: "$revenueUsd" },
            margin: { $sum: "$marginUsd" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", credits: 1, cost: 1, revenue: 1, margin: 1, count: 1, _id: 0 } },
      ]).toArray(),
      col.aggregate<{ userId: string; credits: number; cost: number; revenue: number; margin: number; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: "$userId",
            credits: { $sum: "$creditsCharged" },
            cost: { $sum: "$costUsd" },
            revenue: { $sum: "$revenueUsd" },
            margin: { $sum: "$marginUsd" },
            count: { $sum: 1 },
          },
        },
        { $sort: { credits: -1 } },
        { $limit: 15 },
        { $project: { userId: { $toString: "$_id" }, credits: 1, cost: 1, revenue: 1, margin: 1, count: 1, _id: 0 } },
      ]).toArray(),
      col.aggregate<{ projectId: string; credits: number; cost: number; revenue: number; margin: number; count: number }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: "$projectId",
            credits: { $sum: "$creditsCharged" },
            cost: { $sum: "$costUsd" },
            revenue: { $sum: "$revenueUsd" },
            margin: { $sum: "$marginUsd" },
            count: { $sum: 1 },
          },
        },
        { $sort: { credits: -1 } },
        { $limit: 15 },
        { $project: { projectId: { $toString: "$_id" }, credits: 1, cost: 1, revenue: 1, margin: 1, count: 1, _id: 0 } },
      ]).toArray(),
    ]);

    const s = summary[0];
    return res.json({
      ok: true,
      summary: {
        totalCredits: s?.totalCredits ?? 0,
        totalCostUsd: s?.totalCost ?? 0,
        totalRevenueUsd: s?.totalRevenue ?? 0,
        totalMarginUsd: s?.totalMargin ?? 0,
        transactionCount: s?.count ?? 0,
      },
      byModel,
      byDay,
      topUsers,
      topProjects,
      periodDays: days,
    });
  } catch (error) {
    logger.error({ err: error }, "[BillingAnalytics] error");
    return next(error);
  }
});

export { router as billingAnalyticsRouter };
