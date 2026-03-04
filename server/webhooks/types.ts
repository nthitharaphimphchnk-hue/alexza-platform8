/**
 * Webhook types - endpoints and deliveries.
 */

import type { ObjectId } from "mongodb";

/** Supported webhook event types */
export const WEBHOOK_EVENTS = [
  "auth.user.created",
  "wallet.topup.succeeded",
  "wallet.low_balance",
  "action.run.succeeded",
  "action.run.failed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookEndpointDoc {
  _id: ObjectId;
  ownerUserId: ObjectId;
  projectId: ObjectId | null;
  url: string;
  enabled: boolean;
  events: WebhookEventType[];
  secret: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryStatus = "pending" | "success" | "failed";

export interface WebhookDeliveryDoc {
  _id: ObjectId;
  endpointId: ObjectId;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  attemptCount: number;
  status: DeliveryStatus;
  lastStatusCode?: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
