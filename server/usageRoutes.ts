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
  status: "success" | "error";
  statusCode: number;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: Date;
  latencyMs: number;
}

interface ProjectDoc {
  ownerUserId: ObjectId;
  name: string;
}

const router = Router();

function parsePeriodToDays(rawPeriod: unknown): number | null {
  if (typeof rawPeriod !== "string") return null;
  const value = rawPeriod.trim().toLowerCase();
  if (value === "7d") return 7;
  if (value === "14d") return 14;
  if (value === "30d") return 30;
  if (value === "90d") return 90;
  return null;
}

function parseDays(query: Record<string, unknown>): number {
  const fromPeriod = parsePeriodToDays(query.period);
  if (fromPeriod !== null) {
    return fromPeriod;
  }
  const parsed = Number.parseInt(String(query.days ?? "7"), 10);
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

function normalizeTokenRow<T extends Record<string, unknown>>(row: T) {
  return {
    inputTokens: toNumber(row.inputTokens),
    outputTokens: toNumber(row.outputTokens),
    totalTokens: toNumber(row.totalTokens),
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

  const [totalsTokensRaw] = await logs
    .aggregate<{
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          inputTokens: { $sum: { $ifNull: ["$inputTokens", 0] } },
          outputTokens: { $sum: { $ifNull: ["$outputTokens", 0] } },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
        },
      },
      { $project: { _id: 0, inputTokens: 1, outputTokens: 1, totalTokens: 1 } },
    ])
    .toArray();

  const byDayTokensRaw = await logs
    .aggregate<{
      date: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
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
          inputTokens: { $sum: { $ifNull: ["$inputTokens", 0] } },
          outputTokens: { $sum: { $ifNull: ["$outputTokens", 0] } },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const byModelRaw = await logs
    .aggregate<{
      model: string;
      calls: number;
      totalTokens: number;
      errors: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$model",
          calls: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalTokens: -1, calls: -1, _id: 1 } },
    ])
    .toArray();

  const byProviderRaw = await logs
    .aggregate<{
      provider: string;
      calls: number;
      totalTokens: number;
      errors: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$provider",
          calls: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
          errors: {
            $sum: {
              $cond: [{ $gte: ["$statusCode", 400] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalTokens: -1, calls: -1, _id: 1 } },
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
    totalsTokens: normalizeTokenRow(totalsTokensRaw ?? {}),
    byDay: byDayRaw.map((row) => ({
      date: row.date || "",
      ...normalizeMetricRow(row),
    })),
    byDayTokens: byDayTokensRaw.map((row) => ({
      date: row.date || "",
      ...normalizeTokenRow(row),
    })),
    byModel: byModelRaw.map((row) => ({
      model: row.model || "",
      calls: toNumber(row.calls),
      totalTokens: toNumber(row.totalTokens),
      errors: toNumber(row.errors),
    })),
    byProvider: byProviderRaw.map((row) => ({
      provider: row.provider || "",
      calls: toNumber(row.calls),
      totalTokens: toNumber(row.totalTokens),
      errors: toNumber(row.errors),
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
    const days = parseDays(req.query as Record<string, unknown>);
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

    const days = parseDays(req.query as Record<string, unknown>);
    const response = await getUsageSummary(req.user._id, days, projectId);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

export { router as usageRouter };
