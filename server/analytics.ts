/**
 * Analytics API - usage overview, projects, actions, daily.
 * Cached 60 seconds. Uses usage_logs, run_logs, wallet_transactions, projects.
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { requireAuthOrApiKey } from "./middleware/requireAuthOrApiKey";
import { requireApiScope } from "./middleware/requireApiScope";
import { ensureUsageIndexes } from "./usage";
import { logger } from "./utils/logger";

const CACHE_TTL_MS = 60_000;
const cache = new Map<
  string,
  { value: unknown; expiresAt: number }
>();

function cacheKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value as T;
}

function setCache(key: string, value: unknown): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const router = Router();

async function getAnalyticsOverview(ownerUserId: ObjectId) {
  await ensureUsageIndexes();
  const db = await getDb();
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [usageTotals, creditsUsed, actionsCount] = await Promise.all([
    db
      .collection("usage_logs")
      .aggregate<{ totalCalls: number; totalTokens: number }>([
        {
          $match: {
            ownerUserId,
            createdAt: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
          },
        },
        { $project: { _id: 0, totalCalls: 1, totalTokens: 1 } },
      ])
      .toArray(),
    db
      .collection("wallet_transactions")
      .aggregate<{ totalCredits: number }>([
        {
          $match: {
            userId: ownerUserId,
            type: "usage",
            createdAt: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$credits" },
          },
        },
        { $project: { _id: 0, totalCredits: 1 } },
      ])
      .toArray(),
    db
      .collection("run_logs")
      .countDocuments({
        ownerUserId,
        createdAt: { $gte: from, $lte: to },
      }),
  ]);

  const usage = usageTotals[0];
  const credits = creditsUsed[0];

  return {
    totalCreditsUsed: credits?.totalCredits ?? 0,
    totalApiCalls: usage?.totalCalls ?? 0,
    totalTokensUsed: usage?.totalTokens ?? 0,
    totalActionsRun: actionsCount ?? 0,
  };
}

async function getAnalyticsProjects(ownerUserId: ObjectId) {
  await ensureUsageIndexes();
  const db = await getDb();
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const byProject = await db
    .collection("usage_logs")
    .aggregate<
      { projectId: ObjectId; calls: number; totalTokens: number }
    >([
      {
        $match: {
          ownerUserId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$projectId",
          calls: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 20 },
      {
        $project: {
          projectId: "$_id",
          calls: 1,
          totalTokens: 1,
          _id: 0,
        },
      },
    ])
    .toArray();

  const projectIds = byProject.map((p) => p.projectId).filter(Boolean);
  const projects = await db
    .collection<{ _id: ObjectId; name: string }>("projects")
    .find({ _id: { $in: projectIds } })
    .toArray();

  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

  return byProject.map((row) => ({
    projectId: row.projectId?.toString() ?? "",
    projectName: projectMap.get(row.projectId?.toString() ?? "") ?? "Unknown",
    totalApiCalls: row.calls,
    totalTokensUsed: row.totalTokens,
  }));
}

async function getAnalyticsActions(ownerUserId: ObjectId) {
  const db = await getDb();
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const byAction = await db
    .collection("run_logs")
    .aggregate<
      { projectId: ObjectId; actionName: string; count: number }
    >([
      {
        $match: {
          ownerUserId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { projectId: "$projectId", actionName: "$actionName" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          projectId: "$_id.projectId",
          actionName: "$_id.actionName",
          count: 1,
          _id: 0,
        },
      },
    ])
    .toArray();

  const projectIds = [...new Set(byAction.map((a) => a.projectId).filter(Boolean))];
  const projects = await db
    .collection<{ _id: ObjectId; name: string }>("projects")
    .find({ _id: { $in: projectIds } })
    .toArray();

  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

  return byAction.map((row) => ({
    projectId: row.projectId?.toString() ?? "",
    projectName: projectMap.get(row.projectId?.toString() ?? "") ?? "Unknown",
    actionName: row.actionName ?? "",
    totalRuns: row.count,
  }));
}

async function getAnalyticsDaily(ownerUserId: ObjectId) {
  await ensureUsageIndexes();
  const db = await getDb();
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const byDay = await db
    .collection("usage_logs")
    .aggregate<
      { date: string; calls: number; totalTokens: number }
    >([
      {
        $match: {
          ownerUserId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
            },
          },
          calls: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          calls: 1,
          totalTokens: 1,
          _id: 0,
        },
      },
    ])
    .toArray();

  const actionsByDay = await db
    .collection("run_logs")
    .aggregate<{ date: string; count: number }>([
      {
        $match: {
          ownerUserId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ])
    .toArray();

  const usageMap = new Map(byDay.map((d) => [d.date, { calls: d.calls, totalTokens: d.totalTokens }]));
  const actionsMap = new Map(actionsByDay.map((d) => [d.date, d.count]));

  const allDates = new Set<string>();
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    allDates.add(d.toISOString().slice(0, 10));
  }

  return Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      totalApiCalls: usageMap.get(date)?.calls ?? 0,
      totalTokensUsed: usageMap.get(date)?.totalTokens ?? 0,
      totalActionsRun: actionsMap.get(date) ?? 0,
    }));
}

router.get("/analytics/overview", requireAuthOrApiKey, requireApiScope("read:analytics"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const key = cacheKey(req.user._id.toString(), "overview");
    let data = getCached<Awaited<ReturnType<typeof getAnalyticsOverview>>>(key);
    if (!data) {
      data = await getAnalyticsOverview(req.user._id);
      setCache(key, data);
      logger.debug({ userId: req.user._id.toString() }, "[Analytics] overview cache miss");
    }
    return res.json({ ok: true, ...data });
  } catch (error) {
    logger.error({ err: error }, "[Analytics] overview error");
    return next(error);
  }
});

router.get("/analytics/projects", requireAuthOrApiKey, requireApiScope("read:analytics"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const key = cacheKey(req.user._id.toString(), "projects");
    let data = getCached<Awaited<ReturnType<typeof getAnalyticsProjects>>>(key);
    if (!data) {
      data = await getAnalyticsProjects(req.user._id);
      setCache(key, data);
      logger.debug({ userId: req.user._id.toString() }, "[Analytics] projects cache miss");
    }
    return res.json({ ok: true, projects: data });
  } catch (error) {
    logger.error({ err: error }, "[Analytics] projects error");
    return next(error);
  }
});

router.get("/analytics/actions", requireAuthOrApiKey, requireApiScope("read:analytics"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const key = cacheKey(req.user._id.toString(), "actions");
    let data = getCached<Awaited<ReturnType<typeof getAnalyticsActions>>>(key);
    if (!data) {
      data = await getAnalyticsActions(req.user._id);
      setCache(key, data);
      logger.debug({ userId: req.user._id.toString() }, "[Analytics] actions cache miss");
    }
    return res.json({ ok: true, actions: data });
  } catch (error) {
    logger.error({ err: error }, "[Analytics] actions error");
    return next(error);
  }
});

router.get("/analytics/daily", requireAuthOrApiKey, requireApiScope("read:analytics"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const key = cacheKey(req.user._id.toString(), "daily");
    let data = getCached<Awaited<ReturnType<typeof getAnalyticsDaily>>>(key);
    if (!data) {
      data = await getAnalyticsDaily(req.user._id);
      setCache(key, data);
      logger.debug({ userId: req.user._id.toString() }, "[Analytics] daily cache miss");
    }
    return res.json({ ok: true, daily: data });
  } catch (error) {
    logger.error({ err: error }, "[Analytics] daily error");
    return next(error);
  }
});

export { router as analyticsRouter };
