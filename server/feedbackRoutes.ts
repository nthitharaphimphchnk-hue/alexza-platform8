import { Router, type Request, type Response, type NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";

export type FeedbackType = "bug" | "feature" | "ux" | "general";
export type FeedbackStatus = "new" | "triaged" | "in_progress" | "resolved" | "closed";
export type FeedbackPriority = "low" | "medium" | "high" | "critical";

export interface FeedbackDoc {
  _id: ObjectId;
  type: FeedbackType;
  message: string;
  email?: string;
  userId?: ObjectId | null;
  workspaceId?: ObjectId | null;
  route?: string;
  userAgent?: string;
  createdAt: Date;
  status: FeedbackStatus;
  priority?: FeedbackPriority;
  assigneeUserId?: ObjectId | null;
  internalNotes?: string;
}

const feedbackRouter = Router();

async function ensureFeedbackIndexes() {
  const db = await getDb();
  const col = db.collection<FeedbackDoc>("feedback");
  await Promise.all([
    col.createIndex({ createdAt: -1 }),
    col.createIndex({ type: 1, status: 1, createdAt: -1 }),
    col.createIndex({ userId: 1, createdAt: -1 }),
    col.createIndex({ priority: 1, status: 1, createdAt: -1 }),
    col.createIndex({ assigneeUserId: 1, status: 1, createdAt: -1 }),
  ]);
}

function normalizeType(raw: unknown): FeedbackType | null {
  if (raw === "bug") return "bug";
  if (raw === "feature" || raw === "feature_request") return "feature";
  if (raw === "ux" || raw === "ux_issue") return "ux";
  if (raw === "general") return "general";
  return null;
}

function normalizeStatus(raw: unknown): FeedbackStatus | null {
  if (raw === "new") return "new";
  if (raw === "triaged") return "triaged";
  if (raw === "in_progress") return "in_progress";
  if (raw === "resolved") return "resolved";
  if (raw === "closed") return "closed";
  // Backward compatibility for old values
  if (raw === "reviewed") return "triaged";
  return null;
}

function normalizePriority(raw: unknown): FeedbackPriority | null {
  if (raw === "low") return "low";
  if (raw === "medium") return "medium";
  if (raw === "high") return "high";
  if (raw === "critical") return "critical";
  return null;
}

function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.ADMIN_API_KEY?.trim();
  if (!configured) {
    return res
      .status(503)
      .json({ ok: false, error: "ADMIN_NOT_CONFIGURED", message: "Admin API key not configured" });
  }
  const provided =
    typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"].trim() : "";
  if (provided !== configured) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin key required" });
  }
  next();
}

feedbackRouter.post("/feedback", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    await ensureFeedbackIndexes();
    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");

    const body = req.body as {
      type?: unknown;
      message?: unknown;
      email?: unknown;
      route?: unknown;
      workspaceId?: unknown;
    };

    const type = normalizeType(body.type);
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim() : undefined;
    const route =
      typeof body.route === "string" ? body.route.trim() : undefined;

    if (!type) {
      return res
        .status(400)
        .json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid feedback type" });
    }
    if (!message) {
      return res
        .status(400)
        .json({ ok: false, error: "VALIDATION_ERROR", message: "Message is required" });
    }

    let workspaceId: ObjectId | null = null;
    if (typeof body.workspaceId === "string" && ObjectId.isValid(body.workspaceId)) {
      workspaceId = new ObjectId(body.workspaceId);
    }

    const userAgent =
      typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    const doc: Omit<FeedbackDoc, "_id"> = {
      type,
      message,
      email,
      userId: req.user._id,
      workspaceId,
      route,
      userAgent,
      createdAt: new Date(),
      status: "new",
      priority: "medium",
      assigneeUserId: null,
      internalNotes: "",
    };

    const result = await col.insertOne(doc as FeedbackDoc);

    logger.info(
      {
        feedbackId: result.insertedId.toString(),
        type,
        userId: req.user._id.toString(),
        workspaceId: workspaceId?.toString(),
        route,
      },
      "[Feedback] New feedback received"
    );

    return res.json({ ok: true, id: result.insertedId.toString() });
  } catch (error) {
    logger.error({ err: error }, "[Feedback] Failed to submit feedback");
    return next(error);
  }
});

