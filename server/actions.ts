/**
 * Project Actions (API Specs) - CRUD
 */

import { Router, type Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { requireAuthOrApiKey } from "./middleware/requireAuthOrApiKey";
import { requireApiScope } from "./middleware/requireApiScope";
import { getUserBillingState } from "./billing";
import { MAX_ACTIONS_PER_PROJECT_FREE } from "./config";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "./modelRegistry";
import type { ProjectActionDoc, ProposedAction } from "./models/types";
import { toPublicAction } from "./models/actionDto";
import { ensureProjectAccess } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";

const router = Router();

function parseProjectId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function err(res: Response, status: number, error: string, message: string) {
  return res.status(status).json({ ok: false, error, message });
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<ProjectActionDoc>("project_actions");
      await col.createIndex({ projectId: 1, actionName: 1 }, { unique: true });
    })();
  }
  return indexesReady;
}

interface PromptVersionDoc {
  actionId: ObjectId;
  version: number;
  prompt: string;
  createdBy: ObjectId;
  createdAt: Date;
}

async function createPromptVersionSnapshot(params: {
  actionId: ObjectId;
  prompt: string;
  userId: ObjectId;
}): Promise<number> {
  const db = await getDb();
  const col = db.collection<PromptVersionDoc>("prompt_versions");
  const latest = await col.find({ actionId: params.actionId }).sort({ version: -1 }).limit(1).toArray();
  const nextVersion = (latest[0]?.version ?? 0) + 1;
  const now = new Date();
  await col.insertOne({
    actionId: params.actionId,
    version: nextVersion,
    prompt: params.prompt,
    createdBy: params.userId,
    createdAt: now,
  });
  return nextVersion;
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

const ACTION_NAME_REGEX = /^[a-z0-9_-]+$/;

function validateActionName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: "actionName is required" };
  if (!ACTION_NAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "actionName must be URL-safe: only a-z, 0-9, underscore, hyphen",
    };
  }
  return { valid: true };
}

function validateInputSchema(schema: unknown): { valid: boolean; error?: string } {
  if (!schema || typeof schema !== "object") {
    return { valid: false, error: "inputSchema must be a valid JSON schema object" };
  }
  const obj = schema as Record<string, unknown>;
  const validTypes = ["object", "string", "array", "number", "boolean", "integer"];
  if (obj.type && !validTypes.includes(String(obj.type))) {
    return { valid: false, error: "inputSchema.type must be one of: object, string, array, number, boolean, integer" };
  }
  return { valid: true };
}

