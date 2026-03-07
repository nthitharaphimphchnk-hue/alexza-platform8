import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { createCreditTransaction } from "./credits";
import { getBalance } from "./wallet";
import { ensureUsageIndexes } from "./usage";
import { getWorkspaceIdsForUser } from "./workspaces/projectAccess";

export type BillingPlan = "free" | "pro" | "enterprise";

export const PLAN_MONTHLY_ALLOWANCE: Record<BillingPlan, number> = {
  free: 1000,
  pro: 10000,
  enterprise: 100000,
};

interface UserBillingDoc {
  plan?: BillingPlan;
  monthlyCreditsAllowance?: number;
  monthlyCreditsUsed?: number;
  billingCycleAnchor?: Date;
}

interface BillingState {
  plan: BillingPlan;
  monthlyCreditsAllowance: number;
  monthlyCreditsUsed: number;
  billingCycleAnchor: Date;
  nextResetAt: Date;
}

const router = Router();

function normalizePlan(raw: unknown): BillingPlan {
  if (raw === "enterprise") return "enterprise";
  if (raw === "pro") return "pro";
  return "free";
}

function parsePlan(raw: unknown): BillingPlan | null {
  if (raw === "free" || raw === "pro" || raw === "enterprise") return raw;
  return null;
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function subtractMonths(date: Date, months: number): Date {
  const prev = new Date(date);
  prev.setMonth(prev.getMonth() - months);
  return prev;
}

function canUseAdminEndpoint(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  if (!configuredAdminKey || configuredAdminKey.trim().length === 0) return false;
  const rawHeader = req.headers["x-admin-key"];
  const providedAdminKey = typeof rawHeader === "string" ? rawHeader.trim() : "";
  return providedAdminKey.length > 0 && providedAdminKey === configuredAdminKey;
}

export async function runBillingUserMigration() {
  const db = await getDb();
  const users = db.collection<UserBillingDoc>("users");
  const now = new Date();

  await users.updateMany(
    { plan: { $exists: false } },
    {
      $set: {
        plan: "free",
      },
    }
  );

  await users.updateMany(
    { monthlyCreditsAllowance: { $exists: false } },
    {
      $set: {
        monthlyCreditsAllowance: PLAN_MONTHLY_ALLOWANCE.free,
      },
    }
  );

  await users.updateMany(
    { monthlyCreditsUsed: { $exists: false } },
    {
      $set: {
        monthlyCreditsUsed: 0,
      },
    }
  );

  await users.updateMany(
    { billingCycleAnchor: { $exists: false } },
    {
      $set: {
        billingCycleAnchor: now,
      },
    }
  );
}

export async function getUserBillingState(userId: ObjectId): Promise<BillingState> {
  const db = await getDb();
  const users = db.collection<UserBillingDoc>("users");
  const user = await users.findOne({ _id: userId });
  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  let plan = normalizePlan(user.plan);
  let monthlyCreditsAllowance =
    typeof user.monthlyCreditsAllowance === "number" && Number.isFinite(user.monthlyCreditsAllowance)
      ? user.monthlyCreditsAllowance
      : PLAN_MONTHLY_ALLOWANCE[plan];
  let monthlyCreditsUsed =
    typeof user.monthlyCreditsUsed === "number" && Number.isFinite(user.monthlyCreditsUsed)
      ? user.monthlyCreditsUsed
      : 0;
  let billingCycleAnchor =
    user.billingCycleAnchor instanceof Date && !Number.isNaN(user.billingCycleAnchor.getTime())
      ? user.billingCycleAnchor
      : now;

  let nextResetAt = addOneMonth(billingCycleAnchor);
  let updated = false;

  while (now >= nextResetAt) {
    billingCycleAnchor = nextResetAt;
    monthlyCreditsUsed = 0;
    nextResetAt = addOneMonth(billingCycleAnchor);
    updated = true;
  }

  if (
    user.plan !== plan ||
    user.monthlyCreditsAllowance !== monthlyCreditsAllowance ||
    user.monthlyCreditsUsed !== monthlyCreditsUsed ||
    !(user.billingCycleAnchor instanceof Date) ||
    user.billingCycleAnchor.getTime() !== billingCycleAnchor.getTime() ||
    updated
  ) {
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          plan,
          monthlyCreditsAllowance,
          monthlyCreditsUsed,
          billingCycleAnchor,
        },
      }
    );
  }

  return {
    plan,
    monthlyCreditsAllowance,
    monthlyCreditsUsed,
    billingCycleAnchor,
    nextResetAt,
  };
}

