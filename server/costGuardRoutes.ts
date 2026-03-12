import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { ensureProjectAccess } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";
import type { CostGuardRuleDoc, CostGuardMode } from "./ai/cost-guard";

const router = Router();

async function canManageProject(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const hasAccess = await ensureProjectAccess(projectId, userId);
  if (!hasAccess) return false;
  const db = await getDb();
  const project = await db.collection<{ workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
  if (!project?.workspaceId) return true;
  const role = await getMemberRole(project.workspaceId, userId);
  return !!role && hasPermission(role, "actions:manage");
}

// GET /api/projects/:id/cost-guard
router.get("/projects/:id/cost-guard", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const rawId = req.params.id;
    if (!ObjectId.isValid(rawId)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const projectId = new ObjectId(rawId);

    const canManage = await canManageProject(projectId, req.user._id);
    if (!canManage) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const col = db.collection<CostGuardRuleDoc>("cost_guard_rules");
    const rule = await col.findOne({ scope: "project", projectId });

    if (!rule) {
      return res.json({ ok: true, rule: null });
    }

    return res.json({
      ok: true,
      rule: {
        perRequestCreditLimit: rule.perRequestCreditLimit ?? null,
        dailyCreditBudget: rule.dailyCreditBudget ?? null,
        monthlyCreditBudget: rule.monthlyCreditBudget ?? null,
        allowedModels: rule.allowedModels ?? [],
        fallbackModel: rule.fallbackModel ?? "",
        mode: rule.mode,
      },
    });
  } catch (e) {
    next(e);
  }
});

// PUT /api/projects/:id/cost-guard
router.put("/projects/:id/cost-guard", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const rawId = req.params.id;
    if (!ObjectId.isValid(rawId)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const projectId = new ObjectId(rawId);

    const canManage = await canManageProject(projectId, req.user._id);
    if (!canManage) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as {
      perRequestCreditLimit?: unknown;
      dailyCreditBudget?: unknown;
      monthlyCreditBudget?: unknown;
      allowedModels?: unknown;
      fallbackModel?: unknown;
      mode?: unknown;
    };

    const perRequestCreditLimit =
      typeof body.perRequestCreditLimit === "number" && body.perRequestCreditLimit > 0
        ? body.perRequestCreditLimit
        : undefined;
    const dailyCreditBudget =
      typeof body.dailyCreditBudget === "number" && body.dailyCreditBudget > 0
        ? body.dailyCreditBudget
        : undefined;
    const monthlyCreditBudget =
      typeof body.monthlyCreditBudget === "number" && body.monthlyCreditBudget > 0
        ? body.monthlyCreditBudget
        : undefined;
    const allowedModels =
      Array.isArray(body.allowedModels) && body.allowedModels.length > 0
        ? (body.allowedModels.filter((m) => typeof m === "string") as string[])
        : undefined;
    const fallbackModel = typeof body.fallbackModel === "string" ? body.fallbackModel.trim() || undefined : undefined;

    const modeRaw = typeof body.mode === "string" ? body.mode : "allow";
    const mode: CostGuardMode =
      modeRaw === "warn" || modeRaw === "block" || modeRaw === "fallback" ? modeRaw : "allow";

    const db = await getDb();
    const col = db.collection<CostGuardRuleDoc>("cost_guard_rules");
    const now = new Date();

    await col.updateOne(
      { scope: "project", projectId },
      {
        $set: {
          scope: "project",
          projectId,
          perRequestCreditLimit,
          dailyCreditBudget,
          monthlyCreditBudget,
          allowedModels,
          fallbackModel,
          mode,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export { router as costGuardRouter };

