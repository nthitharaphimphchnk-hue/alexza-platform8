/**
 * Admin-only run logs - internal debug (upstreamProvider, upstreamModel, etc.)
 * Requires x-admin-key header.
 */

import { Router, type Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import type { RunLogDoc } from "./runLogs";

const router = Router();

function requireAdminKey(req: { headers: Record<string, unknown> }, res: Response, next: () => void) {
  const key = process.env.ADMIN_API_KEY;
  const provided = typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"] : "";
  if (!key || key.trim().length === 0 || provided !== key) {
    res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin key required" });
    return;
  }
  next();
}

// GET /api/admin/run-logs - list recent run logs with internal debug fields
router.get("/admin/run-logs", requireAdminKey, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const db = await getDb();
    const logs = await db
      .collection<RunLogDoc>("run_logs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({
      ok: true,
      logs: logs.map((l) => ({
        requestId: l.requestId,
        projectId: l.projectId.toString(),
        actionName: l.actionName,
        status: l.status,
        statusCode: l.statusCode,
        latencyMs: l.latencyMs,
        upstreamProvider: l.upstreamProvider,
        upstreamModel: l.upstreamModel,
        upstreamRequestId: l.upstreamRequestId,
        upstreamLatencyMs: l.upstreamLatencyMs,
        rawUpstreamError: l.rawUpstreamError,
        createdAt: l.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/run-logs/:requestId - get single run log by requestId
router.get("/admin/run-logs/:requestId", requireAdminKey, async (req, res, next) => {
  try {
    const requestId = req.params.requestId?.trim();
    if (!requestId) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "requestId required" });
    }

    const db = await getDb();
    const log = await db.collection<RunLogDoc>("run_logs").findOne({ requestId });
    if (!log) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Run log not found" });
    }

    res.json({
      ok: true,
      log: {
        requestId: log.requestId,
        projectId: log.projectId.toString(),
        ownerUserId: log.ownerUserId.toString(),
        actionName: log.actionName,
        status: log.status,
        statusCode: log.statusCode,
        latencyMs: log.latencyMs,
        upstreamProvider: log.upstreamProvider,
        upstreamModel: log.upstreamModel,
        upstreamRequestId: log.upstreamRequestId,
        upstreamLatencyMs: log.upstreamLatencyMs,
        rawUpstreamError: log.rawUpstreamError,
        createdAt: log.createdAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

export { router as adminRunLogsRouter };
