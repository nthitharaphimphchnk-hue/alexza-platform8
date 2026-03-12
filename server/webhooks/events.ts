/**
 * Webhook event emitter - fire-and-forget dispatch to registered endpoints.
 * Uses queue (BullMQ) when REDIS_URL is set, otherwise runs inline.
 */

import type { ObjectId } from "mongodb";
import type { WebhookEventType } from "./types";
import { enqueueWebhookDelivery } from "../queue/enqueue";
import { logger } from "../utils/logger";

export type WebhookPayload = Record<string, unknown>;

/** Emit a webhook event. Non-blocking; enqueues or dispatches in background. */
export function emitWebhookEvent(params: {
  event: WebhookEventType;
  payload: WebhookPayload;
  ownerUserId: ObjectId;
  projectId?: ObjectId | null;
}): void {
  enqueueWebhookDelivery(params).catch((err) => {
    logger.warn({ err: String(err), event: params.event }, "[Webhooks] Enqueue/dispatch failed");
  });
}
