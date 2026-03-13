/**
 * Feedback API - collect in-app feedback, bug reports, feature requests.
 * POST /api/feedback (optional auth), GET /api/admin/feedback (admin only).
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { logger } from "./utils/logger";
import { requireAuth, optionalAuth } from "./middleware/requireAuth";

export type FeedbackType = "bug" | "feature_request" | "ux_issue" | "general";
export type FeedbackStatus = "new" | "reviewed" | "closed";

export interface FeedbackDoc {
  _id: ObjectId;
  type: FeedbackType;
  message: string;
  email?: string;
  userId?: ObjectId;
  workspaceId?: ObjectId;
  route: string;
  userAgent: string;
  createdAt: Date;
  status: FeedbackStatus;
}

const router = Router();

const FEEDBACK_TYPES: FeedbackType[] = ["bug", "feature_request", "ux_issue", "general"];
const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "reviewed", "closed"];

function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.ADMIN_API_KEY?.trim();
  if (!configured) {
    return res.status(503).json({ ok: false, error: "Admin API not configured" });
  }
  const raw = req.headers["x-admin-key"];
  const provided = typeof raw === "string" ? raw.trim() : "";
  if (provided !== configured) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
  }
  next();
}

// POST /api/feedback - submit feedback (optional auth)
router.post("/feedback", optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      type?: unknown;
      message?: unknown;
      email?: unknown;
      route?: unknown;
      workspaceId?: unknown;
    };

    const typeRaw = typeof body.type === "string" ? body.type.trim() : "";
    const type = FEEDBACK_TYPES.includes(typeRaw as FeedbackType) ? (typeRaw as FeedbackType) : "general";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "message is required" });
    }

    const email = typeof body.email === "string" ? body.email.trim() || undefined : undefined;
    const route = typeof body.route === "string" ? body.route.trim() : "";
    const workspaceIdRaw = body.workspaceId;
    const workspaceId =
      typeof workspaceIdRaw === "string" && ObjectId.isValid(workspaceIdRaw)
        ? new ObjectId(workspaceIdRaw)
        : undefined;
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";

    const doc: Omit<FeedbackDoc, "_id"> = {
      type,
      message,
      email,
      userId: req.user?._id,
      workspaceId,
      route,
      userAgent,
      createdAt: new Date(),
      status: "new",
    };

    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");
    const result = await col.insertOne(doc as FeedbackDoc);

    logger.info(
      {
        feedbackId: result.insertedId.toString(),
        type: doc.type,
        userId: doc.userId?.toString(),
        route: doc.route,
      },
      "[Feedback] Submitted"
    );

    return res.status(201).json({
      ok: true,
      id: result.insertedId.toString(),
    });
  } catch (err) {
    logger.error({ err }, "[Feedback] Submit error");
    return next(err);
  }
});

// GET /api/admin/feedback - list feedback (admin only)
router.get("/admin/feedback", requireAdminKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const skip = (page - 1) * limit;

    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");

    const filter: Record<string, unknown> = {};
    if (type && FEEDBACK_TYPES.includes(type as FeedbackType)) filter.type = type;
    if (status && FEEDBACK_STATUSES.includes(status as FeedbackStatus)) filter.status = status;
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
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    const list = items.map((d) => ({
      id: d._id.toString(),
      type: d.type,
      message: d.message,
      email: d.email,
      userId: d.userId?.toString(),
      workspaceId: d.workspaceId?.toString(),
      route: d.route,
      userAgent: d.userAgent,
      createdAt: d.createdAt,
      status: d.status,
    }));

    return res.json({
      ok: true,
      items: list,
      total,
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, "[Feedback] Admin list error");
    return next(err);
  }
});

export { router as feedbackRouter };
