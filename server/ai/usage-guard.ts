import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";

export interface UsageGuardState {
  monthlyUsageLimit: number;
  usageWarningThreshold: number;
}

export interface UsageGuardDecision {
  status: "ok" | "warn" | "block";
  used: number;
  projected: number;
  limit: number;
  warningThreshold: number;
}

function getCurrentMonthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

async function getUserUsageGuardState(userId: ObjectId): Promise<UsageGuardState> {
  const db = await getDb();
  const users = db.collection<{
    monthlyCreditsAllowance?: number;
    monthlyUsageLimit?: number;
    usageWarningThreshold?: number;
  }>("users");
  const user = await users.findOne({ _id: userId });
  if (!user) {
    // Fallback to a very high limit so we never accidentally block.
    return { monthlyUsageLimit: Number.POSITIVE_INFINITY, usageWarningThreshold: Number.POSITIVE_INFINITY };
  }

  const baseAllowance =
    typeof user.monthlyCreditsAllowance === "number" && Number.isFinite(user.monthlyCreditsAllowance)
      ? user.monthlyCreditsAllowance
      : 0;

  const limitRaw =
    typeof user.monthlyUsageLimit === "number" && Number.isFinite(user.monthlyUsageLimit) && user.monthlyUsageLimit > 0
      ? user.monthlyUsageLimit
      : baseAllowance;

  const limit = limitRaw > 0 ? limitRaw : Number.POSITIVE_INFINITY;

  const warningRaw =
    typeof user.usageWarningThreshold === "number" &&
    Number.isFinite(user.usageWarningThreshold) &&
    user.usageWarningThreshold > 0
      ? user.usageWarningThreshold
      : limit * 0.8;

  return {
    monthlyUsageLimit: limit,
    usageWarningThreshold: warningRaw,
  };
}

export async function checkUsageGuard(params: {
  userId: ObjectId;
  estimatedCredits: number;
}): Promise<UsageGuardDecision> {
  const { userId, estimatedCredits } = params;
  const now = new Date();
  const { start, end } = getCurrentMonthRange(now);
  const db = await getDb();

  const state = await getUserUsageGuardState(userId);

  if (!Number.isFinite(state.monthlyUsageLimit)) {
    return {
      status: "ok",
      used: 0,
      projected: estimatedCredits,
      limit: state.monthlyUsageLimit,
      warningThreshold: state.usageWarningThreshold,
    };
  }

  const ledger = db.collection<{
    userId: ObjectId;
    creditsCharged: number;
    createdAt: Date;
  }>("billing_ledger");

  const agg = await ledger
    .aggregate<{ _id: null; total: number }>([
      {
        $match: {
          userId,
          createdAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$creditsCharged" } } },
    ])
    .toArray();

  const used = agg[0]?.total ?? 0;
  const projected = used + estimatedCredits;

  let status: UsageGuardDecision["status"] = "ok";
  if (projected > state.monthlyUsageLimit) {
    status = "block";
  } else if (projected >= state.usageWarningThreshold) {
    status = "warn";
  }

  if (status !== "ok") {
    const payload = {
      userId: userId.toString(),
      used,
      projected,
      limit: state.monthlyUsageLimit,
      warningThreshold: state.usageWarningThreshold,
      status,
    };

    logger.warn(payload, "[UsageGuard] Usage guard threshold reached");

    // Store an event document that can be inspected later or surfaced in UI.
    await db.collection("usage_limit_events").insertOne({
      ...payload,
      createdAt: now,
    });

    if (status === "warn") {
      // Optional: could be extended to send email notifications in the future.
    }
  }

  return {
    status,
    used,
    projected,
    limit: state.monthlyUsageLimit,
    warningThreshold: state.usageWarningThreshold,
  };
}

