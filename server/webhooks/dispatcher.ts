/**
 * Webhook dispatcher - send POST to endpoint URLs with signature, retries, delivery logs.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";
import { getCurrentRegionId } from "../config/regions";
import { computeWebhookSignature } from "./signature";
import { WEBHOOK_TIMEOUT_MS } from "../config";
import type { WebhookEventType, WebhookEndpointDoc, DeliveryStatus } from "./types";

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000]; // 1m, 5m, 30m
const MAX_ATTEMPTS = 1 + RETRY_DELAYS_MS.length;

let collectionsReady: Promise<void> | null = null;

export async function ensureWebhookCollections(): Promise<void> {
  if (!collectionsReady) {
    collectionsReady = (async () => {
      const db = await getDb();
      await db.collection("webhook_endpoints").createIndex({ ownerUserId: 1 });
      await db.collection("webhook_endpoints").createIndex({ projectId: 1 });
      await db.collection("webhook_deliveries").createIndex({ endpointId: 1, createdAt: -1 });
      await db.collection("webhook_deliveries").createIndex({ status: 1, nextRetryAt: 1 });
    })();
  }
  await collectionsReady;
}

async function fetchEndpointsForEvent(
  event: WebhookEventType,
  ownerUserId: ObjectId,
  projectId?: ObjectId | null
): Promise<WebhookEndpointDoc[]> {
  const db = await getDb();
  const col = db.collection<WebhookEndpointDoc>("webhook_endpoints");
  const filter: Record<string, unknown> = {
    ownerUserId,
    enabled: true,
    events: event,
  };
  if (projectId) {
    filter.$or = [{ projectId: null }, { projectId }];
  } else {
    filter.projectId = null;
  }
  const docs = await col.find(filter as Parameters<typeof col.find>[0]).toArray();
  return docs;
}

async function createDelivery(
  endpointId: ObjectId,
  event: WebhookEventType,
  payload: Record<string, unknown>,
  status: DeliveryStatus,
  attemptCount: number,
  nextRetryAt?: Date,
  lastStatusCode?: number,
  lastError?: string,
  latencyMs?: number
): Promise<ObjectId> {
  const db = await getDb();
  const now = new Date();
  const result = await db.collection("webhook_deliveries").insertOne({
    endpointId,
    event,
    payload,
    attemptCount,
    status,
    lastStatusCode,
    lastError,
    latencyMs,
    nextRetryAt,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId;
}

export async function updateDelivery(
  deliveryId: ObjectId,
  status: DeliveryStatus,
  attemptCount: number,
  lastStatusCode?: number,
  lastError?: string,
  nextRetryAt?: Date,
  latencyMs?: number
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = {
    status,
    attemptCount,
    lastStatusCode,
    lastError,
    nextRetryAt,
    updatedAt: new Date(),
  };
  if (latencyMs != null) set.latencyMs = latencyMs;
  await db.collection("webhook_deliveries").updateOne({ _id: deliveryId }, { $set: set });
}

export async function sendWebhookRequest(
  url: string,
  event: WebhookEventType,
  payload: Record<string, unknown>,
  secret: string
): Promise<{ statusCode: number; ok: boolean; error?: string; latencyMs: number }> {
  const regionId = getCurrentRegionId();
  const payloadWithRegion = regionId ? { ...payload, region: regionId } : payload;
  const timestamp = String(Date.now());
  const rawBody = JSON.stringify(payloadWithRegion);
  const signature = computeWebhookSignature(secret, timestamp, rawBody);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  const startMs = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Alexza-Event": event,
    "X-Alexza-Timestamp": timestamp,
    "X-Alexza-Signature": signature,
  };
  if (regionId) headers["X-Alexza-Region"] = regionId;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startMs;
    const ok = res.status >= 200 && res.status < 300;
    let error: string | undefined;
    if (!ok) {
      const text = await res.text();
      error = text?.slice(0, 500) || `HTTP ${res.status}`;
    }
    return { statusCode: res.status, ok, error, latencyMs };
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    const latencyMs = Date.now() - startMs;
    return { statusCode: 0, ok: false, error: msg, latencyMs };
  }
}

export async function dispatchWebhookEvent(params: {
  event: WebhookEventType;
  payload: Record<string, unknown>;
  ownerUserId: ObjectId;
  projectId?: ObjectId | null;
}): Promise<void> {
  await ensureWebhookCollections();

  const endpoints = await fetchEndpointsForEvent(
    params.event,
    params.ownerUserId,
    params.projectId ?? null
  );

  if (endpoints.length === 0) return;

  for (const ep of endpoints) {
    const deliveryId = await createDelivery(
      ep._id,
      params.event,
      params.payload,
      "pending",
      1,
      undefined,
      undefined,
      undefined
    );

    const attempt = async (attemptCount: number): Promise<void> => {
      const result = await sendWebhookRequest(ep.url, params.event, params.payload, ep.secret);

      if (result.ok) {
        await updateDelivery(deliveryId, "success", attemptCount, result.statusCode, undefined, undefined, result.latencyMs);
        logger.info(
          { endpointId: ep._id.toString(), event: params.event, attemptCount, latencyMs: result.latencyMs },
          "[Webhooks] Delivery success"
        );
        return;
      }

      const isLastAttempt = attemptCount >= MAX_ATTEMPTS;
      const delayMs = RETRY_DELAYS_MS[attemptCount - 1];
      const nextRetryAt = isLastAttempt ? undefined : new Date(Date.now() + delayMs);

      if (isLastAttempt) {
        await updateDelivery(
          deliveryId,
          "failed",
          attemptCount,
          result.statusCode,
          result.error,
          undefined,
          result.latencyMs
        );
        logger.warn(
          { endpointId: ep._id.toString(), event: params.event, attemptCount, error: result.error },
          "[Webhooks] Delivery failed after retries"
        );
      } else {
        await updateDelivery(
          deliveryId,
          "pending",
          attemptCount,
          result.statusCode,
          result.error,
          nextRetryAt,
          result.latencyMs
        );
        logger.info(
          { endpointId: ep._id.toString(), event: params.event, attemptCount, nextRetryAt },
          "[Webhooks] Delivery failed, will retry"
        );
        setTimeout(() => attempt(attemptCount + 1), delayMs);
      }
    };

    attempt(1).catch((err) => {
      logger.error({ err, endpointId: ep._id.toString() }, "[Webhooks] Dispatch attempt failed");
    });
  }
}

/** Manual retry of a failed delivery. Returns result for API response. */
export async function retryWebhookDelivery(params: {
  endpointId: ObjectId;
  deliveryId: ObjectId;
  ownerUserId: ObjectId;
}): Promise<
  | { ok: true; deliveryId: string; status: string; statusCode?: number; latencyMs?: number }
  | { ok: false; error: string; statusCode: number }
