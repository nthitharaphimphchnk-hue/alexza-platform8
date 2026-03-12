/**
 * Enqueue helpers - add jobs to queues.
 * Used by routes and workers.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import {
  getWebhookDeliveriesQueue,
  getWorkflowJobsQueue,
  getEmailJobsQueue,
  getAiRunsQueue,
} from "./queues";
import type { WebhookEventType } from "../webhooks/types";
import type { WebhookEndpointDoc } from "../webhooks/types";
import { isQueueEnabled } from "./config";
import { logger } from "../utils/logger";

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

/** Create delivery record and enqueue webhook delivery job (or run inline if queue disabled). */
export async function enqueueWebhookDelivery(params: {
  event: WebhookEventType;
  payload: Record<string, unknown>;
  ownerUserId: ObjectId;
  projectId?: ObjectId | null;
}): Promise<void> {
  const { ensureWebhookCollections } = await import("../webhooks/dispatcher");
  await ensureWebhookCollections();

  const db = await getDb();
  const endpoints = await fetchEndpointsForEvent(
    params.event,
    params.ownerUserId,
    params.projectId ?? null
  );

  if (endpoints.length === 0) return;

  if (isQueueEnabled()) {
    const queue = getWebhookDeliveriesQueue();
    for (const ep of endpoints) {
      const now = new Date();
      const result = await db.collection("webhook_deliveries").insertOne({
        endpointId: ep._id,
        event: params.event,
        payload: params.payload,
        attemptCount: 1,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      const deliveryId = result.insertedId;
      await queue.add(
        "deliver",
        {
          deliveryId: deliveryId.toString(),
          endpointId: ep._id.toString(),
          event: params.event,
          payload: params.payload,
        },
        { jobId: deliveryId.toString() }
      );
    }
    // Also trigger workflows via queue
    enqueueWorkflowTrigger({
      event: params.event,
      payload: params.payload,
      ownerUserId: params.ownerUserId,
      projectId: params.projectId,
    });
  } else {
    const { dispatchWebhookEvent } = await import("../webhooks/dispatcher");
    await dispatchWebhookEvent(params);
    const { triggerWorkflowsByApiEvent } = await import("../workflows/triggers");
    await triggerWorkflowsByApiEvent({
      event: params.event,
      payload: params.payload,
      ownerUserId: params.ownerUserId,
      projectId: params.projectId,
    });
  }
}

/** Enqueue workflow execution (or run inline if queue disabled). */
export async function enqueueWorkflowTrigger(params: {
  event: string;
  payload: Record<string, unknown>;
  ownerUserId?: ObjectId;
  projectId?: ObjectId | null;
}): Promise<void> {
  const db = await getDb();
  const steps = await db
    .collection<{ workflowId: ObjectId; config?: { kind?: string; event?: string; projectId?: string } }>("workflow_steps")
    .find({
      type: "trigger",
      "config.kind": "api_event",
      "config.event": params.event,
    })
    .toArray();

  for (const step of steps) {
    const config = step.config ?? {};
    if (params.projectId && config.projectId && config.projectId !== params.projectId.toString()) {
      continue;
    }
    const workflow = await db
      .collection<{ _id: ObjectId; enabled: boolean }>("workflows")
      .findOne({ _id: step.workflowId, enabled: true });
    if (!workflow) continue;

    if (isQueueEnabled()) {
      const queue = getWorkflowJobsQueue();
      await queue.add("execute", {
        workflowId: workflow._id.toString(),
        triggerPayload: params.payload,
      });
    } else {
      const { executeWorkflow } = await import("../workflows/engine");
      executeWorkflow(workflow._id, params.payload).catch((err) => {
        logger.warn({ err: String(err), workflowId: workflow._id.toString() }, "[Workflows] api_event trigger failed");
      });
    }
  }
}

/** Enqueue email job. */
export async function enqueueEmailJob(data: {
  type: "low_credits";
  userId: string;
  toOverride?: string;
}): Promise<void> {
  if (isQueueEnabled()) {
    const queue = getEmailJobsQueue();
    await queue.add("send", data);
  } else {
    const { sendLowCreditsEmailForUser } = await import("../notifications");
    await sendLowCreditsEmailForUser(new ObjectId(data.userId), { toOverride: data.toOverride });
  }
}

/** Enqueue AI run job. Returns requestId. */
export async function enqueueAiRunJob(data: {
  requestId: string;
  projectId: string;
  actionName: string;
  input: Record<string, unknown>;
  ownerUserId: string;
  apiKeyId: string;
  estimatedCredits: number;
  routingMode?: string;
}): Promise<void> {
  const queue = getAiRunsQueue();
  await queue.add("run", data, { jobId: data.requestId });
}
