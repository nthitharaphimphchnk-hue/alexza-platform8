/**
 * Workflow engine - executes steps sequentially.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";
import { WEBHOOK_TIMEOUT_MS, WORKFLOW_STEP_TIMEOUT_MS } from "../config";
import type { WorkflowDoc, WorkflowStepDoc } from "./types";

export interface ExecutionContext {
  workflowId: ObjectId;
  triggerPayload?: Record<string, unknown>;
  /** Accumulated output from previous steps */
  data: Record<string, unknown>;
}

export interface StepResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

/** Execute a workflow by ID. Returns final context or throws. */
export async function executeWorkflow(
  workflowId: ObjectId,
  triggerPayload?: Record<string, unknown>
): Promise<ExecutionContext> {
  const db = await getDb();
  const workflow = await db.collection<WorkflowDoc>("workflows").findOne({ _id: workflowId });
  if (!workflow) throw new Error("Workflow not found");
  if (!workflow.enabled) throw new Error("Workflow is disabled");

  const steps = await db
    .collection<WorkflowStepDoc>("workflow_steps")
    .find({ workflowId })
    .sort({ order: 1 })
    .toArray();

  const ctx: ExecutionContext = {
    workflowId,
    triggerPayload,
    data: {
      trigger: triggerPayload ?? {},
      _ownerUserId: workflow.ownerUserId,
    },
  };

  for (const step of steps) {
    const result = await executeStep(step, ctx);
    if (!result.success) {
      logger.warn({ workflowId: workflowId.toString(), stepId: (step as WorkflowStepDoc & { _id: ObjectId })._id.toString(), error: result.error }, "[Workflow] Step failed");
      throw new Error(result.error ?? "Step failed");
    }
    if (result.output) {
      ctx.data[`step_${(step as WorkflowStepDoc & { _id: ObjectId })._id.toString()}`] = result.output;
    }
  }

  return ctx;
}

async function executeStep(
  step: WorkflowStepDoc & { _id: ObjectId },
  ctx: ExecutionContext
): Promise<StepResult> {
  const config = step.config ?? {};

  switch (step.type) {
    case "trigger":
      return { success: true, output: ctx.triggerPayload };
    case "action":
      return executeAction(config, ctx);
    case "output":
      return executeOutput(config, ctx);
    default:
      return { success: false, error: `Unknown step type: ${step.type}` };
  }
}

async function executeAction(config: Record<string, unknown>, ctx: ExecutionContext): Promise<StepResult> {
  const kind = config.kind as string;
  switch (kind) {
    case "run_ai_action": {
      const projectId = config.projectId as string;
      const actionName = config.actionName as string;
      const input = (config.input as Record<string, unknown>) ?? ctx.data.trigger ?? {};
      if (!projectId || !actionName) {
        return { success: false, error: "run_ai_action requires projectId and actionName" };
      }
      try {
        const ownerUserId = ctx.data._ownerUserId;
        if (!ownerUserId || !(ownerUserId instanceof ObjectId)) {
          return { success: false, error: "Workflow owner not set" };
        }
        const { runWorkflowAction } = await import("./runAction");
        const result = await runWorkflowAction({
          projectId,
          actionName,
          input: typeof input === "object" ? input : {},
          ownerUserId,
        });
        return { success: true, output: { output: result.output, usage: result.usage } };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    case "call_webhook": {
      const url = config.url as string;
      const method = (config.method as string) || "POST";
      const headers = (config.headers as Record<string, string>) ?? {};
      if (!url) return { success: false, error: "call_webhook requires url" };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WORKFLOW_STEP_TIMEOUT_MS);
      try {
        const body = ctx.data.trigger ?? {};
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body: ["POST", "PUT", "PATCH"].includes(method) ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const text = await res.text();
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        return { success: res.ok, output: { status: res.status, data: json } };
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          return { success: false, error: "Workflow step timed out" };
        }
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    default:
      return { success: false, error: `Unknown action kind: ${kind}` };
  }
}

async function executeOutput(config: Record<string, unknown>, ctx: ExecutionContext): Promise<StepResult> {
  const kind = config.kind as string;
  switch (kind) {
    case "send_webhook": {
      const url = config.url as string;
      const method = (config.method as string) || "POST";
      const headers = (config.headers as Record<string, string>) ?? {};
      if (!url) return { success: false, error: "send_webhook requires url" };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      try {
        const body = ctx.data;
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return { success: true };
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          return { success: false, error: "Workflow step timed out" };
        }
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    case "log_result": {
      const level = (config.level as string) || "info";
      logger[level === "warn" ? "warn" : level === "error" ? "error" : "info"]({ workflowId: ctx.workflowId.toString(), data: ctx.data }, "[Workflow] log_result");
      return { success: true };
    }
    default:
      return { success: false, error: `Unknown output kind: ${kind}` };
  }
}