// POST /api/projects/:id/actions - create or update (Apply)
router.post("/projects/:id/actions", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return err(res, 404, "NOT_FOUND", "Project not found");

    const canManage = await canManageActions(projectId, req.user._id);
    if (!canManage) return err(res, 404, "NOT_FOUND", "Project not found");

    const body = req.body as Partial<ProposedAction> & { actionName?: string; routingPolicy?: string };
    const rawActionName = typeof body.actionName === "string" ? body.actionName : "";
    const nameValidation = validateActionName(rawActionName);
    if (!nameValidation.valid) {
      return err(res, 400, "VALIDATION_ERROR", nameValidation.error ?? "Invalid actionName");
    }
    const actionName = rawActionName.trim().toLowerCase();

    const description = typeof body.description === "string" ? body.description : "";
    const inputSchema =
      body.inputSchema && typeof body.inputSchema === "object"
        ? body.inputSchema
        : { type: "object", properties: { input: { type: "string" } }, required: ["input"] };
    const schemaValidation = validateInputSchema(inputSchema);
    if (!schemaValidation.valid) {
      return err(res, 400, "VALIDATION_ERROR", schemaValidation.error ?? "Invalid inputSchema");
    }
    const outputSchema =
      body.outputSchema && typeof body.outputSchema === "object" ? body.outputSchema : undefined;
    const promptTemplate =
      typeof body.promptTemplate === "string" ? body.promptTemplate : "User: {{input}}";

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const defaultProvider = hasOpenRouter ? "openrouter" : "openai";
    const defaultModel = hasOpenRouter ? QUALITY_MODELS[0] : QUALITY_MODELS_OPENAI[0];
    const provider =
      body.provider === "openrouter" || body.provider === "openai" ? body.provider : defaultProvider;
    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : (process.env.EXECUTION_DEFAULT_MODEL || defaultModel);
    const routingPolicy = typeof body.routingPolicy === "string" ? body.routingPolicy : "quality";
    const temperature =
      typeof body.temperature === "number" && body.temperature >= 0 && body.temperature <= 2
        ? body.temperature
        : 0.7;
    const maxTokens =
      typeof body.maxTokens === "number" && body.maxTokens > 0 ? body.maxTokens : 2048;

    const db = await getDb();
    const col = db.collection<ProjectActionDoc>("project_actions");
    const now = new Date();

    const existing = await col.findOne({ projectId, actionName });
    if (!existing) {
      const billing = await getUserBillingState(req.user._id);
      if (billing.plan === "free") {
        const count = await col.countDocuments({ projectId });
        if (count >= MAX_ACTIONS_PER_PROJECT_FREE) {
          return err(
            res,
            403,
            "FREE_PLAN_LIMIT",
            `Free plan allows up to ${MAX_ACTIONS_PER_PROJECT_FREE} actions per project. Upgrade to Pro for more.`
          );
        }
      }
    }

    const doc: ProjectActionDoc = {
      userId: req.user._id,
      projectId,
      actionName,
      description,
      inputSchema,
      outputSchema,
      promptTemplate,
      provider,
      model,
      routingPolicy,
      temperature,
      maxTokens,
      createdAt: now,
      updatedAt: now,
    };

    let result;

    if (existing) {
      // If prompt changed, snapshot previous prompt as a new version
      if (existing.promptTemplate !== promptTemplate) {
        await createPromptVersionSnapshot({
          actionId: (existing as ProjectActionDoc & { _id: ObjectId })._id,
          prompt: existing.promptTemplate,
          userId: req.user._id,
        });
      }

      result = await col.findOneAndUpdate(
        { projectId, actionName },
        {
          $set: {
            description,
            inputSchema,
            outputSchema,
            promptTemplate,
            provider,
            model,
            routingPolicy,
            temperature,
            maxTokens,
            updatedAt: now,
          },
        },
        { returnDocument: "after" }
      );
    } else {
      const insertResult = await col.insertOne(doc);
      result = await col.findOne({ _id: insertResult.insertedId });
    }

    if (!result) throw new Error("Failed to save action");

    const project = await db.collection<{ workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project?.workspaceId ?? null,
      projectId,
      actionType: existing ? "action.updated" : "action.created",
      resourceType: "action",
      resourceId: actionName,
      metadata: { description },
      ip,
      userAgent,
      status: "success",
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Actions] ${existing ? "Updated" : "Created"} action ${actionName} for project ${projectId}`);
    }

    return res.status(existing ? 200 : 201).json({
      ok: true,
      action: toPublicAction(result as ProjectActionDoc & { _id: ObjectId }),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/projects/:id/actions
router.get("/projects/:id/actions", requireAuthOrApiKey, requireApiScope("read:projects"), async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return err(res, 404, "NOT_FOUND", "Project not found");

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return err(res, 404, "NOT_FOUND", "Project not found");

    const db = await getDb();
    const actions = await db
      .collection<ProjectActionDoc>("project_actions")
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      actions: actions.map((a) => toPublicAction(a as ProjectActionDoc & { _id: ObjectId })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/projects/:id/actions/:actionName
router.get("/projects/:id/actions/:actionName", requireAuthOrApiKey, requireApiScope("read:projects"), async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return err(res, 404, "NOT_FOUND", "Project not found");

    const actionName = req.params.actionName?.trim() ?? "";
    const nameValidation = validateActionName(actionName);
    if (!nameValidation.valid) {
      return err(res, 400, "VALIDATION_ERROR", nameValidation.error ?? "Invalid actionName");
    }
    const safeActionName = actionName.trim().toLowerCase();

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return err(res, 404, "NOT_FOUND", "Project not found");

    const db = await getDb();
    const action = await db.collection<ProjectActionDoc>("project_actions").findOne({
      projectId,
      actionName: safeActionName,
    });

    if (!action) return err(res, 404, "NOT_FOUND", "Action not found");

    return res.json({
      ok: true,
      action: toPublicAction(action as ProjectActionDoc & { _id: ObjectId }),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/actions/:id/prompt-versions - list prompt version history for an action
router.get("/actions/:id/prompt-versions", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const actionIdRaw = req.params.id;
    if (!ObjectId.isValid(actionIdRaw)) {
      return err(res, 400, "VALIDATION_ERROR", "Invalid action id");
    }
    const actionId = new ObjectId(actionIdRaw);

    const db = await getDb();
    const actionsCol = db.collection<ProjectActionDoc>("project_actions");
    const action = await actionsCol.findOne({ _id: actionId });
    if (!action) return err(res, 404, "NOT_FOUND", "Action not found");

    const hasAccess = await ensureProjectAccess(action.projectId, req.user._id);
    if (!hasAccess) return err(res, 404, "NOT_FOUND", "Action not found");

    const versionsCol = db.collection<PromptVersionDoc>("prompt_versions");
    const versions = await versionsCol
      .find({ actionId })
      .sort({ version: -1, createdAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      versions: versions.map((v) => ({
        version: v.version,
        prompt: v.prompt,
        createdBy: v.createdBy.toString(),
        createdAt: v.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/actions/:id/prompt-versions/:version/rollback - restore previous prompt
router.post("/actions/:id/prompt-versions/:version/rollback", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const actionIdRaw = req.params.id;
    if (!ObjectId.isValid(actionIdRaw)) {
      return err(res, 400, "VALIDATION_ERROR", "Invalid action id");
    }
    const actionId = new ObjectId(actionIdRaw);

    const versionNum = Number.parseInt(req.params.version, 10);
    if (!Number.isFinite(versionNum) || versionNum <= 0) {
      return err(res, 400, "VALIDATION_ERROR", "Invalid version");
    }

    const db = await getDb();
    const actionsCol = db.collection<ProjectActionDoc>("project_actions");
    const action = await actionsCol.findOne({ _id: actionId });
    if (!action) return err(res, 404, "NOT_FOUND", "Action not found");

    const canManage = await canManageActions(action.projectId, req.user._id);
    if (!canManage) return err(res, 404, "NOT_FOUND", "Action not found");

    const versionsCol = db.collection<PromptVersionDoc>("prompt_versions");
    const targetVersion = await versionsCol.findOne({ actionId, version: versionNum });
    if (!targetVersion) return err(res, 404, "NOT_FOUND", "Prompt version not found");

    // Snapshot current prompt before rollback so we can roll forward later if needed
    await createPromptVersionSnapshot({
      actionId,
      prompt: action.promptTemplate,
      userId: req.user._id,
    });

    const now = new Date();
    const updateResult = await actionsCol.findOneAndUpdate(
      { _id: actionId },
      { $set: { promptTemplate: targetVersion.prompt, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!updateResult) return err(res, 500, "RUNTIME_ERROR", "Failed to update action");

    const project = await db
      .collection<{ workspaceId?: ObjectId }>("projects")
      .findOne({ _id: action.projectId });
    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project?.workspaceId ?? null,
      projectId: action.projectId,
      actionType: "action.prompt_rollback",
      resourceType: "action",
      resourceId: action.actionName,
      metadata: { rolledBackToVersion: versionNum },
      ip,
      userAgent,
      status: "success",
    });

    return res.json({
      ok: true,
      action: toPublicAction(updateResult as ProjectActionDoc & { _id: ObjectId }),
    });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/projects/:id/actions/:actionName
router.delete("/projects/:id/actions/:actionName", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return err(res, 404, "NOT_FOUND", "Project not found");

    const actionName = req.params.actionName?.trim() ?? "";
    const nameValidation = validateActionName(actionName);
    if (!nameValidation.valid) {
      return err(res, 400, "VALIDATION_ERROR", nameValidation.error ?? "Invalid actionName");
    }
    const safeActionName = actionName.trim().toLowerCase();

    const canManage = await canManageActions(projectId, req.user._id);
    if (!canManage) return err(res, 404, "NOT_FOUND", "Project not found");

    const db = await getDb();
    const result = await db.collection<ProjectActionDoc>("project_actions").findOneAndDelete({
      projectId,
      actionName: safeActionName,
    });

    if (!result) return err(res, 404, "NOT_FOUND", "Action not found");

    const project = await db.collection<{ ownerUserId: ObjectId; workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: project?.ownerUserId ?? req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project?.workspaceId ?? null,
      projectId,
      actionType: "action.deleted",
      resourceType: "action",
      resourceId: safeActionName,
      metadata: { description: result.description },
      ip,
      userAgent,
      status: "success",
    });

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export { router as actionsRouter };
