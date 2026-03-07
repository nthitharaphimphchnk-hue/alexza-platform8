/**
 * Action Marketplace - publish, browse, install templates
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";
import type {
  MarketplaceTemplateDoc,
  MarketplaceVisibility,
} from "./models/marketplaceTemplate";
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
const VISIBILITIES: MarketplaceVisibility[] = ["public", "private"];

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

async function canManageActions(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const hasAccess = await ensureProjectAccess(projectId, userId);
  if (!hasAccess) return false;
  const db = await getDb();
  const project = await db
    .collection<{ workspaceId?: ObjectId }>("projects")
    .findOne({ _id: projectId });
  if (!project?.workspaceId) return true;
  const role = await getMemberRole(project.workspaceId, userId);
  return !!role && hasPermission(role, "actions:manage");
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<MarketplaceTemplateDoc>("marketplace_templates");
      await col.createIndex({ visibility: 1, createdAt: -1 });
      await col.createIndex({ visibility: 1, downloads: -1 });
      await col.createIndex({ visibility: 1, rating: -1 });
      await col.createIndex({ tags: 1 });
      await col.createIndex({ name: "text", description: "text", tags: "text" });
      const ratingsCol = db.collection("marketplace_ratings");
      await ratingsCol.createIndex({ marketplaceTemplateId: 1, userId: 1 }, { unique: true });
    })();
  }
  return indexesReady;
}

function toPublicMarketplaceItem(doc: MarketplaceTemplateDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    author: doc.author,
    templateId: doc.templateId.toString(),
    category: doc.category,
    tags: doc.tags ?? [],
    downloads: doc.downloads ?? 0,
    rating: doc.rating ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    visibility: doc.visibility,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// POST /api/marketplace/publish - publish action template to marketplace
router.post("/marketplace/publish", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const body = req.body as {
      templateId?: string;
      projectId?: string;
      actionName?: string;
      name?: string;
      description?: string;
      tags?: string[];
      visibility?: string;
    };

    const db = await getDb();
    const usersCol = db.collection<{ _id: ObjectId; name?: string; email: string }>("users");
    const user = await usersCol.findOne({ _id: req.user._id });
    const author = user?.name?.trim() || user?.email?.split("@")[0] || "Anonymous";

    let template: ActionTemplateDoc | null = null;

    if (body.templateId) {
      const templateId = parseObjectId(body.templateId);
      if (!templateId) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid templateId" });
      template = await db.collection<ActionTemplateDoc>("action_templates").findOne({ _id: templateId });
      if (!template) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Template not found" });
      if (template.createdBy !== "system" && template.createdBy !== req.user._id.toString()) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "You can only publish your own templates" });
      }
    } else if (body.projectId && body.actionName) {
      const projectId = parseObjectId(body.projectId);
      if (!projectId) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid projectId" });
      const canManage = await canManageActions(projectId, req.user._id);
      if (!canManage) return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Project not found" });

      const actionName = String(body.actionName).trim();
      const action = await db
        .collection<ProjectActionDoc>("project_actions")
        .findOne({ projectId, actionName });
      if (!action) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Action not found" });

      const now = new Date();
      const templateDoc: Omit<ActionTemplateDoc, "_id"> = {
        name: action.description || actionName,
        description: action.description,
        category: "other",
        tags: [],
        promptTemplate: action.promptTemplate,
        inputSchema: action.inputSchema,
        outputSchema: action.outputSchema,
        defaultModel: action.model,
        createdBy: req.user._id.toString(),
        visibility: "public",
        createdAt: now,
        updatedAt: now,
      };
      const insertResult = await db
        .collection<ActionTemplateDoc>("action_templates")
        .insertOne(templateDoc as ActionTemplateDoc);
      template = { _id: insertResult.insertedId, ...templateDoc } as ActionTemplateDoc;
    } else {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Provide templateId or (projectId + actionName)",
      });
    }

    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : template.name;
    const description = typeof body.description === "string" ? body.description : template.description;
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : template.tags ?? [];
    const visibility = VISIBILITIES.includes(body.visibility as MarketplaceVisibility)
      ? (body.visibility as MarketplaceVisibility)
      : "public";

    const now = new Date();
    const marketplaceDoc: Omit<MarketplaceTemplateDoc, "_id"> = {
      name,
      description,
      author,
      authorUserId: req.user._id,
      templateId: template._id,
      tags,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      visibility,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection<MarketplaceTemplateDoc>("marketplace_templates")
      .insertOne(marketplaceDoc as MarketplaceTemplateDoc);

    logger.info(
      { marketplaceId: result.insertedId.toString(), templateId: template._id.toString(), userId: req.user._id.toString() },
      "[Marketplace] published"
    );

    return res.status(201).json({
      ok: true,
      template: toPublicMarketplaceItem({ _id: result.insertedId, ...marketplaceDoc } as MarketplaceTemplateDoc),
    });
  } catch (error) {
    logger.error({ err: error }, "[Marketplace] publish error");
    return next(error);
  }
});

// GET /api/marketplace - browse (search, tags, sections)
router.get("/marketplace", async (req, res, next) => {
  try {
    await ensureIndexes();
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const tagsParam = req.query.tags;
    const tagsFilter = Array.isArray(tagsParam)
      ? tagsParam.filter((t): t is string => typeof t === "string")
      : typeof tagsParam === "string"
        ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 100);
    const section = typeof req.query.section === "string" ? req.query.section : "";

    const db = await getDb();
    const col = db.collection<MarketplaceTemplateDoc>("marketplace_templates");

    const filter: Record<string, unknown> = { visibility: "public" as MarketplaceVisibility };
    if (category) filter.category = category;
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

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (section === "popular") sort = { downloads: -1, rating: -1 };
    else if (section === "trending") sort = { downloads: -1, rating: -1, createdAt: -1 };
    else if (section === "new") sort = { createdAt: -1 };

    const rows = await col.find(filter).sort(sort).limit(limit).toArray();

    return res.json({
      ok: true,
      templates: rows.map(toPublicMarketplaceItem),
    });
  } catch (error) {
    logger.error({ err: error }, "[Marketplace] list error");
    return next(error);
  }
});

// GET /api/marketplace/sections - get Trending, Popular, New
router.get("/marketplace/sections", async (req, res, next) => {
  try {
    await ensureIndexes();
    const limit = Math.min(parseInt(String(req.query.limit || "6"), 10) || 6, 20);

    const db = await getDb();
    const col = db.collection<MarketplaceTemplateDoc>("marketplace_templates");
    const filter = { visibility: "public" as MarketplaceVisibility };

    const [trending, popular, newest] = await Promise.all([
      col
        .find(filter)
        .sort({ downloads: -1, rating: -1, createdAt: -1 })
        .limit(limit)
        .toArray(),
      col
        .find(filter)
        .sort({ downloads: -1 })
        .limit(limit)
        .toArray(),
      col
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
    ]);

    return res.json({
      ok: true,
      sections: {
        trending: trending.map(toPublicMarketplaceItem),
        popular: popular.map(toPublicMarketplaceItem),
        new: newest.map(toPublicMarketplaceItem),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Marketplace] sections error");
    return next(error);
  }
});

// GET /api/marketplace/:id - detail
router.get("/marketplace/:id", async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<MarketplaceTemplateDoc>("marketplace_templates").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (doc.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const template = await db.collection<ActionTemplateDoc>("action_templates").findOne({ _id: doc.templateId });
    const detail = toPublicMarketplaceItem(doc);
    return res.json({
      ok: true,
      template: detail,
      promptTemplate: template?.promptTemplate,
      inputSchema: template?.inputSchema,
      outputSchema: template?.outputSchema,
    });
  } catch (error) {
    logger.error({ err: error }, "[Marketplace] detail error");
    return next(error);
  }
});

// POST /api/marketplace/:id/install - create action in project
router.post("/marketplace/:id/install", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const marketplaceId = parseObjectId(req.params.id ?? "");
    if (!marketplaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

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
    const marketplace = await db
      .collection<MarketplaceTemplateDoc>("marketplace_templates")
      .findOne({ _id: marketplaceId });
    if (!marketplace) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Template not found" });
    if (marketplace.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const template = await db
      .collection<ActionTemplateDoc>("action_templates")
      .findOne({ _id: marketplace.templateId });
    if (!template) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Template not found" });

    const overrideName = typeof body.overrideName === "string" ? body.overrideName.trim() : "";
    const actionName = overrideName ? toActionName(overrideName) : toActionName(marketplace.name);

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

    await db.collection<MarketplaceTemplateDoc>("marketplace_templates").updateOne(
      { _id: marketplaceId },
      { $inc: { downloads: 1 }, $set: { updatedAt: new Date() } }
    );

    logger.info(
      {
        marketplaceId: marketplaceId.toString(),
        projectId: projectId.toString(),
        actionName,
        userId: req.user._id.toString(),
      },
      "[Marketplace] installed"
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
    logger.error({ err: error }, "[Marketplace] install error");
    return next(error);
  }
});

// POST /api/marketplace/:id/rate - star rating (1-5)
router.post("/marketplace/:id/rate", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const marketplaceId = parseObjectId(req.params.id ?? "");
    if (!marketplaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { rating?: number };
    const rating = typeof body.rating === "number" ? Math.round(body.rating) : 0;
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "rating must be 1-5" });
    }

    const db = await getDb();
    const marketplace = await db
      .collection<MarketplaceTemplateDoc>("marketplace_templates")
      .findOne({ _id: marketplaceId });
    if (!marketplace) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (marketplace.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const ratingsCol = db.collection("marketplace_ratings");
    await ratingsCol.updateOne(
      { marketplaceTemplateId: marketplaceId, userId: req.user._id },
      { $set: { rating, createdAt: new Date() } },
      { upsert: true }
    );

    const allRatings = await ratingsCol.find({ marketplaceTemplateId: marketplaceId }).toArray();
    const ratingCount = allRatings.length;
    const avgRating = ratingCount > 0
      ? allRatings.reduce((s, r) => s + (r as unknown as { rating: number }).rating, 0) / ratingCount
      : 0;

    await db.collection<MarketplaceTemplateDoc>("marketplace_templates").updateOne(
      { _id: marketplaceId },
      { $set: { rating: Math.round(avgRating * 10) / 10, ratingCount, updatedAt: new Date() } }
    );

    return res.json({
      ok: true,
      rating: Math.round(avgRating * 10) / 10,
      ratingCount,
    });
  } catch (error) {
    logger.error({ err: error }, "[Marketplace] rate error");
    return next(error);
  }
});

export { router as marketplaceRouter };
