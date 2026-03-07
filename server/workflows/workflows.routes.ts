/**
 * Workflows API - CRUD, steps, execute, webhook trigger.
 */

import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { getWorkspaceIdsForUser } from "../workspaces/projectAccess";
import { ensureWorkflowIndexes } from "./migration";
import { executeWorkflow } from "./engine";
import { refreshScheduleTriggers } from "./triggers";
import { logger } from "../utils/logger";
import type { WorkflowDoc, WorkflowStepDoc } from "./types";

const router = Router();

function parseId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message } as const;
}

async function ensureWorkflowAccess(workflowId: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const w = await db.collection<WorkflowDoc>("workflows").findOne({ _id: workflowId });
  if (!w) return false;
  if (w.ownerUserId.equals(userId)) return true;
  const workspaceIds = await getWorkspaceIdsForUser(userId);
  return workspaceIds.some((wid) => wid.equals(w.workspaceId));
}

router.get("/workflows", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    await ensureWorkflowIndexes();
    const db = await getDb();
    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    const filter = workspaceIds.length > 0
      ? { workspaceId: { $in: workspaceIds } }
      : { ownerUserId: req.user._id };

    const list = await db.collection<WorkflowDoc>("workflows").find(filter).sort({ updatedAt: -1 }).toArray();

    return res.json({
      ok: true,
      workflows: list.map((w) => ({
        id: w._id.toString(),
        name: w.name,
        workspaceId: w.workspaceId.toString(),
        enabled: w.enabled,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] list error");
    return next(error);
  }
});

router.post("/workflows", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const workspaceIdRaw = typeof req.body?.workspaceId === "string" ? req.body.workspaceId.trim() : "";

    if (name.length < 2) return res.status(400).json(validationError("Name must be at least 2 characters"));

    const workspaceId = parseId(workspaceIdRaw);
    if (!workspaceId) return res.status(400).json(validationError("Invalid workspace ID"));

    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    if (!workspaceIds.some((id) => id.equals(workspaceId))) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const now = new Date();
    const db = await getDb();
    const result = await db.collection<WorkflowDoc>("workflows").insertOne({
      name,
      workspaceId,
      ownerUserId: req.user._id,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    });

    const id = result.insertedId.toString();
    logger.info({ workflowId: id, userId: req.user._id.toString() }, "[Workflows] Created");

    return res.status(201).json({
      ok: true,
      workflow: {
        id,
        name,
        workspaceId: workspaceIdRaw,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] create error");
    return next(error);
  }
});

router.get("/workflows/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const w = await db.collection<WorkflowDoc>("workflows").findOne({ _id: id });
    if (!w) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const steps = await db
      .collection<WorkflowStepDoc>("workflow_steps")
      .find({ workflowId: id })
      .sort({ order: 1 })
      .toArray();

    return res.json({
      ok: true,
      workflow: {
        id: w._id.toString(),
        name: w.name,
        workspaceId: w.workspaceId.toString(),
        enabled: w.enabled,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      },
      steps: steps.map((s) => ({
        id: (s as WorkflowStepDoc & { _id: ObjectId })._id.toString(),
        type: s.type,
        order: s.order,
        config: s.config,
        nextStepId: s.nextStepId?.toString() ?? null,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] get error");
    return next(error);
  }
});

router.patch("/workflows/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof req.body?.name === "string" && req.body.name.trim().length >= 2) {
      update.name = req.body.name.trim();
    }
    if (typeof req.body?.enabled === "boolean") {
      update.enabled = req.body.enabled;
    }

    const w = await db.collection<WorkflowDoc>("workflows").findOneAndUpdate(
      { _id: id },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!w) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({
      ok: true,
      workflow: {
        id: w._id.toString(),
        name: w.name,
        workspaceId: w.workspaceId.toString(),
        enabled: w.enabled,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] patch error");
    return next(error);
  }
});

router.delete("/workflows/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    await db.collection<WorkflowDoc>("workflows").deleteOne({ _id: id });
    await db.collection<WorkflowStepDoc>("workflow_steps").deleteMany({ workflowId: id });

    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] delete error");
    return next(error);
  }
});

router.post("/workflows/:id/steps", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const type = req.body?.type as string;
    const config = (req.body?.config as Record<string, unknown>) ?? {};
    const order = typeof req.body?.order === "number" ? req.body.order : 999;

    if (!["trigger", "action", "output"].includes(type)) {
      return res.status(400).json(validationError("type must be trigger, action, or output"));
    }

    const db = await getDb();
    const now = new Date();
    const result = await db.collection<WorkflowStepDoc>("workflow_steps").insertOne({
      workflowId: id,
      type,
      order,
      config,
      createdAt: now,
      updatedAt: now,
    });

    await db.collection<WorkflowDoc>("workflows").updateOne({ _id: id }, { $set: { updatedAt: now } });

    refreshScheduleTriggers().catch(() => {});

    return res.status(201).json({
      ok: true,
      step: {
        id: result.insertedId.toString(),
        type,
        order,
        config,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] add step error");
    return next(error);
  }
});

router.patch("/workflows/:id/steps/:stepId", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workflowId = parseId(req.params.id);
    const stepId = parseId(req.params.stepId);
    if (!workflowId || !stepId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(workflowId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body?.config !== undefined) update.config = req.body.config;
    if (typeof req.body?.order === "number") update.order = req.body.order;

    const step = await db.collection<WorkflowStepDoc>("workflow_steps").findOneAndUpdate(
      { _id: stepId, workflowId },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!step) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    refreshScheduleTriggers().catch(() => {});

    return res.json({
      ok: true,
      step: {
        id: (step as WorkflowStepDoc & { _id: ObjectId })._id.toString(),
        type: step.type,
        order: step.order,
        config: step.config,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] patch step error");
    return next(error);
  }
});

router.delete("/workflows/:id/steps/:stepId", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workflowId = parseId(req.params.id);
    const stepId = parseId(req.params.stepId);
    if (!workflowId || !stepId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(workflowId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const result = await db.collection<WorkflowStepDoc>("workflow_steps").deleteOne({ _id: stepId, workflowId });
    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    refreshScheduleTriggers().catch(() => {});

    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] delete step error");
    return next(error);
  }
});

router.post("/workflows/:id/execute", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureWorkflowAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const triggerPayload = (req.body?.triggerPayload as Record<string, unknown>) ?? {};

    const ctx = await executeWorkflow(id, triggerPayload);

    return res.json({
      ok: true,
      data: ctx.data,
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] execute error");
    return res.status(500).json({
      ok: false,
      error: "EXECUTION_FAILED",
      message: error instanceof Error ? error.message : "Workflow execution failed",
    });
  }
});

/** Webhook trigger - POST /api/workflows/trigger/:workflowId (no auth) */
router.post("/workflows/trigger/:workflowId", async (req, res, next) => {
  try {
    const id = parseId(req.params.workflowId);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const w = await db.collection<WorkflowDoc>("workflows").findOne({ _id: id, enabled: true });
    if (!w) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const triggerPayload = (req.body as Record<string, unknown>) ?? {};

    const ctx = await executeWorkflow(id, triggerPayload);

    return res.json({
      ok: true,
      data: ctx.data,
    });
  } catch (error) {
    logger.error({ err: error }, "[Workflows] webhook trigger error");
    return res.status(500).json({
      ok: false,
      error: "EXECUTION_FAILED",
      message: error instanceof Error ? error.message : "Workflow execution failed",
    });
  }
});

export { router as workflowsRouter };
