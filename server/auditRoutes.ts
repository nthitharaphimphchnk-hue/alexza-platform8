/**
 * Audit Logs API - list with pagination and filters.
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { ensureProjectAccess, getWorkspaceIdsForUser } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { logger } from "./utils/logger";
import type { AuditLogDoc } from "./models/auditLog";

const router = Router();

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

async function canViewAuditLogs(
  userId: ObjectId,
  workspaceId?: ObjectId | null,
  projectId?: ObjectId | null
): Promise<boolean> {
  if (workspaceId) {
    const role = await getMemberRole(workspaceId, userId);
    return !!role && (role === "owner" || role === "admin");
  }
  if (projectId) {
    const hasAccess = await ensureProjectAccess(projectId, userId);
    if (!hasAccess) return false;
    const db = await getDb();
    const project = await db.collection<{ workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
    if (project?.workspaceId) {
      const role = await getMemberRole(project.workspaceId, userId);
      return !!role && (role === "owner" || role === "admin");
    }
    return true;
  }
  return true;
}

function toPublicItem(doc: AuditLogDoc) {
  return {
    id: doc._id.toString(),
    ownerUserId: doc.ownerUserId.toString(),
    actorUserId: doc.actorUserId.toString(),
    actorEmail: doc.actorEmail,
    workspaceId: doc.workspaceId?.toString() ?? null,
    projectId: doc.projectId?.toString() ?? null,
    actionType: doc.actionType,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId,
    metadata: doc.metadata,
    ip: doc.ip,
    userAgent: doc.userAgent,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

router.get("/audit-logs", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseObjectId(String(req.query.workspaceId ?? ""));
    const projectId = parseObjectId(String(req.query.projectId ?? ""));
    const actorUserId = parseObjectId(String(req.query.actorUserId ?? ""));
    const actionType = typeof req.query.actionType === "string" ? req.query.actionType.trim() : "";
    const resourceType = typeof req.query.resourceType === "string" ? req.query.resourceType.trim() : "";
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "50"), 10) || 50));

    const canView = await canViewAuditLogs(req.user._id, workspaceId || undefined, projectId || undefined);
    if (!canView) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "No access to these audit logs" });
    }

    const db = await getDb();
    const col = db.collection<AuditLogDoc>("audit_logs");

    const filter: Record<string, unknown> = {};

    if (workspaceId) {
      filter.workspaceId = workspaceId;
    } else if (projectId) {
      filter.projectId = projectId;
    } else {
      const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
      filter.$or = [
        { ownerUserId: req.user._id },
        ...(workspaceIds.length > 0 ? [{ workspaceId: { $in: workspaceIds } }] : []),
      ];
    }

    if (actorUserId) filter.actorUserId = actorUserId;
    if (actionType) filter.actionType = actionType;
    if (resourceType) filter.resourceType = resourceType;
    if (status && (status === "success" || status === "failed")) filter.status = status;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime())) (filter.createdAt as Record<string, Date>).$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!Number.isNaN(to.getTime())) (filter.createdAt as Record<string, Date>).$lte = to;
      }
      if (Object.keys(filter.createdAt as object).length === 0) delete filter.createdAt;
    }

    const [items, total] = await Promise.all([
      col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      col.countDocuments(filter),
    ]);

    return res.json({
      ok: true,
      items: items.map(toPublicItem),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    logger.error({ err: error }, "[Audit] list error");
    return next(error);
  }
});

export { router as auditRoutes };
