import { Router } from "express";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { requireAuthOrApiKey } from "./middleware/requireAuthOrApiKey";
import { ensureProjectAccess, getWorkspaceIdsForUser } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";

export type RoutingMode = "cheap" | "balanced" | "quality";

interface ProjectDoc {
  ownerUserId: ObjectId;
  workspaceId?: ObjectId;
  name: string;
  description?: string;
  model?: string;
  status: "active" | "paused";
  routingMode?: RoutingMode;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProjectBody {
  name?: unknown;
  description?: unknown;
  model?: unknown;
  workspaceId?: unknown;
}

interface UpdateProjectBody {
  name?: unknown;
  description?: unknown;
  model?: unknown;
  status?: unknown;
}

const router = Router();
let projectsIndexesReady: Promise<void> | null = null;

function toProjectResponse(project: WithId<ProjectDoc>) {
  const id = project._id.toString();
  const routingMode = project.routingMode ?? "quality";
  return {
    id,
    _id: id,
    ownerUserId: project.ownerUserId.toString(),
    workspaceId: project.workspaceId?.toString(),
    name: project.name,
    description: project.description ?? "",
    model: project.model ?? "",
    status: project.status,
    routingMode,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message } as const;
}

function parseProjectId(rawId: string): ObjectId | null {
  if (!ObjectId.isValid(rawId)) return null;
  return new ObjectId(rawId);
}

async function ensureProjectsIndexes() {
  if (!projectsIndexesReady) {
    projectsIndexesReady = (async () => {
      const db = await getDb();
      const projects = db.collection<ProjectDoc>("projects");
      await projects.createIndex({ ownerUserId: 1, createdAt: -1 });
      await projects.createIndex({ workspaceId: 1, createdAt: -1 });
    })();
  }
  return projectsIndexesReady;
}

export async function runRoutingModeMigration() {
  const db = await getDb();
  const projects = db.collection<ProjectDoc>("projects");
  const result = await projects.updateMany(
    { routingMode: { $exists: false } },
    { $set: { routingMode: "quality" as RoutingMode } }
  );
  if (result.modifiedCount > 0 && process.env.NODE_ENV !== "production") {
    console.log(`[Projects] routingMode migration: ${result.modifiedCount} projects set to quality`);
  }
}

router.post("/projects", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const body = req.body as CreateProjectBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : undefined;
    const model =
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : undefined;
    const workspaceIdRaw = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";

    if (name.length < 2) {
      return res.status(400).json(validationError("Project name must be at least 2 characters"));
    }

    let workspaceId: ObjectId | undefined;
    if (workspaceIdRaw && ObjectId.isValid(workspaceIdRaw)) {
      workspaceId = new ObjectId(workspaceIdRaw);
      const role = await getMemberRole(workspaceId, req.user._id);
      if (!role || !hasPermission(role, "projects:manage")) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      }
    } else {
      const db = await getDb();
      const member = await db
        .collection<{ workspaceId: ObjectId }>("workspace_members")
        .findOne({ userId: req.user._id, status: "active", role: "owner" });
      if (member) workspaceId = member.workspaceId;
    }

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const now = new Date();

    const insertResult = await projects.insertOne({
      ownerUserId: req.user._id,
      workspaceId,
      name,
      description,
      model,
      status: "active",
      routingMode: "quality",
      createdAt: now,
      updatedAt: now,
    });

    const project = await projects.findOne({ _id: insertResult.insertedId });
    if (!project) {
      throw new Error("Failed to load newly created project");
    }

    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project.workspaceId ?? null,
      projectId: insertResult.insertedId,
      actionType: "project.created",
      resourceType: "project",
      resourceId: insertResult.insertedId.toString(),
      metadata: { name: project.name },
      ip,
      userAgent,
      status: "success",
    });

    return res.status(201).json({ ok: true, project: toProjectResponse(project) });
  } catch (error) {
    return next(error);
  }
});

router.get("/projects", requireAuthOrApiKey, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const workspaceIdRaw = typeof req.query.workspaceId === "string" ? req.query.workspaceId.trim() : "";
    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");

    let filter: { ownerUserId?: ObjectId; workspaceId?: ObjectId | { $in: ObjectId[] } } = {};

    if (workspaceIdRaw && ObjectId.isValid(workspaceIdRaw)) {
      const workspaceId = new ObjectId(workspaceIdRaw);
      const role = await getMemberRole(workspaceId, req.user._id);
      if (!role) {
        return res.json({ ok: true, projects: [] });
      }
      filter = { workspaceId };
    } else {
      const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
      const orConditions: Record<string, unknown>[] = [{ ownerUserId: req.user._id }];
      if (workspaceIds.length > 0) {
        orConditions.push({ workspaceId: { $in: workspaceIds } });
      }
      filter = { $or: orConditions } as typeof filter;
    }

    const rows = await projects.find(filter).sort({ createdAt: -1 }).toArray();

    return res.json({
      ok: true,
      projects: rows.map(toProjectResponse),
    });
  } catch (error) {
    return next(error);
  }
});

const ROUTING_MODES: RoutingMode[] = ["cheap", "balanced", "quality"];

