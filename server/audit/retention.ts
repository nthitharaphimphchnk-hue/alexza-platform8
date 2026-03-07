/**
 * Audit Log Retention Policy - delete old logs based on billing plan.
 *
 * Retention by plan:
 * - Free: 30 days (configurable via AUDIT_LOG_RETENTION_FREE)
 * - Pro: 90 days (AUDIT_LOG_RETENTION_PRO)
 * - Enterprise: 365 days (AUDIT_LOG_RETENTION_ENTERPRISE)
 *
 * Runs daily via setInterval or can be triggered via admin cron endpoint.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";
import type { BillingPlan } from "../billing";

const DEFAULT_RETENTION_DAYS: Record<BillingPlan, number> = {
  free: 30,
  pro: 90,
  enterprise: 365,
};

function parseRetentionDays(envKey: string, defaultVal: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === "") return defaultVal;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return defaultVal;
  return Math.min(n, 365 * 10); // Cap at 10 years
}

export function getRetentionDaysForPlan(plan: BillingPlan): number {
  switch (plan) {
    case "enterprise":
      return parseRetentionDays("AUDIT_LOG_RETENTION_ENTERPRISE", DEFAULT_RETENTION_DAYS.enterprise);
    case "pro":
      return parseRetentionDays("AUDIT_LOG_RETENTION_PRO", DEFAULT_RETENTION_DAYS.pro);
    case "free":
    default:
      return parseRetentionDays("AUDIT_LOG_RETENTION_FREE", DEFAULT_RETENTION_DAYS.free);
  }
}

export interface RetentionCleanupResult {
  plan: BillingPlan;
  deletedCount: number;
  cutoffDate: Date;
  userCount: number;
}

export async function runAuditLogRetentionCleanup(): Promise<RetentionCleanupResult[]> {
  const db = await getDb();
  const users = db.collection<{ _id: ObjectId; plan?: string }>("users");
  const auditLogs = db.collection<{ _id: ObjectId; ownerUserId: ObjectId; createdAt: Date }>("audit_logs");

  const plans: BillingPlan[] = ["free", "pro", "enterprise"];
  const results: RetentionCleanupResult[] = [];
  const now = new Date();

  for (const plan of plans) {
    const retentionDays = getRetentionDaysForPlan(plan);
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    cutoffDate.setHours(0, 0, 0, 0);

    const planFilter =
      plan === "free"
        ? { $or: [{ plan: "free" }, { plan: { $exists: false } }, { plan: null }] }
        : { plan };
    const userDocs = await users.find(planFilter).project({ _id: 1 }).toArray();

    const userIds = userDocs.map((u) => u._id);
    if (userIds.length === 0) {
      results.push({ plan, deletedCount: 0, cutoffDate, userCount: 0 });
      continue;
    }

    const deleteResult = await auditLogs.deleteMany({
      ownerUserId: { $in: userIds },
      createdAt: { $lt: cutoffDate },
    });

    const deletedCount = deleteResult.deletedCount ?? 0;
    if (deletedCount > 0) {
      logger.info(
        {
          plan,
          deletedCount,
          cutoffDate: cutoffDate.toISOString(),
          userCount: userIds.length,
        },
        "[Audit Retention] Cleanup completed"
      );
    }

    results.push({
      plan,
      deletedCount,
      cutoffDate,
      userCount: userIds.length,
    });
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
  if (totalDeleted > 0) {
    logger.info({ totalDeleted, results }, "[Audit Retention] Daily cleanup finished");
  }

  return results;
}

const DAILY_MS = 24 * 60 * 60 * 1000;
let retentionInterval: ReturnType<typeof setInterval> | null = null;

export function startAuditRetentionScheduler(): void {
  if (retentionInterval) return;

  const run = async () => {
    try {
      await runAuditLogRetentionCleanup();
    } catch (err) {
      logger.error({ err }, "[Audit Retention] Cleanup failed");
    }
  };

  void run();
  retentionInterval = setInterval(run, DAILY_MS);
  logger.info({ intervalMs: DAILY_MS }, "[Audit Retention] Daily scheduler started");
}

export function stopAuditRetentionScheduler(): void {
  if (retentionInterval) {
    clearInterval(retentionInterval);
    retentionInterval = null;
    logger.info("[Audit Retention] Scheduler stopped");
  }
}
