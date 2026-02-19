import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

export type BillingPlan = "free" | "pro";

export const PLAN_MONTHLY_ALLOWANCE: Record<BillingPlan, number> = {
  free: 1000,
  pro: 10000,
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
  return raw === "pro" ? "pro" : "free";
}

function parsePlan(raw: unknown): BillingPlan | null {
  if (raw === "free" || raw === "pro") return raw;
  return null;
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
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
  const db = await getDb();
  const users = db.collection<UserBillingDoc>("users");
  const now = new Date();
  const docs = await users.find({}, { projection: { billingCycleAnchor: 1 } }).toArray();

  let resetCount = 0;
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
    if (result.modifiedCount > 0) resetCount += 1;
  }

  return { resetCount };
}

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
    const result = await resetMonthlyCredits();
    return res.json({
      ok: true,
      resetCount: result.resetCount,
    });
  } catch (error) {
    return next(error);
  }
});

export { router as billingRouter };
