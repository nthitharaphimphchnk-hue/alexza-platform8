/**
 * Webhooks API - CRUD for endpoints.
 * GET/POST /api/webhooks, PATCH/DELETE /api/webhooks/:id
 */

import { Router, type Request, type Response } from "express";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getDb } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { logger } from "../utils/logger";
import { WEBHOOK_EVENTS, type WebhookEndpointDoc, type WebhookEventType } from "./types";

const router = Router();

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

router.get("/webhooks", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const db = await getDb();
    const col = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const endpoints = await col
      .find({ ownerUserId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      endpoints: endpoints.map((ep) => ({
        id: ep._id.toString(),
        url: ep.url,
        enabled: ep.enabled,
        events: ep.events,
        projectId: ep.projectId?.toString() ?? null,
        createdAt: ep.createdAt,
        updatedAt: ep.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/webhooks", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const body = req.body as { url?: string; events?: string[] };
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const eventsRaw = Array.isArray(body?.events) ? body.events : [];

    if (!url || !isValidUrl(url)) {
      return res.status(400).json(validationError("Invalid or missing URL"));
    }

    const events = eventsRaw.filter((e): e is WebhookEventType =>
      typeof e === "string" && WEBHOOK_EVENTS.includes(e as WebhookEventType)
    );
    if (events.length === 0) {
      return res.status(400).json(validationError("At least one event type is required"));
    }

    const secret = `whsec_${randomBytes(32).toString("hex")}`;
    const now = new Date();

    const db = await getDb();
    const col = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const result = await col.insertOne({
      ownerUserId: req.user._id,
      projectId: null,
      url,
      enabled: true,
      events,
      secret,
      createdAt: now,
      updatedAt: now,
    });

    const id = result.insertedId.toString();
    logger.info({ endpointId: id, userId: req.user.id }, "[Webhooks] Endpoint created");

    const { getAuditContext } = await import("../audit/auditContext");
    const { logAuditEvent } = await import("../audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      actionType: "webhook.created",
      resourceType: "webhook",
      resourceId: id,
      metadata: { url, events },
      ip,
      userAgent,
      status: "success",
    });

    return res.status(201).json({
      ok: true,
      endpoint: {
        id,
        url,
        enabled: true,
        events,
        projectId: null,
        secret,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/webhooks/:id", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { url?: string; enabled?: boolean; events?: string[] };
    const updates: Partial<WebhookEndpointDoc> = { updatedAt: new Date() };

    if (typeof body?.url === "string") {
      const url = body.url.trim();
      if (!url || !isValidUrl(url)) {
        return res.status(400).json(validationError("Invalid URL"));
      }
      updates.url = url;
    }
    if (typeof body?.enabled === "boolean") updates.enabled = body.enabled;
    if (Array.isArray(body?.events)) {
      const events = body.events.filter((e): e is WebhookEventType =>
        typeof e === "string" && WEBHOOK_EVENTS.includes(e as WebhookEventType)
      );
      if (events.length > 0) updates.events = events;
    }

    const db = await getDb();
    const col = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id), ownerUserId: req.user._id },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const { getAuditContext } = await import("../audit/auditContext");
    const { logAuditEvent } = await import("../audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      actionType: "webhook.updated",
      resourceType: "webhook",
      resourceId: result._id.toString(),
      metadata: { url: result.url, enabled: result.enabled, events: result.events },
      ip,
      userAgent,
      status: "success",
    });

    return res.json({
      ok: true,
      endpoint: {
        id: result._id.toString(),
        url: result.url,
        enabled: result.enabled,
        events: result.events,
        projectId: result.projectId?.toString() ?? null,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/webhooks/:id/deliveries", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const event = typeof req.query.event === "string" ? req.query.event : undefined;
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

    const db = await getDb();
    const epCol = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const endpoint = await epCol.findOne({ _id: new ObjectId(id), ownerUserId: req.user._id });
    if (!endpoint) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const filter: Record<string, unknown> = { endpointId: endpoint._id };
    if (status && ["success", "failed", "pending"].includes(status)) {
      filter.status = status;
    }
    if (event) filter.event = event;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime())) dateFilter.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!Number.isNaN(to.getTime())) dateFilter.$lte = to;
      }
      if (Object.keys(dateFilter).length > 0) filter.createdAt = dateFilter;
    }

    const delCol = db.collection("webhook_deliveries");
    const [deliveries, total] = await Promise.all([
      delCol
        .find(filter as Parameters<typeof delCol.find>[0])
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      delCol.countDocuments(filter as Parameters<typeof delCol.countDocuments>[0]),
    ]);

    return res.json({
      ok: true,
      items: deliveries.map((d: { _id: ObjectId; event: string; status: string; attemptCount: number; lastStatusCode?: number; lastError?: string; latencyMs?: number; createdAt: Date }) => ({
        id: d._id.toString(),
        event: d.event,
        status: d.status,
        statusCode: d.lastStatusCode,
        latencyMs: d.latencyMs,
        attemptCount: d.attemptCount,
        error: d.lastError,
        createdAt: d.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/webhooks/:id/deliveries/:deliveryId", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = req.params.id;
    const deliveryId = req.params.deliveryId;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(deliveryId)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const epCol = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const endpoint = await epCol.findOne({ _id: new ObjectId(id), ownerUserId: req.user._id });
    if (!endpoint) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const delCol = db.collection("webhook_deliveries");
    const delivery = await delCol.findOne({
      _id: new ObjectId(deliveryId),
      endpointId: endpoint._id,
    });
    if (!delivery) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const headers = {
      "Content-Type": "application/json",
      "X-Alexza-Event": delivery.event,
      "X-Alexza-Timestamp": "(sent at delivery time)",
      "X-Alexza-Signature": "(redacted)",
    };

    return res.json({
      ok: true,
      delivery: {
        id: delivery._id.toString(),
        event: delivery.event,
        status: delivery.status,
        statusCode: delivery.lastStatusCode,
        latencyMs: delivery.latencyMs,
        attemptCount: delivery.attemptCount,
        error: delivery.lastError,
        payload: delivery.payload,
        headers,
        response: delivery.lastError ? { statusCode: delivery.lastStatusCode, body: delivery.lastError } : (delivery.lastStatusCode ? { statusCode: delivery.lastStatusCode } : null),
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/webhooks/:id/deliveries/:deliveryId/retry", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = req.params.id;
    const deliveryId = req.params.deliveryId;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(deliveryId)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const { retryWebhookDelivery } = await import("./dispatcher");
    const result = await retryWebhookDelivery({
      endpointId: new ObjectId(id),
      deliveryId: new ObjectId(deliveryId),
      ownerUserId: req.user._id,
    });

    if (!result.ok) {
      return res.status(result.statusCode).json({ ok: false, error: result.error });
    }

    logger.info(
      { endpointId: id, deliveryId, userId: req.user.id },
      "[Webhooks] Manual retry completed"
    );

    return res.json({
      ok: true,
      delivery: {
        id: result.deliveryId,
        status: result.status,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/webhooks/:id", requireAuth, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const col = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const result = await col.deleteOne({ _id: new ObjectId(id), ownerUserId: req.user._id });

    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const { getAuditContext } = await import("../audit/auditContext");
    const { logAuditEvent } = await import("../audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      actionType: "webhook.deleted",
      resourceType: "webhook",
      resourceId: id,
      metadata: {},
      ip,
      userAgent,
      status: "success",
    });

    logger.info({ endpointId: id, userId: req.user.id }, "[Webhooks] Endpoint deleted");
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message };
}

export { router as webhooksRouter };
