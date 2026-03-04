/**
 * Action Templates - public list, detail, apply
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { ensureProjectAccess } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";
import { logger } from "./utils/logger";
import type { ActionTemplateDoc, TemplateCategory } from "./models/actionTemplate";
import type { ProjectActionDoc } from "./models/types";
import { toActionName, buildActionFromTemplate, ACTION_NAME_REGEX } from "./templates/templateApply";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "./modelRegistry";
import { getUserBillingState } from "./billing";
import { MAX_ACTIONS_PER_PROJECT_FREE } from "./config";

const router = Router();

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

const CATEGORIES: TemplateCategory[] = [
  "summarize",
  "translate",
  "extraction",
  "writing",
  "support",
  "other",
];

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<ActionTemplateDoc>("action_templates");
      await col.createIndex({ visibility: 1, category: 1 });
      await col.createIndex({ visibility: 1, createdAt: -1 });
      await col.createIndex({ tags: 1 });
    })();
  }
  return indexesReady;
}

function toPublicTemplate(doc: ActionTemplateDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    category: doc.category,
    tags: doc.tags ?? [],
    promptTemplate: doc.promptTemplate,
    inputSchema: doc.inputSchema,
    outputSchema: doc.outputSchema,
    createdBy: doc.createdBy,
    visibility: doc.visibility,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// GET /api/templates - list (public + filter)
router.get("/templates", async (req, res, next) => {
  try {
    await ensureIndexes();
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 100);

    const db = await getDb();
    const col = db.collection<ActionTemplateDoc>("action_templates");

    const filter: Record<string, unknown> = { visibility: "public" };
    if (category && CATEGORIES.includes(category as TemplateCategory)) {
      filter.category = category;
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [q] } },
      ];
    }

    const rows = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return res.json({
      ok: true,
      templates: rows.map(toPublicTemplate),
    });
  } catch (error) {
    logger.error({ err: error }, "[Templates] list error");
    return next(error);
  }
});

// GET /api/templates/:id - detail
router.get("/templates/:id", async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<ActionTemplateDoc>("action_templates").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (doc.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({ ok: true, template: toPublicTemplate(doc) });
  } catch (error) {
    logger.error({ err: error }, "[Templates] detail error");
    return next(error);
  }
});

async function canManageActions(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const hasAccess = await ensureProjectAccess(projectId, userId);
  if (!hasAccess) return false;
  const db = await getDb();
  const project = await db.collection<{ workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
  if (!project?.workspaceId) return true;
  const role = await getMemberRole(project.workspaceId, userId);
  return !!role && hasPermission(role, "actions:manage");
}

// POST /api/templates/:id/apply - create action in project from template
router.post("/templates/:id/apply", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const templateId = parseObjectId(req.params.id ?? "");
    if (!templateId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { projectId?: string; overrideName?: string };
    const projectId = parseObjectId(String(body.projectId ?? ""));
    if (!projectId) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "projectId is required" });
    }

    const canManage = await canManageActions(projectId, req.user._id);
    if (!canManage) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Project not found" });
    }

    const db = await getDb();
    const template = await db.collection<ActionTemplateDoc>("action_templates").findOne({ _id: templateId });
    if (!template) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Template not found" });
    if (template.visibility !== "public" && template.createdBy !== "system") {
      const ownerId = template.createdBy;
      if (ownerId !== req.user._id.toString()) {
        return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Template not found" });
      }
    }

    const overrideName = typeof body.overrideName === "string" ? body.overrideName.trim() : "";
    const actionName = overrideName
      ? toActionName(overrideName)
      : toActionName(template.name);

    if (!actionName || !ACTION_NAME_REGEX.test(actionName)) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "actionName must be URL-safe: only a-z, 0-9, underscore, hyphen",
      });
    }

    const actionsCol = db.collection<ProjectActionDoc>("project_actions");
    const existing = await actionsCol.findOne({ projectId, actionName });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "CONFLICT",
        message: `Action "${actionName}" already exists in this project`,
      });
    }

    const billing = await getUserBillingState(req.user._id);
    if (billing.plan === "free") {
      const count = await actionsCol.countDocuments({ projectId });
      if (count >= MAX_ACTIONS_PER_PROJECT_FREE) {
        return res.status(403).json({
          ok: false,
          error: "FREE_PLAN_LIMIT",
          message: `Free plan allows up to ${MAX_ACTIONS_PER_PROJECT_FREE} actions per project`,
        });
      }
    }

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const defaultModel = hasOpenRouter ? QUALITY_MODELS[0] : QUALITY_MODELS_OPENAI[0];
    const model = template.defaultModel?.trim() || process.env.EXECUTION_DEFAULT_MODEL || defaultModel;
    const provider = hasOpenRouter ? "openrouter" : "openai";

    const actionDoc = buildActionFromTemplate(
      template,
      actionName,
      req.user._id,
      projectId,
      provider,
      model
    );

    await actionsCol.insertOne(actionDoc);

    logger.info(
      { templateId: templateId.toString(), projectId: projectId.toString(), actionName, userId: req.user._id.toString() },
      "[Templates] applied"
    );

    return res.status(201).json({
      ok: true,
      action: {
        id: actionName,
        actionName,
        description: template.description,
        projectId: projectId.toString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Templates] apply error");
    return next(error);
  }
});

export { router as templatesRouter };