router.patch("/projects/:id/settings", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const project = await projects.findOne({ _id: projectId });
    if (!project) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const workspaceId = project.workspaceId;
    let canManage = true;
    if (workspaceId) {
      const role = await getMemberRole(workspaceId, req.user._id);
      canManage = !!role && hasPermission(role, "projects:manage");
    }
    if (!canManage) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const body = req.body as { routingMode?: unknown };
    const routingModeRaw = body.routingMode;
    if (routingModeRaw === undefined) {
      return res.status(400).json(validationError("routingMode is required"));
    }
    if (typeof routingModeRaw !== "string" || !ROUTING_MODES.includes(routingModeRaw as RoutingMode)) {
      return res.status(400).json(
        validationError(`routingMode must be one of: ${ROUTING_MODES.join(", ")}`)
      );
    }
    const routingMode = routingModeRaw as RoutingMode;

    const updated = await projects.findOneAndUpdate(
      { _id: projectId },
      { $set: { routingMode, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updated) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: project.ownerUserId,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project.workspaceId ?? null,
      projectId,
      actionType: "project.updated",
      resourceType: "project",
      resourceId: projectId.toString(),
      metadata: { routingMode },
      ip,
      userAgent,
      status: "success",
    });

    return res.json({ ok: true, project: toProjectResponse(updated) });
  } catch (error) {
    return next(error);
  }
});

router.get("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId });
    if (!project) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({ ok: true, project: toProjectResponse(project) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId });
    if (!project) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    if (project.workspaceId) {
      const role = await getMemberRole(project.workspaceId, req.user._id);
      if (!role || !hasPermission(role, "projects:manage")) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      }
    }

    const deletedProject = await db.collection<ProjectDoc>("projects").findOneAndDelete({
      _id: projectId,
    });

    if (!deletedProject) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: project.ownerUserId,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project.workspaceId ?? null,
      projectId,
      actionType: "project.deleted",
      resourceType: "project",
      resourceId: projectId.toString(),
      metadata: { name: project.name },
      ip,
      userAgent,
      status: "success",
    });

    const threadIds = await db
      .collection("chat_threads")
      .find({ projectId })
      .project({ _id: 1 })
      .toArray()
      .then((rows) => rows.map((r) => r._id));

    await Promise.all([
      db.collection("api_keys").deleteMany({ projectId }),
      db.collection("usage_logs").deleteMany({ projectId }),
      db.collection("project_actions").deleteMany({ projectId }),
      db.collection("chat_messages").deleteMany({ threadId: { $in: threadIds } }),
      db.collection("chat_threads").deleteMany({ projectId }),
    ]);

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.patch("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId });
    if (!project) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    if (project.workspaceId) {
      const role = await getMemberRole(project.workspaceId, req.user._id);
      if (!role || !hasPermission(role, "projects:manage")) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      }
    }

    const body = req.body as UpdateProjectBody;
    const updateSet: Partial<ProjectDoc> = {};
    let hasAtLeastOneField = false;

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return res.status(400).json(validationError("name must be a string"));
      }
      const name = body.name.trim();
      if (name.length < 2) {
        return res.status(400).json(validationError("Project name must be at least 2 characters"));
      }
      updateSet.name = name;
      hasAtLeastOneField = true;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return res.status(400).json(validationError("description must be a string"));
      }
      updateSet.description = body.description.trim();
      hasAtLeastOneField = true;
    }

    if (body.model !== undefined) {
      if (typeof body.model !== "string") {
        return res.status(400).json(validationError("model must be a string"));
      }
      updateSet.model = body.model.trim();
      hasAtLeastOneField = true;
    }

    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "paused") {
        return res.status(400).json(validationError('status must be "active" or "paused"'));
      }
      updateSet.status = body.status;
      hasAtLeastOneField = true;
    }

    if (!hasAtLeastOneField) {
      return res.status(400).json(validationError("No valid fields to update"));
    }

    updateSet.updatedAt = new Date();

    const projects = db.collection<ProjectDoc>("projects");
    const updated = await projects.findOneAndUpdate(
      { _id: projectId },
      {
        $set: updateSet,
      },
      {
        returnDocument: "after",
      }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: project.ownerUserId,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project.workspaceId ?? null,
      projectId,
      actionType: "project.updated",
      resourceType: "project",
      resourceId: projectId.toString(),
      metadata: Object.keys(updateSet).filter((k) => k !== "updatedAt"),
      ip,
      userAgent,
      status: "success",
    });

    return res.json({ ok: true, project: toProjectResponse(updated) });
  } catch (error) {
    return next(error);
  }
});

export { router as projectsRouter };

if (process.env.NODE_ENV !== "production") {
  router.get("/debug/projects/all", async (_req, res, next) => {
    try {
      const db = await getDb();
      const rows = await db
        .collection<ProjectDoc>("projects")
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      res.json({
        ok: true,
        count: rows.length,
        projects: rows.map((row) => ({
          id: row._id.toString(),
          ownerUserId: row.ownerUserId.toString(),
          name: row.name,
          createdAt: row.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/debug/projects/mine", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
        return;
      }

      const filter = { ownerUserId: req.user._id };
      const db = await getDb();
      const rows = await db
        .collection<ProjectDoc>("projects")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      res.json({
        ok: true,
        filter: { ownerUserId: String(req.user._id) },
        count: rows.length,
        first: rows[0]
          ? {
              id: rows[0]._id.toString(),
              ownerUserId: rows[0].ownerUserId.toString(),
              name: rows[0].name,
              createdAt: rows[0].createdAt,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  });
} else {
  router.get("/debug/projects/all", (_req, res) => {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
  });

  router.get("/debug/projects/mine", (_req, res) => {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
  });
}
