import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { creditsFromTokens } from "../wallet";
import { logger } from "../utils/logger";

export type CostGuardMode = "allow" | "warn" | "block" | "fallback";

export interface CostGuardRuleDoc {
  _id: ObjectId;
  scope: "workspace" | "project" | "action";
  workspaceId?: ObjectId;
  projectId?: ObjectId;
  actionId?: ObjectId;
  perRequestCreditLimit?: number;
  dailyCreditBudget?: number;
  monthlyCreditBudget?: number;
  allowedModels?: string[];
  fallbackModel?: string;
  mode: CostGuardMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostGuardCheckContext {
  workspaceId?: ObjectId | null;
  projectId?: ObjectId | null;
  actionId?: ObjectId | null;
  model: string;
  estimatedCredits: number;
}

export interface CostGuardDecision {
  decision: CostGuardMode;
  reason?: string;
  fallbackModel?: string;
  rule?: {
    scope: CostGuardRuleDoc["scope"];
    perRequestCreditLimit?: number;
    dailyCreditBudget?: number;
    monthlyCreditBudget?: number;
  };
}

async function findApplicableRule(ctx: CostGuardCheckContext): Promise<CostGuardRuleDoc | null> {
  const db = await getDb();
  const col = db.collection<CostGuardRuleDoc>("cost_guard_rules");

  // Most specific first: action → project → workspace
  if (ctx.actionId) {
    const r = await col.findOne({ scope: "action", actionId: ctx.actionId });
    if (r) return r;
  }
  if (ctx.projectId) {
    const r = await col.findOne({ scope: "project", projectId: ctx.projectId });
    if (r) return r;
  }
  if (ctx.workspaceId) {
    const r = await col.findOne({ scope: "workspace", workspaceId: ctx.workspaceId });
    if (r) return r;
  }
  return null;
}

function getDayRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getMonthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

async function getCreditsUsedForScope(
  scope: CostGuardRuleDoc["scope"],
  ids: { workspaceId?: ObjectId | null; projectId?: ObjectId | null; actionId?: ObjectId | null },
  range: { start: Date; end: Date }
): Promise<number> {
  const db = await getDb();
  const ledger = db.collection<{
    projectId: ObjectId;
    actionName: string;
    creditsCharged: number;
    createdAt: Date;
  }>("billing_ledger");

  const match: Record<string, unknown> = {
    createdAt: { $gte: range.start, $lt: range.end },
  };

  if (scope === "project" && ids.projectId) {
    match.projectId = ids.projectId;
  }

  // For workspace-level budgets, we aggregate credits across all projects in that workspace.
  if (scope === "workspace" && ids.workspaceId) {
    const projectsCol = db.collection<{ _id: ObjectId; workspaceId?: ObjectId }>("projects");
    const projects = await projectsCol
      .find({ workspaceId: ids.workspaceId })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    const projectIds = projects.map((p) => p._id);
    if (projectIds.length === 0) return 0;
    match.projectId = { $in: projectIds };
  }

  // For action-level, we approximate by filtering by actionName; we don't store actionId in ledger.
  // We expect actionName to be unique per project.
  if (scope === "action" && ids.actionId) {
    const actionsCol = db.collection<{ _id: ObjectId; projectId: ObjectId; actionName: string }>("project_actions");
    const actionDoc = await actionsCol.findOne({ _id: ids.actionId });
    if (!actionDoc) return 0;
    match.projectId = actionDoc.projectId;
    match.actionName = actionDoc.actionName;
  }

  const res = await ledger
    .aggregate<{ _id: null; total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$creditsCharged" } } },
    ])
    .toArray();

  return res[0]?.total ?? 0;
}

async function maybeLogBudgetThresholdEvent(params: {
  rule: CostGuardRuleDoc;
  scopeIds: { workspaceId?: ObjectId | null; projectId?: ObjectId | null; actionId?: ObjectId | null };
  kind: "daily" | "monthly";
  used: number;
  budget: number;
}): Promise<void> {
  const ratio = params.used / params.budget;
  if (ratio < 0.8) return;

  const level = ratio >= 1 ? "block" : "warn";
  logger[level === "block" ? "warn" : "info"](
    {
      scope: params.rule.scope,
      workspaceId: params.scopeIds.workspaceId?.toString(),
      projectId: params.scopeIds.projectId?.toString(),
      actionId: params.scopeIds.actionId?.toString(),
      kind: params.kind,
      used: params.used,
      budget: params.budget,
      ratio,
    },
    "[CostGuard] Budget threshold reached"
  );

  // Simple event log (can be surfaced in UI later)
  const db = await getDb();
  await db.collection("cost_guard_events").insertOne({
    scope: params.rule.scope,
    workspaceId: params.scopeIds.workspaceId ?? null,
    projectId: params.scopeIds.projectId ?? null,
    actionId: params.scopeIds.actionId ?? null,
    kind: params.kind,
    used: params.used,
    budget: params.budget,
    ratio,
    createdAt: new Date(),
  });
}

