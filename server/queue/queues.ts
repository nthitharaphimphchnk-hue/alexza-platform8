/**
 * BullMQ queue definitions - ai_runs, webhook_deliveries, workflow_jobs, email_jobs.
 */

import { createQueue } from "./config";

export const AI_RUNS_QUEUE = "ai_runs";
export const WEBHOOK_DELIVERIES_QUEUE = "webhook_deliveries";
export const WORKFLOW_JOBS_QUEUE = "workflow_jobs";
export const EMAIL_JOBS_QUEUE = "email_jobs";

export interface AiRunJobData {
  requestId: string;
  projectId: string;
  actionName: string;
  input: Record<string, unknown>;
  ownerUserId: string;
  apiKeyId: string;
  estimatedCredits: number;
  routingMode?: string;
}

export interface WebhookDeliveryJobData {
  deliveryId: string;
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
}

export interface WorkflowJobData {
  workflowId: string;
  triggerPayload?: Record<string, unknown>;
}

export interface EmailJobData {
  type: "low_credits";
  userId: string;
  toOverride?: string;
}

let aiRunsQueue: ReturnType<typeof createQueue<AiRunJobData>> | null = null;
let webhookDeliveriesQueue: ReturnType<typeof createQueue<WebhookDeliveryJobData>> | null = null;
let workflowJobsQueue: ReturnType<typeof createQueue<WorkflowJobData>> | null = null;
let emailJobsQueue: ReturnType<typeof createQueue<EmailJobData>> | null = null;

function getOrCreateQueue<T>(name: string): ReturnType<typeof createQueue<T>> {
  const queue = createQueue<T>(name);
  return queue;
}

export function getAiRunsQueue() {
  if (!aiRunsQueue) aiRunsQueue = getOrCreateQueue<AiRunJobData>(AI_RUNS_QUEUE);
  return aiRunsQueue;
}

export function getWebhookDeliveriesQueue() {
  if (!webhookDeliveriesQueue) webhookDeliveriesQueue = getOrCreateQueue<WebhookDeliveryJobData>(WEBHOOK_DELIVERIES_QUEUE);
  return webhookDeliveriesQueue;
}

export function getWorkflowJobsQueue() {
  if (!workflowJobsQueue) workflowJobsQueue = getOrCreateQueue<WorkflowJobData>(WORKFLOW_JOBS_QUEUE);
  return workflowJobsQueue;
}

export function getEmailJobsQueue() {
  if (!emailJobsQueue) emailJobsQueue = getOrCreateQueue<EmailJobData>(EMAIL_JOBS_QUEUE);
  return emailJobsQueue;
}
