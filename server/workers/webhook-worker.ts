/**
 * Webhook delivery worker - processes webhook_deliveries queue jobs.
 * Sends HTTP POST to endpoint URLs with signature, retries on failure.
 */

import { Worker } from "bullmq";
import { ObjectId } from "mongodb";
import { queueConfig } from "../queue/config";
import { WEBHOOK_DELIVERIES_QUEUE } from "../queue/queues";
import type { WebhookDeliveryJobData } from "../queue/queues";
import { getDb } from "../db";
import { sendWebhookRequest, updateDelivery } from "../webhooks/dispatcher";
import type { WebhookEventType } from "../webhooks/types";
import type { WebhookEndpointDoc } from "../webhooks/types";
import { logger } from "../utils/logger";

async function processWebhookDelivery(jobData: WebhookDeliveryJobData): Promise<void> {
  const { deliveryId, endpointId, event, payload } = jobData;

  const db = await getDb();
  const endpoint = await db
    .collection<WebhookEndpointDoc>("webhook_endpoints")
    .findOne({ _id: new ObjectId(endpointId) });

  if (!endpoint) {
    throw new Error(`Webhook endpoint not found: ${endpointId}`);
  }

  const result = await sendWebhookRequest(
    endpoint.url,
    event as WebhookEventType,
    payload,
    endpoint.secret
  );

  const deliveryIdObj = new ObjectId(deliveryId);
  const delivery = await db.collection("webhook_deliveries").findOne({ _id: deliveryIdObj });
  const attemptCount = delivery ? (delivery.attemptCount as number) : 1;

  if (result.ok) {
    await updateDelivery(
      deliveryIdObj,
      "success",
      attemptCount,
      result.statusCode,
      undefined,
      undefined,
      result.latencyMs
    );
    logger.info(
      { endpointId, event, attemptCount, latencyMs: result.latencyMs },
      "[Webhook Worker] Delivery success"
    );
    return;
  }

  const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];
  const MAX_ATTEMPTS = 1 + RETRY_DELAYS_MS.length;
  const isLastAttempt = attemptCount >= MAX_ATTEMPTS;
  const delayMs = RETRY_DELAYS_MS[attemptCount - 1];
  const nextRetryAt = isLastAttempt ? undefined : new Date(Date.now() + delayMs);

  if (isLastAttempt) {
    await updateDelivery(
      deliveryIdObj,
      "failed",
      attemptCount,
      result.statusCode,
      result.error,
      undefined,
      result.latencyMs
    );
    logger.warn(
      { endpointId, event, attemptCount, error: result.error },
      "[Webhook Worker] Delivery failed after retries"
    );
  } else {
    await updateDelivery(
      deliveryIdObj,
      "pending",
      attemptCount,
      result.statusCode,
      result.error,
      nextRetryAt,
      result.latencyMs
    );
    logger.info(
      { endpointId, event, attemptCount, nextRetryAt },
      "[Webhook Worker] Delivery failed, will retry"
    );
    throw new Error(result.error ?? "Delivery failed");
  }
}

export function startWebhookWorker(): Worker<WebhookDeliveryJobData> {
  const worker = new Worker<WebhookDeliveryJobData>(
    WEBHOOK_DELIVERIES_QUEUE,
    async (job) => {
      const data = job.data;
      logger.info({ deliveryId: data.deliveryId, endpointId: data.endpointId }, "[Webhook Worker] Processing job");
      await processWebhookDelivery(data);
    },
    {
      connection: queueConfig.connection,
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, deliveryId: (job.data as WebhookDeliveryJobData).deliveryId }, "[Webhook Worker] Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, deliveryId: job?.data?.deliveryId, err: String(err) },
      "[Webhook Worker] Job failed"
    );
  });

  return worker;
}