export async function resetMonthlyCredits(): Promise<{ resetCount: number }> {
  const result = await runMonthlyResetJob();
  return { resetCount: result.resetCount };
}

async function runMonthlyResetJob(): Promise<{ resetCount: number; ranAt: string }> {
  const db = await getDb();
  const users = db.collection<UserBillingDoc>("users");
  const now = new Date();
  const docs = await users.find({}, { projection: { billingCycleAnchor: 1 } }).toArray();
  const resetUserIds: ObjectId[] = [];

  for (const user of docs) {
    const anchor =
      user.billingCycleAnchor instanceof Date && !Number.isNaN(user.billingCycleAnchor.getTime())
        ? user.billingCycleAnchor
        : now;
    let nextResetAt = addOneMonth(anchor);
    if (now < nextResetAt) continue;

    let newAnchor = anchor;
    while (now >= nextResetAt) {
      newAnchor = nextResetAt;
      nextResetAt = addOneMonth(newAnchor);
    }

    const result = await users.updateOne(
      { _id: user._id },
      { $set: { monthlyCreditsUsed: 0, billingCycleAnchor: newAnchor } }
    );
    if (result.modifiedCount > 0) {
      resetUserIds.push(user._id);
    }
  }

  const ranAt = now.toISOString();
  for (const userId of resetUserIds) {
    await createCreditTransaction({
      userId,
      type: "monthly_reset_bonus",
      amountCredits: 0,
      reason: "Monthly usage quota reset",
      createdAt: now,
    });
  }

  console.log(
    `[BillingReset] Monthly reset ran at ${ranAt}. resetCount=${resetUserIds.length}`
  );

  return { resetCount: resetUserIds.length, ranAt };
}

function parseDays(raw: unknown): 7 | 30 | 90 {
  const n = Number.parseInt(String(raw ?? "30"), 10);
  if (n === 7) return 7;
  if (n === 90) return 90;
  return 30;
}

function extractActionName(endpoint: string): string {
  const match = endpoint.match(/\/run\/([^/]+)$/);
  return match ? match[1] : endpoint || "unknown";
}