> {
  await ensureWebhookCollections();

  const db = await getDb();
  const epCol = db.collection<WebhookEndpointDoc>("webhook_endpoints");
  const endpoint = await epCol.findOne({ _id: params.endpointId, ownerUserId: params.ownerUserId });
  if (!endpoint) {
    return { ok: false, error: "NOT_FOUND", statusCode: 404 };
  }

  const delCol = db.collection("webhook_deliveries");
  const delivery = await delCol.findOne({
    _id: params.deliveryId,
    endpointId: params.endpointId,
  });
  if (!delivery) {
    return { ok: false, error: "NOT_FOUND", statusCode: 404 };
  }

  const payload = (delivery.payload as Record<string, unknown>) || {};
  const event = delivery.event as WebhookEventType;
  const result = await sendWebhookRequest(endpoint.url, event, payload, endpoint.secret);

  const attemptCount = (delivery.attemptCount as number) + 1;
  if (result.ok) {
    await updateDelivery(
      params.deliveryId,
      "success",
      attemptCount,
      result.statusCode,
      undefined,
      undefined,
      result.latencyMs
    );
    logger.info(
      { endpointId: params.endpointId.toString(), deliveryId: params.deliveryId.toString(), latencyMs: result.latencyMs },
      "[Webhooks] Manual retry success"
    );
    return {
      ok: true,
      deliveryId: params.deliveryId.toString(),
      status: "success",
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
    };
  }

  await updateDelivery(
    params.deliveryId,
    "failed",
    attemptCount,
    result.statusCode,
    result.error,
    undefined,
    result.latencyMs
  );
  logger.warn(
    { endpointId: params.endpointId.toString(), deliveryId: params.deliveryId.toString(), error: result.error },
    "[Webhooks] Manual retry failed"
  );
  const statusCode = result.statusCode >= 400 ? result.statusCode : 502;
  return {
    ok: false,
    error: result.error || "Delivery failed",
    statusCode,
  };
}
