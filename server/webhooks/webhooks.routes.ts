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

    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));

    const db = await getDb();
    const epCol = db.collection<WebhookEndpointDoc>("webhook_endpoints");
    const endpoint = await epCol.findOne({ _id: new ObjectId(id), ownerUserId: req.user._id });
    if (!endpoint) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const delCol = db.collection("webhook_deliveries");
    const deliveries = await delCol
      .find({ endpointId: endpoint._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return res.json({
      ok: true,
      deliveries: deliveries.map((d: { _id: ObjectId; event: string; status: string; attemptCount: number; lastStatusCode?: number; lastError?: string; latencyMs?: number; createdAt: Date }) => ({
        id: d._id.toString(),
        event: d.event,
        status: d.status,
        attemptCount: d.attemptCount,
        lastStatusCode: d.lastStatusCode,
        lastError: d.lastError,
        latencyMs: d.latencyMs,
        createdAt: d.createdAt,
      })),
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