router.get("/billing/usage", requireAuth, async (req, res, next) => {
  try {
    await ensureUsageIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const days = parseDays(req.query.days);
    const db = await getDb();
    const projects = db.collection<{ _id: ObjectId; ownerUserId: ObjectId; workspaceId?: ObjectId }>("projects");
    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    const projectFilter =
      workspaceIds.length > 0
        ? { $or: [{ ownerUserId: req.user._id }, { workspaceId: { $in: workspaceIds } }] }
        : { ownerUserId: req.user._id };
    const projectIds = await projects
      .find(projectFilter)
      .project({ _id: 1 })
      .toArray()
      .then((rows) => rows.map((r) => r._id));

    if (projectIds.length === 0) {
      const { balanceCredits } = await getBalance(req.user._id);
      return res.json({
        ok: true,
        totalCreditsUsed: 0,
        creditsRemaining: balanceCredits,
        dailyUsage: [],
        usageByProject: [],
        usageByApiKey: [],
        usageByAction: [],
        range: { days, from: "", to: "" },
      });
    }

    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const logs = db.collection<{
      projectId: ObjectId;
      apiKeyId: ObjectId;
      endpoint: string;
      totalTokens: number | null;
      createdAt: Date;
    }>("usage_logs");

    const [dailyRaw, byProjectRaw, byApiKeyRaw, totalsRaw] = await Promise.all([
      logs
        .aggregate<{ date: string; credits: number }>([
          { $match: { projectId: { $in: projectIds }, createdAt: { $gte: from, $lte: to } } },
          {
            $addFields: {
              credits: {
                $max: [1, { $ceil: { $divide: [{ $ifNull: ["$totalTokens", 0] }, 1000] } }],
              },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              credits: { $sum: "$credits" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", credits: 1, _id: 0 } },
        ])
        .toArray(),
      logs
        .aggregate<{ projectId: ObjectId; credits: number }>([
          { $match: { projectId: { $in: projectIds }, createdAt: { $gte: from, $lte: to } } },
          {
            $addFields: {
              credits: {
                $max: [1, { $ceil: { $divide: [{ $ifNull: ["$totalTokens", 0] }, 1000] } }],
              },
            },
          },
          {
            $group: {
              _id: "$projectId",
              credits: { $sum: "$credits" },
            },
          },
          { $sort: { credits: -1 } },
          { $project: { projectId: "$_id", credits: 1, _id: 0 } },
        ])
        .toArray(),
      logs
        .aggregate<{ apiKeyId: ObjectId; credits: number }>([
          { $match: { projectId: { $in: projectIds }, createdAt: { $gte: from, $lte: to } } },
          {
            $addFields: {
              credits: {
                $max: [1, { $ceil: { $divide: [{ $ifNull: ["$totalTokens", 0] }, 1000] } }],
              },
            },
          },
          {
            $group: {
              _id: "$apiKeyId",
              credits: { $sum: "$credits" },
            },
          },
          { $sort: { credits: -1 } },
          { $limit: 20 },
          { $project: { apiKeyId: "$_id", credits: 1, _id: 0 } },
        ])
        .toArray(),
      logs
        .aggregate<{ totalCredits: number }>([
          { $match: { projectId: { $in: projectIds }, createdAt: { $gte: from, $lte: to } } },
          {
            $addFields: {
              credits: {
                $max: [1, { $ceil: { $divide: [{ $ifNull: ["$totalTokens", 0] }, 1000] } }],
              },
            },
          },
          { $group: { _id: null, totalCredits: { $sum: "$credits" } } },
          { $project: { _id: 0 } },
        ])
        .toArray(),
    ]);

    const totalCreditsUsed = totalsRaw[0]?.totalCredits ?? 0;
    const { balanceCredits } = await getBalance(req.user._id);

    const projectIdsForNames = byProjectRaw.map((r) => r.projectId);
    const projectDocs = await db
      .collection<{ _id: ObjectId; name: string }>("projects")
      .find({ _id: { $in: projectIdsForNames } })
      .toArray();
    const projectMap = new Map(projectDocs.map((p) => [p._id.toString(), p.name]));

    const apiKeyIds = byApiKeyRaw.map((r) => r.apiKeyId);
    const keyDocs = await db
      .collection<{ _id: ObjectId; keyPrefix: string }>("api_keys")
      .find({ _id: { $in: apiKeyIds } })
      .toArray();
    const keyMap = new Map(keyDocs.map((k) => [k._id.toString(), k.keyPrefix]));

    const usageByProject = byProjectRaw.map((r) => ({
      projectId: r.projectId.toString(),
      projectName: projectMap.get(r.projectId.toString()) ?? "Unknown",
      credits: r.credits,
    }));

    const usageByApiKey = byApiKeyRaw.map((r) => ({
      apiKeyId: r.apiKeyId.toString(),
      keyPrefix: keyMap.get(r.apiKeyId.toString()) ?? r.apiKeyId.toString().slice(0, 8),
      credits: r.credits,
    }));

    const byActionFromLogs = await logs
      .find({ projectId: { $in: projectIds }, createdAt: { $gte: from, $lte: to } })
      .project({ endpoint: 1, totalTokens: 1 })
      .toArray();

    const actionCreditsMap = new Map<string, number>();
    for (const row of byActionFromLogs) {
      const actionName = extractActionName(row.endpoint ?? "");
      const credits = Math.max(1, Math.ceil((row.totalTokens ?? 0) / 1000));
      actionCreditsMap.set(actionName, (actionCreditsMap.get(actionName) ?? 0) + credits);
    }
    const usageByAction = Array.from(actionCreditsMap.entries())
      .map(([actionName, credits]) => ({ actionName, credits }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 20);

    return res.json({
      ok: true,
      totalCreditsUsed,
      creditsRemaining: balanceCredits,
      dailyUsage: dailyRaw.map((r) => ({ date: r.date, credits: r.credits })),
      usageByProject,
      usageByApiKey,
      usageByAction,
      range: { days, from: from.toISOString(), to: to.toISOString() },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/billing/plan", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const billing = await getUserBillingState(req.user._id);
    return res.json({
      ok: true,
      plan: billing.plan,
      monthlyCreditsAllowance: billing.monthlyCreditsAllowance,
      monthlyCreditsUsed: billing.monthlyCreditsUsed,
      billingCycleAnchor: billing.billingCycleAnchor,
      nextResetAt: billing.nextResetAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/billing/plan", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const nextPlan = parsePlan((req.body as { plan?: unknown })?.plan);
    if (!nextPlan) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: 'plan must be either "free" or "pro"',
      });
    }
    const allowance = PLAN_MONTHLY_ALLOWANCE[nextPlan];

    const db = await getDb();
    const users = db.collection<UserBillingDoc>("users");
    await users.updateOne(
      { _id: req.user._id },
      {
        $set: {
          plan: nextPlan,
          monthlyCreditsAllowance: allowance,
          // Keep used as-is to prevent resetting usage by plan switching.
        },
      }
    );

    const billing = await getUserBillingState(req.user._id);
    return res.json({
      ok: true,
      plan: billing.plan,
      monthlyCreditsAllowance: billing.monthlyCreditsAllowance,
      monthlyCreditsUsed: billing.monthlyCreditsUsed,
      billingCycleAnchor: billing.billingCycleAnchor,
      nextResetAt: billing.nextResetAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/billing/reset-monthly", async (req, res, next) => {
  try {
    if (!canUseAdminEndpoint(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }
    const result = await runMonthlyResetJob();
    return res.json({
      ok: true,
      resetCount: result.resetCount,
      ranAt: result.ranAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/billing/cron/reset-monthly", async (req, res, next) => {
  try {
    if (!canUseAdminEndpoint(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }
    const result = await runMonthlyResetJob();
    return res.json({
      ok: true,
      resetCount: result.resetCount,
      ranAt: result.ranAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/billing/force-reset-due", async (req, res, next) => {
  try {
    if (!canUseAdminEndpoint(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const body = req.body as { userId?: unknown; monthsAgo?: unknown };
    const rawUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!ObjectId.isValid(rawUserId)) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "userId must be a valid ObjectId",
      });
    }

    const parsedMonthsAgo = Number.parseInt(String(body.monthsAgo ?? "2"), 10);
    const monthsAgo = Number.isFinite(parsedMonthsAgo) ? Math.max(1, Math.min(60, parsedMonthsAgo)) : 2;
    const userId = new ObjectId(rawUserId);
    const now = new Date();
    const billingCycleAnchor = subtractMonths(now, monthsAgo);
    const nextResetAt = addOneMonth(billingCycleAnchor);

    const db = await getDb();
    const users = db.collection<UserBillingDoc>("users");
    const result = await users.updateOne({ _id: userId }, { $set: { billingCycleAnchor } });
    if (result.matchedCount === 0) {
      return res.status(404).json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return res.json({
      ok: true,
      userId: userId.toString(),
      billingCycleAnchor,
      nextResetAt,
    });
  } catch (error) {
    return next(error);
  }
});

export { router as billingRouter };
