/**
 * Admin Action Templates - create, update, delete
 * Requires x-admin-key header.
 */

import { Router, type Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { logger } from "./utils/logger";
import type { ActionTemplateDoc, TemplateCategory, TemplateVisibility } from "./models/actionTemplate";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "./modelRegistry";

const router = Router();

const CATEGORIES: TemplateCategory[] = [
  "summarize",
  "translate",
  "extraction",
  "writing",
  "support",
  "other",
];

const VISIBILITIES: TemplateVisibility[] = ["public", "private"];

function requireAdminKey(req: { headers: Record<string, unknown> }, res: Response, next: () => void) {
  const key = process.env.ADMIN_API_KEY;
  const provided = typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"] : "";
  if (!key || key.trim().length === 0 || provided !== key) {
    res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin key required" });
    return;
  }
  next();
}

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

// POST /api/admin/templates
router.post("/admin/templates", requireAdminKey, async (req, res, next) => {
  try {
    const body = req.body as {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      promptTemplate?: string;
      inputSchema?: Record<string, unknown>;
      outputSchema?: Record<string, unknown>;
      defaultModel?: string;
      createdBy?: string;
      visibility?: string;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "name is required" });
    }

    const description = typeof body.description === "string" ? body.description : "";
    const category = CATEGORIES.includes(body.category as TemplateCategory)
      ? (body.category as TemplateCategory)
      : "other";
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === "string")
      : [];
    const promptTemplate =
      typeof body.promptTemplate === "string" ? body.promptTemplate : "User: {{input}}";
    const inputSchema =
      body.inputSchema && typeof body.inputSchema === "object"
        ? body.inputSchema
        : { type: "object", properties: { input: { type: "string" } }, required: ["input"] };
    const outputSchema =
      body.outputSchema && typeof body.outputSchema === "object" ? body.outputSchema : undefined;
    const defaultModel =
      typeof body.defaultModel === "string" && body.defaultModel.trim()
        ? body.defaultModel.trim()
        : undefined;
    const createdBy = typeof body.createdBy === "string" ? body.createdBy : "system";
    const visibility = VISIBILITIES.includes(body.visibility as TemplateVisibility)
      ? (body.visibility as TemplateVisibility)
      : "public";

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const defaultModelFallback = hasOpenRouter ? QUALITY_MODELS[0] : QUALITY_MODELS_OPENAI[0];

    const db = await getDb();
    const now = new Date();
    const doc: Omit<ActionTemplateDoc, "_id"> = {
      name,
      description,
      category,
      tags,
      promptTemplate,
      inputSchema,
      outputSchema,
      defaultModel: defaultModel ?? defaultModelFallback,
      createdBy,
      visibility,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<ActionTemplateDoc>("action_templates").insertOne(doc as ActionTemplateDoc);

    logger.info({ templateId: result.insertedId.toString(), name }, "[AdminTemplates] created");

    return res.status(201).json({
      ok: true,
      template: {
        id: result.insertedId.toString(),
        name,
        description,
        category,
        tags,
        visibility,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AdminTemplates] create error");
    return next(error);
  }
});

// PATCH /api/admin/templates/:id
router.patch("/admin/templates/:id", requireAdminKey, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      promptTemplate?: string;
      inputSchema?: Record<string, unknown>;
      outputSchema?: Record<string, unknown>;
      defaultModel?: string;
      visibility?: string;
    };

    const updates: Partial<ActionTemplateDoc> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description;
    if (CATEGORIES.includes(body.category as TemplateCategory)) updates.category = body.category as TemplateCategory;
    if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t): t is string => typeof t === "string");
    if (typeof body.promptTemplate === "string") updates.promptTemplate = body.promptTemplate;
    if (body.inputSchema && typeof body.inputSchema === "object") updates.inputSchema = body.inputSchema;
    if (body.outputSchema !== undefined) {
      updates.outputSchema = body.outputSchema && typeof body.outputSchema === "object" ? body.outputSchema : undefined;
    }
    if (typeof body.defaultModel === "string") updates.defaultModel = body.defaultModel.trim() || undefined;
    if (VISIBILITIES.includes(body.visibility as TemplateVisibility)) updates.visibility = body.visibility as TemplateVisibility;

    const db = await getDb();
    const result = await db
      .collection<ActionTemplateDoc>("action_templates")
      .findOneAndUpdate({ _id: id }, { $set: updates }, { returnDocument: "after" });

    if (!result) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    logger.info({ templateId: id.toString() }, "[AdminTemplates] updated");

    return res.json({
      ok: true,
      template: {
        id: result._id.toString(),
        name: result.name,
        description: result.description,
        category: result.category,
        tags: result.tags,
        visibility: result.visibility,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AdminTemplates] update error");
    return next(error);
  }
});

// DELETE /api/admin/templates/:id
router.delete("/admin/templates/:id", requireAdminKey, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const result = await db.collection<ActionTemplateDoc>("action_templates").deleteOne({ _id: id });

    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    logger.info({ templateId: id.toString() }, "[AdminTemplates] deleted");

    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "[AdminTemplates] delete error");
    return next(error);
  }
});

export { router as adminTemplatesRouter };