feedbackRouter.get("/admin/feedback", requireAdminKey, async (req, res, next) => {
  try {
    await ensureFeedbackIndexes();
    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");

    const typeRaw = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const priorityRaw = typeof req.query.priority === "string" ? req.query.priority.trim() : "";
    const assigneeRaw = typeof req.query.assignee === "string" ? req.query.assignee.trim() : "";
    const dateFromRaw = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateToRaw = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";

    const filter: Record<string, unknown> = {};

    const type = normalizeType(typeRaw || undefined);
    if (type) {
      filter.type = type;
    }

    const normalizedStatus = normalizeStatus(statusRaw || undefined);
    if (normalizedStatus) {
      filter.status = normalizedStatus;
    }

    const priority = normalizePriority(priorityRaw || undefined);
    if (priority) {
      filter.priority = priority;
    }

    if (assigneeRaw === "assigned") {
      filter.assigneeUserId = { $ne: null };
    } else if (assigneeRaw === "unassigned") {
      filter.$or = [{ assigneeUserId: null }, { assigneeUserId: { $exists: false } }];
    }

    if (dateFromRaw || dateToRaw) {
      const createdAt: Record<string, Date> = {};
      if (dateFromRaw) {
        const from = new Date(dateFromRaw);
        if (!Number.isNaN(from.getTime())) {
          createdAt.$gte = from;
        }
      }
      if (dateToRaw) {
        const to = new Date(dateToRaw);
        if (!Number.isNaN(to.getTime())) {
          createdAt.$lte = to;
        }
      }
      if (Object.keys(createdAt).length > 0) {
        filter.createdAt = createdAt;
      }
    }

    const items = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return res.json({
      ok: true,
      items: items.map((doc) => ({
        id: doc._id.toString(),
        type: doc.type,
        message: doc.message,
        email: doc.email,
        userId: doc.userId ? doc.userId.toString() : null,
        workspaceId: doc.workspaceId ? doc.workspaceId.toString() : null,
        route: doc.route,
        userAgent: doc.userAgent,
        createdAt: doc.createdAt,
        status: normalizeStatus(doc.status) ?? "new",
        priority: normalizePriority(doc.priority) ?? "medium",
        assigneeUserId: doc.assigneeUserId ? doc.assigneeUserId.toString() : null,
        internalNotes: doc.internalNotes ?? "",
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "[Feedback] Failed to list feedback");
    return next(error);
  }
});

feedbackRouter.patch("/admin/feedback/:id", requireAdminKey, async (req, res, next) => {
  try {
    const rawId = req.params.id?.trim();
    if (!rawId || !ObjectId.isValid(rawId)) {
      return res
        .status(400)
        .json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid feedback id" });
    }
    const id = new ObjectId(rawId);

    const body = req.body as {
      status?: unknown;
      priority?: unknown;
      assigneeUserId?: unknown;
      internalNotes?: unknown;
    };

    const update: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const s = normalizeStatus(body.status);
      if (!s) {
        return res
          .status(400)
          .json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid status" });
      }
      update.status = s;
    }

    if (body.priority !== undefined) {
      const p = normalizePriority(body.priority);
      if (!p) {
        return res
          .status(400)
          .json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid priority" });
      }
      update.priority = p;
    }

    if (body.assigneeUserId !== undefined) {
      if (body.assigneeUserId === null || body.assigneeUserId === "") {
        update.assigneeUserId = null;
      } else if (
        typeof body.assigneeUserId === "string" &&
        ObjectId.isValid(body.assigneeUserId)
      ) {
        update.assigneeUserId = new ObjectId(body.assigneeUserId);
      } else {
        return res
          .status(400)
          .json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid assigneeUserId" });
      }
    }

    if (body.internalNotes !== undefined) {
      if (typeof body.internalNotes !== "string") {
        return res
          .status(400)
          .json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid internalNotes" });
      }
      update.internalNotes = body.internalNotes.slice(0, 5000);
    }

    if (Object.keys(update).length === 0) {
      return res.json({ ok: true, updated: false });
    }

    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");

    const result = await col.updateOne({ _id: id }, { $set: update });

    logger.info(
      {
        feedbackId: id.toString(),
        updatedFields: Object.keys(update),
      },
      "[Feedback] Admin triage update"
    );

    return res.json({ ok: true, updated: result.matchedCount > 0 });
  } catch (error) {
    logger.error({ err: error }, "[Feedback] Failed to update feedback");
    return next(error);
  }
});

feedbackRouter.get("/admin/feedback/stats", requireAdminKey, async (_req, res, next) => {
  try {
    await ensureFeedbackIndexes();
    const db = await getDb();
    const col = db.collection<FeedbackDoc>("feedback");

    const [byStatus, byPriority, byType] = await Promise.all([
      col
        .aggregate<{ _id: FeedbackStatus | null; count: number }>([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      col
        .aggregate<{ _id: FeedbackPriority | null; count: number }>([
          {
            $group: {
              _id: "$priority",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      col
        .aggregate<{ _id: FeedbackType | null; count: number }>([
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    return res.json({
      ok: true,
      byStatus: byStatus.reduce(
        (acc, row) => {
          const key = normalizeStatus(row._id ?? "new") ?? "new";
          acc[key] = row.count;
          return acc;
        },
        {} as Record<FeedbackStatus, number>
      ),
      byPriority: byPriority.reduce(
        (acc, row) => {
          const key = normalizePriority(row._id ?? "medium") ?? "medium";
          acc[key] = row.count;
          return acc;
        },
        {} as Record<FeedbackPriority, number>
      ),
      byType: byType.reduce(
        (acc, row) => {
          const key = (row._id ?? "general") as FeedbackType;
          acc[key] = row.count;
          return acc;
        },
        {} as Record<FeedbackType, number>
      ),
    });
  } catch (error) {
    logger.error({ err: error }, "[Feedback] Failed to load feedback stats");
    return next(error);
  }
});

export { feedbackRouter };


