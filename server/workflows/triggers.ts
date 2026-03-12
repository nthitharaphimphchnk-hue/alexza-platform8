/**
 * Workflow triggers - api_event and schedule.
 */

import { ObjectId } from "mongodb";
import cron from "node-cron";
import { getDb } from "../db";
import { executeWorkflow } from "./engine";
import { logger } from "../utils/logger";
import type { WorkflowDoc, WorkflowStepDoc } from "./types";

/** Trigger workflows that listen for this api_event. */
export async function triggerWorkflowsByApiEvent(params: {
  event: string;
  payload: Record<string, unknown>;
  ownerUserId?: ObjectId;
  projectId?: ObjectId | null;
}): Promise<void> {
  const db = await getDb();
  const steps = await db
    .collection<WorkflowStepDoc>("workflow_steps")
    .find({
      type: "trigger",
      "config.kind": "api_event",
      "config.event": params.event,
    })
    .toArray();

  for (const step of steps) {
    const config = step.config as { projectId?: string };
    if (params.projectId && config.projectId && config.projectId !== params.projectId.toString()) {
      continue;
    }
    const workflow = await db.collection<WorkflowDoc>("workflows").findOne({ _id: step.workflowId, enabled: true });
    if (!workflow) continue;

    executeWorkflow(workflow._id, params.payload).catch((err) => {
      logger.warn({ err: String(err), workflowId: workflow._id.toString() }, "[Workflows] api_event trigger failed");
    });
  }
}

const scheduledTasks = new Map<string, { stop: () => void }>();

/** Refresh schedule triggers from DB. Call on startup and when workflows change. */
export async function refreshScheduleTriggers(): Promise<void> {
  for (const task of scheduledTasks.values()) {
    task.stop();
  }
  scheduledTasks.clear();

  const db = await getDb();
  const steps = await db
    .collection<WorkflowStepDoc>("workflow_steps")
    .find({
      type: "trigger",
      "config.kind": "schedule",
    })
    .toArray();

  for (const step of steps) {
    const config = step.config as { cron?: string };
    const cronExpr = config.cron;
    if (!cronExpr || !cron.validate(cronExpr)) continue;

    const workflow = await db.collection<WorkflowDoc>("workflows").findOne({ _id: step.workflowId, enabled: true });
    if (!workflow) continue;

    const key = workflow._id.toString();
    const task = cron.schedule(cronExpr, async () => {
      try {
        const { isQueueEnabled } = await import("../queue/config");
        const { getWorkflowJobsQueue } = await import("../queue/queues");
        if (isQueueEnabled()) {
          await getWorkflowJobsQueue().add("execute", {
            workflowId: key,
            triggerPayload: { timestamp: new Date().toISOString() },
          });
        } else {
          await executeWorkflow(workflow._id, { timestamp: new Date().toISOString() });
        }
      } catch (err) {
        logger.warn({ err: String(err), workflowId: key }, "[Workflows] schedule trigger failed");
      }
    });
    scheduledTasks.set(key, task);
  }

  logger.info({ count: scheduledTasks.size }, "[Workflows] Schedule triggers refreshed");
}
