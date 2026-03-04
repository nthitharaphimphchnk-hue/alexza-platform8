/**
 * Webhook event emitter - fire-and-forget dispatch to registered endpoints.
 */

import type { ObjectId } from "mongodb";
import type { WebhookEventType } from "./types";
import { dispatchWebhookEvent } from "./dispatcher";
import { logger } from "../utils/logger";

export type WebhookPayload = Record<string, unknown>;

/** Emit a webhook event. Non-blocking; dispatches in background. */
export function emitWebhookEvent(params: {
  event: WebhookEventType;
  payload: WebhookPayload;
  ownerUserId: ObjectId;
  projectId?: ObjectId | null;
}): void {
  dispatchWebhookEvent(params).catch((err) => {
    logger.warn({ err: String(err), event: params.event }, "[Webhooks] Dispatch failed");
  });
}
