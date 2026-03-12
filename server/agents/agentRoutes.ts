/**
 * Agents API - CRUD, run
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { getWorkspaceIdsForUser } from "../workspaces/projectAccess";
import { runAgent } from "./engine";
import { logger } from "../utils/logger";
import { requestTimeout } from "../middleware/request-timeout";
import type { AgentDoc, AgentTool } from "../models/agent";

const router = Router();

function parseId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

async function ensureAgentAccess(agentId: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const agent = await db.collection<AgentDoc>("agents").findOne({ _id: agentId });
  if (!agent) return false;
  if (agent.ownerUserId.equals(userId)) return true;
  const workspaceIds = await getWorkspaceIdsForUser(userId);
  return workspaceIds.some((wid) => wid.equals(agent.workspaceId));
}

function toPublicAgent(doc: AgentDoc & { _id: ObjectId }) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    workspaceId: doc.workspaceId.toString(),
    tools: doc.tools,
    memoryEnabled: doc.memoryEnabled,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// GET /api/agents
router.get("/agents", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const db = await getDb();
    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    const filter =
      workspaceIds.length > 0
        ? { workspaceId: { $in: workspaceIds } }
        : { ownerUserId: req.user._id };

    const list = await db.collection<AgentDoc>("agents").find(filter).sort({ updatedAt: -1 }).toArray();

    return res.json({
      ok: true,
      agents: list.map((a) => toPublicAgent(a as AgentDoc & { _id: ObjectId })),
    });
  } catch (error) {
    logger.error({ err: error }, "[Agents] list error");
    return next(error);
  }
});

// POST /api/agents
router.post("/agents", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description : "";
    const workspaceIdRaw = typeof req.body?.workspaceId === "string" ? req.body.workspaceId.trim() : "";
    const toolsRaw = req.body?.tools;
    const memoryEnabled = Boolean(req.body?.memoryEnabled);

    if (name.length < 2) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "Name must be at least 2 characters" });

    const workspaceId = parseId(workspaceIdRaw);
    if (!workspaceId) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid workspace ID" });

    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    if (!workspaceIds.some((id) => id.equals(workspaceId))) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const tools: AgentTool[] = Array.isArray(toolsRaw)
      ? toolsRaw
          .map((t: unknown) => {
            if (!t || typeof t !== "object") return null;
            const o = t as Record<string, unknown>;
            const type = o.type as string;
            if (type === "action" && typeof o.projectId === "string" && typeof o.actionName === "string") {
              return { type: "action", projectId: o.projectId, actionName: o.actionName, label: typeof o.label === "string" ? o.label : undefined };
            }
            if (type === "workflow" && typeof o.workflowId === "string") {
              return { type: "workflow", workflowId: o.workflowId, label: typeof o.label === "string" ? o.label : undefined };
            }
            if (type === "webhook" && typeof o.url === "string") {
              return { type: "webhook", url: o.url, method: typeof o.method === "string" ? o.method : "POST", label: typeof o.label === "string" ? o.label : undefined };
            }
            return null;
          })
          .filter((t): t is AgentTool => t !== null)
      : [];

    const now = new Date();
    const db = await getDb();
    const result = await db.collection<AgentDoc>("agents").insertOne({
      name,
      description,
      workspaceId,
      ownerUserId: req.user._id,
      tools,
      memoryEnabled,
      createdAt: now,
      updatedAt: now,
    } as AgentDoc);

    const id = result.insertedId.toString();
    logger.info({ agentId: id, userId: req.user._id.toString() }, "[Agents] Created");

    const agent = await db.collection<AgentDoc>("agents").findOne({ _id: result.insertedId });
    return res.status(201).json({
      ok: true,
      agent: agent ? toPublicAgent(agent as AgentDoc & { _id: ObjectId }) : { id, name, description, workspaceId: workspaceIdRaw, tools, memoryEnabled, createdAt: now, updatedAt: now },
    });
  } catch (error) {
    logger.error({ err: error }, "[Agents] create error");
    return next(error);
  }
});

// GET /api/agents/:id
router.get("/agents/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureAgentAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const agent = await db.collection<AgentDoc>("agents").findOne({ _id: id });
    if (!agent) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({
      ok: true,
      agent: toPublicAgent(agent as AgentDoc & { _id: ObjectId }),
    });
  } catch (error) {
    logger.error({ err: error }, "[Agents] get error");
    return next(error);
  }
});

// PATCH /api/agents/:id
router.patch("/agents/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureAgentAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof req.body?.name === "string" && req.body.name.trim().length >= 2) {
      update.name = req.body.name.trim();
    }
    if (typeof req.body?.description === "string") {
      update.description = req.body.description;
    }
    if (typeof req.body?.memoryEnabled === "boolean") {
      update.memoryEnabled = req.body.memoryEnabled;
    }
    if (Array.isArray(req.body?.tools)) {
      const tools: AgentTool[] = req.body.tools
        .map((t: unknown) => {
          if (!t || typeof t !== "object") return null;
          const o = t as Record<string, unknown>;
          const type = o.type as string;
          if (type === "action" && typeof o.projectId === "string" && typeof o.actionName === "string") {
            return { type: "action", projectId: o.projectId, actionName: o.actionName, label: typeof o.label === "string" ? o.label : undefined };
          }
          if (type === "workflow" && typeof o.workflowId === "string") {
            return { type: "workflow", workflowId: o.workflowId, label: typeof o.label === "string" ? o.label : undefined };
          }
          if (type === "webhook" && typeof o.url === "string") {
            return { type: "webhook", url: o.url, method: typeof o.method === "string" ? o.method : "POST", label: typeof o.label === "string" ? o.label : undefined };
          }
          return null;
        })
        .filter((t): t is AgentTool => t !== null);
      update.tools = tools;
    }

    const agent = await db.collection<AgentDoc>("agents").findOneAndUpdate(
      { _id: id },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!agent) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({
      ok: true,
      agent: toPublicAgent(agent as AgentDoc & { _id: ObjectId }),
    });
  } catch (error) {
    logger.error({ err: error }, "[Agents] patch error");
    return next(error);
  }
});

// DELETE /api/agents/:id
router.delete("/agents/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureAgentAccess(id, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    await db.collection<AgentDoc>("agents").deleteOne({ _id: id });
    await db.collection("agent_memory").deleteMany({ agentId: id });

    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "[Agents] delete error");
    return next(error);
  }
});

// POST /api/agents/run
router.post("/agents/run", requireAuth, requestTimeout("ai_run"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const body = req.body as { agentId?: string; input?: string; sessionId?: string };
    const agentId = parseId(body.agentId ?? "");
    const input = typeof body.input === "string" ? body.input.trim() : "";

    if (!agentId) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "agentId is required" });
    if (!input) return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "input is required" });

    const hasAccess = await ensureAgentAccess(agentId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const result = await runAgent({
      agentId,
      input,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      ownerUserId: req.user._id,
    });

    return res.json({
      ok: true,
      output: result.output,
      toolUsed: result.toolUsed,
      usage: result.usage,
    });
  } catch (error) {
    logger.error({ err: error }, "[Agents] run error");
    return res.status(500).json({
      ok: false,
      error: "EXECUTION_FAILED",
      message: error instanceof Error ? error.message : "Agent execution failed",
    });
  }
});

export { router as agentsRouter };
