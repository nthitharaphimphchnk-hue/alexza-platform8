/**
 * Template Packs (Starter Packs) - install groups of templates at once
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";
import type { TemplatePackDoc } from "./models/templatePack";
import type { ActionTemplateDoc } from "./models/actionTemplate";
import type { ProjectActionDoc } from "./models/types";
import {
  toActionName,
  buildActionFromTemplate,
  ACTION_NAME_REGEX,
} from "./templates/templateApply";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "./modelRegistry";
import { getUserBillingState } from "./billing";
import { MAX_ACTIONS_PER_PROJECT_FREE } from "./config";
import { ensureProjectAccess } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";

const router = Router();

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

async function canManageActions(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const hasAccess = await ensureProjectAccess(projectId, userId);
  if (!hasAccess) return false;
  const db = await getDb();
  const project = await db.collection<{ workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
  if (!project?.workspaceId) return true;
  const role = await getMemberRole(project.workspaceId, userId);
  return !!role && hasPermission(role, "actions:manage");
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<TemplatePackDoc>("template_packs");
      await col.createIndex({ tags: 1 });
      await col.createIndex({ name: "text", description: "text", tags: "text" });
    })();
  }
  return indexesReady;
}

function toPublicPack(doc: TemplatePackDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    templateCount: doc.templateIds?.length ?? 0,
    tags: doc.tags ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// GET /api/packs - browse packs
router.get("/packs", async (req, res, next) => {
  try {
    await ensureIndexes();

    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const tagsParam = req.query.tags;
    const tagsFilter = Array.isArray(tagsParam)
      ? tagsParam.filter((t): t is string => typeof t === "string")
      : typeof tagsParam === "string"
        ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 100);

    const db = await getDb();
    const col = db.collection<TemplatePackDoc>("template_packs");

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [q] } },
      ];
    }
    if (tagsFilter.length > 0) {
      filter.tags = { $in: tagsFilter };
    }

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();

    return res.json({
      ok: true,
      packs: rows.map(toPublicPack),
    });
  } catch (error) {
    logger.error({ err: error }, "[Packs] list error");
    return next(error);
  }
});

// GET /api/packs/:id - pack detail with template names
router.get("/packs/:id", async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<TemplatePackDoc>("template_packs").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const templatesCol = db.collection<ActionTemplateDoc>("action_templates");
    const templateNames: string[] = [];
    for (const tid of doc.templateIds ?? []) {
      const t = await templatesCol.findOne({ _id: tid });
      if (t) templateNames.push(t.name);
    }

    return res.json({
      ok: true,
      pack: {
        ...toPublicPack(doc),
        templateNames,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Packs] detail error");
    return next(error);
  }
});

// POST /api/packs/:id/install - install pack into project
router.post("/packs/:id/install", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const packId = parseObjectId(req.params.id ?? "");
    if (!packId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { projectId?: string };
    const projectId = parseObjectId(String(body.projectId ?? ""));
    if (!projectId) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "projectId is required",
      });
    }

    const canManage = await canManageActions(projectId, req.user._id);
    if (!canManage) {
      return res.status(404).json({
        ok: false,
        error: "NOT_FOUND",
        message: "Project not found",
      });
    }

    const db = await getDb();
    const pack = await db.collection<TemplatePackDoc>("template_packs").findOne({ _id: packId });
    if (!pack) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Pack not found" });

    const templateIds = pack.templateIds ?? [];
    if (templateIds.length === 0) {
      return res.status(200).json({
        ok: true,
        installed: [],
        skipped: [],
        message: "Pack has no templates",
      });
    }

    const templatesCol = db.collection<ActionTemplateDoc>("action_templates");
    const actionsCol = db.collection<ProjectActionDoc>("project_actions");
    const billing = await getUserBillingState(req.user._id);
    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const defaultModel = hasOpenRouter ? QUALITY_MODELS[0] : QUALITY_MODELS_OPENAI[0];
    const provider = hasOpenRouter ? "openrouter" : "openai";

    const installed: { actionName: string; templateName: string }[] = [];
    const skipped: { actionName: string; reason: string }[] = [];

    for (const templateId of templateIds) {
      const template = await templatesCol.findOne({ _id: templateId });
      if (!template) {
        skipped.push({ actionName: "(unknown)", reason: "Template not found" });
        continue;
      }

      const actionName = toActionName(template.name);
      if (!actionName || !ACTION_NAME_REGEX.test(actionName)) {
        skipped.push({ actionName: template.name, reason: "Invalid action name" });
        continue;
      }

      const existing = await actionsCol.findOne({ projectId, actionName });
      if (existing) {
        skipped.push({ actionName, reason: "Already exists" });
        continue;
      }

      if (billing.plan === "free") {
        const count = await actionsCol.countDocuments({ projectId });
        if (count >= MAX_ACTIONS_PER_PROJECT_FREE) {
          skipped.push({ actionName, reason: "Free plan limit reached" });
          continue;
        }
      }

      const model = template.defaultModel?.trim() || process.env.EXECUTION_DEFAULT_MODEL || defaultModel;
      const actionDoc = buildActionFromTemplate(
        template,
        actionName,
        req.user._id,
        projectId,
        provider,
        model
      );
      await actionsCol.insertOne(actionDoc);
      installed.push({ actionName, templateName: template.name });
    }

    logger.info(
      {
        packId: packId.toString(),
        projectId: projectId.toString(),
        installed: installed.length,
        skipped: skipped.length,
        userId: req.user._id.toString(),
      },
      "[Packs] installed"
    );

    return res.status(201).json({
      ok: true,
      installed,
      skipped,
    });
  } catch (error) {
    logger.error({ err: error }, "[Packs] install error");
    return next(error);
  }
});

export default router;
