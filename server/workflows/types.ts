/**
 * Workflow and workflow step types.
 */

import type { ObjectId } from "mongodb";

export type StepType = "trigger" | "action" | "output";

export type TriggerKind = "webhook" | "api_event" | "schedule";
export type ActionKind = "run_ai_action" | "call_webhook";
export type OutputKind = "send_webhook" | "log_result";

export interface WorkflowDoc {
  name: string;
  workspaceId: ObjectId;
  ownerUserId: ObjectId;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStepDoc {
  workflowId: ObjectId;
  type: StepType;
  /** Step order for sequential execution (0 = first) */
  order: number;
  config: Record<string, unknown>;
  /** Optional: next step ID for branching (null = continue to next by order) */
  nextStepId?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Trigger configs */
export interface WebhookTriggerConfig {
  kind: "webhook";
  path?: string;
}

export interface ApiEventTriggerConfig {
  kind: "api_event";
  event: string;
  projectId?: string;
}

export interface ScheduleTriggerConfig {
  kind: "schedule";
  cron: string;
}

/** Action configs */
export interface RunAiActionConfig {
  kind: "run_ai_action";
  projectId: string;
  actionName: string;
  input?: Record<string, unknown>;
}

export interface CallWebhookConfig {
  kind: "call_webhook";
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
}

/** Output configs */
export interface SendWebhookOutputConfig {
  kind: "send_webhook";
  url: string;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
}

export interface LogResultOutputConfig {
  kind: "log_result";
  level?: "info" | "warn" | "error";
}