export async function checkCostGuard(ctx: CostGuardCheckContext): Promise<CostGuardDecision> {
  const rule = await findApplicableRule(ctx);
  if (!rule) return { decision: "allow" };

  const mode: CostGuardMode = rule.mode ?? "allow";
  const scopeIds = {
    workspaceId: rule.workspaceId ?? ctx.workspaceId ?? null,
    projectId: rule.projectId ?? ctx.projectId ?? null,
    actionId: rule.actionId ?? ctx.actionId ?? null,
  };

  // Allowed models check
  if (rule.allowedModels && rule.allowedModels.length > 0) {
    const allowed = rule.allowedModels.includes(ctx.model);
    if (!allowed) {
      if (mode === "fallback" && rule.fallbackModel) {
        logger.info(
          { ...scopeIds, model: ctx.model, fallbackModel: rule.fallbackModel },
          "[CostGuard] Model not allowed, using fallback"
        );
        return {
          decision: "fallback",
          fallbackModel: rule.fallbackModel,
          rule: {
            scope: rule.scope,
            perRequestCreditLimit: rule.perRequestCreditLimit,
            dailyCreditBudget: rule.dailyCreditBudget,
            monthlyCreditBudget: rule.monthlyCreditBudget,
          },
        };
      }
      const reason = "Model not allowed by cost guard";
      logger.warn({ ...scopeIds, model: ctx.model }, "[CostGuard] Blocked: model not allowed");
      return mode === "warn"
        ? { decision: "warn", reason, rule: { scope: rule.scope } }
        : { decision: "block", reason, rule: { scope: rule.scope } };
    }
  }

  // Per-request credit limit
  if (typeof rule.perRequestCreditLimit === "number" && rule.perRequestCreditLimit > 0) {
    if (ctx.estimatedCredits > rule.perRequestCreditLimit) {
      const reason = `Estimated credits ${ctx.estimatedCredits} exceed per-request limit ${rule.perRequestCreditLimit}`;
      logger.warn({ ...scopeIds, estimatedCredits: ctx.estimatedCredits }, "[CostGuard] Per-request limit exceeded");
      if (mode === "fallback" && rule.fallbackModel) {
        return {
          decision: "fallback",
          fallbackModel: rule.fallbackModel,
          reason,
          rule: {
            scope: rule.scope,
            perRequestCreditLimit: rule.perRequestCreditLimit,
          },
        };
      }
      return mode === "warn"
        ? {
            decision: "warn",
            reason,
            rule: { scope: rule.scope, perRequestCreditLimit: rule.perRequestCreditLimit },
          }
        : {
            decision: "block",
            reason,
            rule: { scope: rule.scope, perRequestCreditLimit: rule.perRequestCreditLimit },
          };
    }
  }

  const now = new Date();

  // Daily budget
  if (typeof rule.dailyCreditBudget === "number" && rule.dailyCreditBudget > 0) {
    const dayRange = getDayRange(now);
    const usedToday = await getCreditsUsedForScope(rule.scope, scopeIds, dayRange);
    const projected = usedToday + ctx.estimatedCredits;

    await maybeLogBudgetThresholdEvent({
      rule,
      scopeIds,
      kind: "daily",
      used: projected,
      budget: rule.dailyCreditBudget,
    });

    if (projected > rule.dailyCreditBudget) {
      const reason = `Daily budget exceeded: ${projected} > ${rule.dailyCreditBudget}`;
      logger.warn(
        { ...scopeIds, usedToday, estimatedCredits: ctx.estimatedCredits },
        "[CostGuard] Daily budget exceeded"
      );
      if (mode === "fallback" && rule.fallbackModel) {
        return {
          decision: "fallback",
          fallbackModel: rule.fallbackModel,
          reason,
          rule: { scope: rule.scope, dailyCreditBudget: rule.dailyCreditBudget },
        };
      }
      return mode === "warn"
        ? {
            decision: "warn",
            reason,
            rule: { scope: rule.scope, dailyCreditBudget: rule.dailyCreditBudget },
          }
        : {
            decision: "block",
            reason,
            rule: { scope: rule.scope, dailyCreditBudget: rule.dailyCreditBudget },
          };
    }
  }

  // Monthly budget
  if (typeof rule.monthlyCreditBudget === "number" && rule.monthlyCreditBudget > 0) {
    const monthRange = getMonthRange(now);
    const usedMonth = await getCreditsUsedForScope(rule.scope, scopeIds, monthRange);
    const projected = usedMonth + ctx.estimatedCredits;

    await maybeLogBudgetThresholdEvent({
      rule,
      scopeIds,
      kind: "monthly",
      used: projected,
      budget: rule.monthlyCreditBudget,
    });

    if (projected > rule.monthlyCreditBudget) {
      const reason = `Monthly budget exceeded: ${projected} > ${rule.monthlyCreditBudget}`;
      logger.warn(
        { ...scopeIds, usedMonth, estimatedCredits: ctx.estimatedCredits },
        "[CostGuard] Monthly budget exceeded"
      );
      if (mode === "fallback" && rule.fallbackModel) {
        return {
          decision: "fallback",
          fallbackModel: rule.fallbackModel,
          reason,
          rule: { scope: rule.scope, monthlyCreditBudget: rule.monthlyCreditBudget },
        };
      }
      return mode === "warn"
        ? {
            decision: "warn",
            reason,
            rule: { scope: rule.scope, monthlyCreditBudget: rule.monthlyCreditBudget },
          }
        : {
            decision: "block",
            reason,
            rule: { scope: rule.scope, monthlyCreditBudget: rule.monthlyCreditBudget },
          };
    }
  }

  return {
    decision: mode === "warn" ? "warn" : "allow",
    rule: {
      scope: rule.scope,
      perRequestCreditLimit: rule.perRequestCreditLimit,
      dailyCreditBudget: rule.dailyCreditBudget,
      monthlyCreditBudget: rule.monthlyCreditBudget,
    },
  };
}

