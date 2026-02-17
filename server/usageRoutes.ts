import { Router } from "express";
import { ObjectId, type Filter } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { ensureUsageIndexes } from "./usage";

interface UsageLogDoc {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  endpoint: string;
  statusCode: number;
  createdAt: Date;
  latencyMs: number;
}

interface ProjectDoc {
  ownerUserId: ObjectId;
  name: string;
}

const router = Router();

function parseDays(rawDays: unknown): number {
  const parsed = Number.parseInt(String(rawDays ?? "7"), 10);
  if (Number.isNaN(parsed) || parsed < 1) return 7;
  if (parsed > 90) return 90;
  return parsed;
}

function toNumber(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

function toRounded(value: unknown, digits = 2): number {
  const num = toNumber(value);
  return Number.parseFloat(num.toFixed(digits));
}

function normalizeMetricRow<T extends Record<string, unknown>>(row: T) {
  const calls = toNumber(row.calls);
  const errors = toNumber(row.errors);
  return {
    calls,
    errors,
    avgLatencyMs: toRounded(row.avgLatencyMs),
  };
}

async function getUsageSummary(ownerUserId: ObjectId, days: number, projectId?: ObjectId) {
  await ensureUsageIndexes();
  const db = await getDb();
  const logs = db.collection<UsageLogDoc>("usage_logs");

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const match: Filter<UsageLogDoc> = {
    ownerUserId,
    createdAt: { $gte: from, $lte: to },
  };
  if (projectId) {
    match.projectId = projectId;
  }

  const [totalsRaw] = await logs
    .aggregate<{
      calls: number;
      errors: number;
      avgLatencyMs: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
      { $project: { _id: 0, calls: 1, errors: 1, avgLatencyMs: 1 } },
    ])
    .toArray();

  const totalsCalls = toNumber(totalsRaw?.calls);
  const totalsErrors = toNumber(totalsRaw?.errors);
  const totalsAvgLatency = toRounded(totalsRaw?.avgLatencyMs);
  const totalsErrorRate = totalsCalls > 0 ? toRounded((totalsErrors / totalsCalls) * 100) : 0;

  const byDayRaw = await logs
    .aggregate<{
      date: string;
      calls: number;
      errors: number;
      avgLatencyMs: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
            },
          },
          calls: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const byEndpointRaw = await logs
    .aggregate<{
      endpoint: string;
      calls: number;
      errors: number;
      avgLatencyMs: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$endpoint",
          calls: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
      { $sort: { calls: -1, _id: 1 } },
    ])
    .toArray();

  const byProjectRaw = await logs
    .aggregate<{
      projectId: ObjectId;
      calls: number;
      errors: number;
      avgLatencyMs: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$projectId",
          calls: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
      { $sort: { calls: -1, _id: 1 } },
    ])
    .toArray();

  const topKeysRaw = await logs
    .aggregate<{
      apiKeyId: ObjectId;
      keyPrefix?: string;
      calls: number;
      errors: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$apiKeyId",
          calls: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
        },
      },
      { $sort: { calls: -1, _id: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "api_keys",
          localField: "_id",
          foreignField: "_id",
          as: "apiKey",
        },
      },
      {
        $project: {
          _id: 0,
          apiKeyId: "$_id",
          keyPrefix: {
            $ifNull: [{ $arrayElemAt: ["$apiKey.keyPrefix", 0] }, ""],
          },
          calls: 1,
          errors: 1,
        },
      },
    ])
    .toArray();

  return {
    ok: true as const,
    range: {
      days,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    totals: {
      calls: totalsCalls,
      errors: totalsErrors,
      errorRate: totalsErrorRate,
      avgLatencyMs: totalsAvgLatency,
    },
    byDay: byDayRaw.map((row) => ({
      date: row.date || "",
      ...normalizeMetricRow(row),
    })),
    byEndpoint: byEndpointRaw.map((row) => ({
      endpoint: row.endpoint || "",
      ...normalizeMetricRow(row),
    })),
    byProject: byProjectRaw.map((row) => ({
      projectId: row.projectId?.toString?.() || "",
      ...normalizeMetricRow(row),
    })),
    topKeys: topKeysRaw.map((row) => ({
      apiKeyId: row.apiKeyId?.toString?.() || "",
      keyPrefix: row.keyPrefix || "",
      calls: toNumber(row.calls),
      errors: toNumber(row.errors),
    })),
  };
}

router.get("/usage/summary", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const days = parseDays(req.query.days);
    const response = await getUsageSummary(req.user._id, days);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.get("/projects/:id/usage/summary", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const projectIdRaw = req.params.id;
    if (!ObjectId.isValid(projectIdRaw)) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const projectId = new ObjectId(projectIdRaw);

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const ownedProject = await projects.findOne({
      _id: projectId,
      ownerUserId: req.user._id,
    });
    if (!ownedProject) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const days = parseDays(req.query.days);
    const response = await getUsageSummary(req.user._id, days, projectId);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

export { router as usageRouter };
