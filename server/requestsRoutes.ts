/**
 * API Request Logs - user-facing request history.
 * GET /api/requests (paginated, filters)
 * GET /api/requests/:id (detail)
 * POST /api/requests/:id/replay (replay request)
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { requireAuthOrApiKey } from "./middleware/requireAuthOrApiKey";
import { requireApiScope } from "./middleware/requireApiScope";
import { getWorkspaceIdsForUser } from "./workspaces/projectAccess";
import { logger } from "./utils/logger";
import { createTemporaryKeyForReplay, revokeKeyById } from "./keys";
import { logAuditEvent } from "./audit/logAuditEvent";
import { getAuditContext } from "./audit/auditContext";
import type { ApiRequestDoc } from "./apiRequests";

const PAGE_SIZE = 50;
const router = Router();

function parsePage(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? "1"), 10);
  return Number.isNaN(n) || n < 1 ? 1 : n;
}

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

router.get("/requests", requireAuthOrApiKey, requireApiScope("read:requests"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const page = parsePage(req.query.page);
    const projectIdRaw = typeof req.query.projectId === "string" ? req.query.projectId.trim() : "";
    const actionNameRaw = typeof req.query.actionName === "string" ? req.query.actionName.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const fromRaw = req.query.from;
    const toRaw = req.query.to;

    const db = await getDb();
    const col = db.collection<ApiRequestDoc>("api_requests");
    const projects = db.collection<{ _id: ObjectId; name?: string; ownerUserId?: ObjectId; workspaceId?: ObjectId }>("projects");

    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    const projectFilter =
      workspaceIds.length > 0
        ? { $or: [{ ownerUserId: req.user._id }, { workspaceId: { $in: workspaceIds } }] }
        : { ownerUserId: req.user._id };
    const projectIds = await projects
      .find(projectFilter)
      .project({ _id: 1 })
      .toArray()
      .then((rows) => rows.map((r) => r._id));

    const filter: Record<string, unknown> = {
      projectId: { $in: projectIds },
    };

    if (projectIdRaw && ObjectId.isValid(projectIdRaw)) {
      filter.projectId = new ObjectId(projectIdRaw);
    }
    if (actionNameRaw) {
      filter.actionName = actionNameRaw;
    }
    if (statusRaw && ["success", "error", "failed_insufficient_credits"].includes(statusRaw)) {
      filter.status = statusRaw;
    }

    const from = parseDate(fromRaw);
    const to = parseDate(toRaw);
    if (from || to) {
      filter.createdAt = {};
      if (from) (filter.createdAt as Record<string, Date>).$gte = from;
      if (to) (filter.createdAt as Record<string, Date>).$lte = to;
    }

    const skip = (page - 1) * PAGE_SIZE;
    const [total, rows] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .toArray(),
    ]);

    const projectIdsForLookup = [...new Set(rows.map((r) => r.projectId.toString()))];
    const projectList = await projects
      .find({ _id: { $in: projectIdsForLookup.map((id) => new ObjectId(id)) } })
      .toArray();
    const projectMap = new Map(projectList.map((p) => [p._id.toString(), p]));

    const items = rows.map((r) => ({
      id: r.id,
      projectId: r.projectId.toString(),
      projectName: projectMap.get(r.projectId.toString())?.name ?? "",
      actionName: r.actionName,
      status: r.status,
      tokensUsed: r.tokensUsed,
      latencyMs: r.latencyMs,
      error: r.error,
      createdAt: r.createdAt,
    }));

    return res.json({
      ok: true,
      requests: items,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Requests] list error");
    return next(error);
  }
});

router.get("/requests/:id", requireAuthOrApiKey, requireApiScope("read:requests"), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = (req.params.id ?? "").trim();
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const col = db.collection<ApiRequestDoc>("api_requests");
    const projects = db.collection<{ _id: ObjectId; name: string; ownerUserId?: ObjectId; workspaceId?: ObjectId }>("projects");

    const doc = await col.findOne({ id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
    const project = await projects.findOne({ _id: doc.projectId });
    if (!project) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const hasAccess =
      project.ownerUserId?.equals(req.user._id) ||
      (project.workspaceId && workspaceIds.some((wid) => wid.equals(project.workspaceId!)));
    if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({
      ok: true,
      request: {
        id: doc.id,
        projectId: doc.projectId.toString(),
        projectName: project.name,
        actionName: doc.actionName,
        status: doc.status,
        tokensUsed: doc.tokensUsed,
        latencyMs: doc.latencyMs,
        error: doc.error,
        createdAt: doc.createdAt,
        canReplay: Boolean(doc.input && typeof doc.input === "object" && Object.keys(doc.input).length > 0),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Requests] detail error");
    return next(error);
  }
});

router.post(
  "/requests/:id/replay",
  requireAuth,
  requireApiScope("run:actions"),
  async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

      const id = (req.params.id ?? "").trim();
      if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

      const db = await getDb();
      const col = db.collection<ApiRequestDoc>("api_requests");
      const projects = db.collection<{ _id: ObjectId; name: string; ownerUserId?: ObjectId; workspaceId?: ObjectId }>("projects");

      const doc = await col.findOne({ id });
      if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

      const workspaceIds = await getWorkspaceIdsForUser(req.user._id);
      const project = await projects.findOne({ _id: doc.projectId });
      if (!project) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

      const hasAccess =
        project.ownerUserId?.equals(req.user._id) ||
        (project.workspaceId && workspaceIds.some((wid) => wid.equals(project.workspaceId!)));
      if (!hasAccess) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

      const input = doc.input;
      if (!input || typeof input !== "object" || Object.keys(input).length === 0) {
        return res.status(400).json({
          ok: false,
          error: "REPLAY_NOT_AVAILABLE",
          message: "Request cannot be replayed: no stored input",
        });
      }

      const projectIdStr = doc.projectId.toString();
      const actionName = doc.actionName;
      const payload = input as Record<string, unknown>;

      let rawKey: string | null = null;
      let keyId: ObjectId | null = null;
      try {
        const keyResult = await createTemporaryKeyForReplay(doc.projectId, doc.ownerUserId);
        rawKey = keyResult.rawKey;
        keyId = keyResult.keyId;
      } catch (keyErr) {
        logger.error({ err: keyErr, requestId: id }, "[Requests] replay: failed to create temp key");
        return res.status(500).json({
          ok: false,
          error: "REPLAY_FAILED",
          message: "Failed to create replay key",
        });
      }

      const baseUrl =
        process.env.API_BASE_URL ||
        (req.protocol && req.get("host") ? `${req.protocol}://${req.get("host")}` : `http://127.0.0.1:${process.env.PORT ?? 3002}`);
      const runUrl = `${baseUrl}/v1/projects/${projectIdStr}/run/${encodeURIComponent(actionName)}`;

      logger.info(
        { requestId: id, projectId: projectIdStr, actionName, actorUserId: req.user._id.toString() },
        "[Requests] replay: starting"
      );

      let fetchRes: Response;
      try {
        fetchRes = await fetch(runUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rawKey}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        logger.error({ err: fetchErr, requestId: id }, "[Requests] replay: fetch failed");
        await revokeKeyById(keyId!);
        return res.status(502).json({
          ok: false,
          error: "REPLAY_FAILED",
          message: "Failed to execute replay",
        });
      } finally {
        await revokeKeyById(keyId!);
      }

      const resultJson = await fetchRes.json().catch(() => ({}));

      const { ip, userAgent } = getAuditContext(req);
      logAuditEvent({
        ownerUserId: doc.ownerUserId,
        actorUserId: req.user._id,
        actorEmail: (req.user as { email?: string }).email ?? "",
        workspaceId: project.workspaceId ?? null,
        projectId: doc.projectId,
        actionType: "request.replayed",
        resourceType: "api_request",
        resourceId: id,
        metadata: { actionName, statusCode: fetchRes.status },
        ip,
        userAgent,
        status: fetchRes.ok ? "success" : "error",
      });

      logger.info(
        {
          requestId: id,
          statusCode: fetchRes.status,
          actorUserId: req.user._id.toString(),
        },
        "[Requests] replay: completed"
      );

      return res.status(fetchRes.status).json(resultJson);
    } catch (error) {
      logger.error({ err: error }, "[Requests] replay error");
      return next(error);
    }
  }
);

export { router as requestsRouter };
