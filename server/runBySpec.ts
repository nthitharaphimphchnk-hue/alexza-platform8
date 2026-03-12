/**
 * Runtime by Spec - POST /v1/projects/:projectId/run/:actionName
 * Hidden Gateway: never expose provider/model/upstream/base URLs to client.
 */

import Ajv, { type ValidateFunction } from "ajv";
import { Router, type Response } from "express";
import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import {
  InsufficientBalanceError,
  reserveCredits,
  refundCredits,
  deductAdditionalCredits,
  creditsFromTokens,
} from "./wallet";
import { estimateTokensFromInput } from "./utils/tokenEstimator";
import { MAX_CREDITS_PER_REQUEST, MAX_INPUT_CHARS } from "./config";
import { requireApiKey } from "./middleware/requireApiKey";
import { requireApiScope } from "./middleware/requireApiScope";
import { rateLimitByIp } from "./middleware/rateLimitByIp";
import { rateLimitByPlan } from "./middleware/rate-limit-by-plan";
import { logUsage } from "./usage";
import { logRun } from "./runLogs";
import { logApiRequest } from "./apiRequests";
import { runWithFallback } from "./providers";
import { sanitizeForResponse } from "./utils/sanitize";
import type { RoutingMode } from "./modelRegistry";
import type { ProjectActionDoc } from "./models/types";
import type { ProviderType } from "./models/types";
import { checkCostGuard } from "./ai/cost-guard";
import { checkUsageGuard } from "./ai/usage-guard";
import { selectModelsForAction } from "./ai/model-router";
import { logger } from "./utils/logger";
import { runInputSafetyCheck, runOutputSafetyCheck, recordSafetyEvent } from "./ai/safety-guard";

const router = Router();
const ajv = new Ajv({ allErrors: true, strict: false });

function getExecutionProvider(): ProviderType {
  const key = process.env.OPENROUTER_API_KEY;
  if (key && key.trim().length > 0) return "openrouter";
  return "openai";
}

function parseProjectId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

/** Normalized error - no upstream info, no stack traces, includes requestId */
function runError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId: string
) {
  return res.status(statusCode).json({
    ok: false,
    error: { code, message },
    requestId,
  });
}


function substituteVariables(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(String(value ?? ""));
  }
  return result;
}

/**
 * Normalize request body to { input: object } contract.
 * - If body.input is object → use as-is.
 * - If body.input is string and schema expects object with single property "text" → map to { input: { text } }.
 * - Otherwise require { input: object }.
 */
function normalizeRequestBody(
  body: Record<string, unknown>,
  schema: Record<string, unknown> | null
): { normalized: Record<string, unknown>; variables: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Body must be { input: {...} }" };
  }

  const input = body.input;

  // Case 1: input is object → variables = input (template uses {{text}}, {{topic}}, etc.)
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return { normalized: body, variables: input as Record<string, unknown> };
  }

  // Case 2: input is string - backward compat
  if (typeof input === "string") {
    const inputSchema = schema?.properties && typeof schema.properties === "object" ? (schema.properties as Record<string, unknown>).input : undefined;
    const inputSchemaObj = inputSchema && typeof inputSchema === "object" ? (inputSchema as Record<string, unknown>) : undefined;
    const props = inputSchemaObj?.properties;
    if (props && typeof props === "object") {
      const keys = Object.keys(props as Record<string, unknown>);
      if (keys.length === 1 && keys[0] === "text") {
        const normalized = { ...body, input: { text: input } };
        return { normalized, variables: { text: input } };
      }
    }
    // Schema has input as string (e.g. { input: { type: "string" } }) - template uses {{input}}
    return { normalized: body, variables: { input } };
  }

  return { error: "Body must be { input: {...} }" };
}

/** GET /v1/projects/:projectId/jobs/:requestId - Poll async job result */
router.get(
  "/projects/:projectId/jobs/:requestId",
  requireApiKey,
  requireApiScope("run:actions"),
  async (req, res) => {
    const projectIdRaw = req.params.projectId;
    const requestId = req.params.requestId?.trim();
    if (!req.apiKey || !requestId) {
      return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    const projectId = parseProjectId(projectIdRaw);
    if (!projectId || req.apiKey.projectId.toString() !== projectId.toString()) {
      return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Job not found" } });
    }
    const db = await getDb();
    const job = await db.collection("ai_job_results").findOne({
      requestId,
      projectId: projectIdRaw,
      ownerUserId: req.apiKey.ownerUserId,
    });
    if (!job) {
      return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Job not found" } });
    }
    const status = job.status as string;
    if (status === "completed") {
      return res.json({
        ok: true,
        requestId,
        status: "completed",
        output: job.output,
        creditsCharged: job.creditsCharged,
        usage: job.totalTokens != null ? { tokens: job.totalTokens } : undefined,
        completedAt: job.completedAt,
      });
    }
    if (status === "failed") {
      return res.json({
        ok: false,
        requestId,
        status: "failed",
        error: job.error,
        completedAt: job.completedAt,
      });
    }
    return res.json({
      ok: true,
      requestId,
      status: status || "queued",
    });
  }
);

router.post(
  "/projects/:projectId/run/:actionName",
  rateLimitByIp,
  requireApiKey,
  requireApiScope("run:actions"),
  rateLimitByPlan,
  async (req, res) => {
    const startMs = Date.now();
    const projectIdRaw = req.params.projectId;
    const actionName = req.params.actionName?.trim();

    const requestId = randomUUID();

    if (!req.apiKey) {
      return runError(res, 401, "UNAUTHORIZED", "Unauthorized", requestId);
    }

    const source = req.headers["x-playground"] === "true" ? ("playground" as const) : undefined;

    const projectId = parseProjectId(projectIdRaw);
    if (!projectId) {
      return runError(res, 404, "NOT_FOUND", "Project not found", requestId);
    }

    if (req.apiKey.projectId.toString() !== projectId.toString()) {
      return runError(res, 403, "FORBIDDEN", "API key does not belong to this project", requestId);
    }

    if (!actionName) {
      return runError(res, 400, "VALIDATION_ERROR", "Action name is required", requestId);
    }

      const safeLogUsage = async (params: {
      statusCode: number;
      status: "success" | "error";
      endpoint?: string;
      provider?: string;
      model?: string;
      inputTokens?: number | null;
      outputTokens?: number | null;
      totalTokens?: number | null;
      actionDoc?: ProjectActionDoc | null;
      routingMode?: RoutingMode;
    }) => {
      if (!req.apiKey) return;
      try {
        const execProvider = getExecutionProvider();
        const mode = params.routingMode ?? "quality";
        const decision = params.actionDoc
          ? selectModelsForAction({ action: params.actionDoc, routingMode: mode, provider: execProvider })
          : null;
        const modelList = decision?.models ?? [];
        await logUsage({
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          endpoint: params.endpoint ?? `/v1/projects/${projectIdRaw}/run/${actionName}`,
          statusCode: params.statusCode,
          status: params.status,
          provider: params.provider ?? execProvider,
          model: params.model ?? decision?.primaryModel ?? modelList[0] ?? "default",
          inputTokens: params.inputTokens ?? null,
          outputTokens: params.outputTokens ?? null,
          totalTokens: params.totalTokens ?? null,
          latencyMs: Date.now() - startMs,
        });
      } catch {
        // never fail run for logging
      }
    };

    const body = (req.body as Record<string, unknown>) ?? {};
    try {
      const db = await getDb();
      const [project, action] = await Promise.all([
        db.collection<{ routingMode?: RoutingMode; workspaceId?: ObjectId }>("projects").findOne(
          { _id: projectId },
          { projection: { routingMode: 1, workspaceId: 1 } }
        ),
        db.collection<ProjectActionDoc>("project_actions").findOne({ projectId, actionName }),
      ]);

      const routingMode: RoutingMode = project?.routingMode && ["cheap", "balanced", "quality"].includes(project.routingMode)
        ? project.routingMode
        : "quality";

      if (process.env.NODE_ENV !== "production") {
        console.log(`[Runtime] routingMode=${routingMode}`);
      }

      if (!action) {
        const latencyMs = Date.now() - startMs;
        await safeLogUsage({ statusCode: 404, status: "error", actionDoc: null, routingMode });
        await logRun({
          requestId,
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          actionName,
          status: "error",
          statusCode: 404,
          latencyMs,
        });
        await logApiRequest({
          id: requestId,
          ownerUserId: req.apiKey.ownerUserId,
          projectId: req.apiKey.projectId,
          actionName,
          status: "error",
          latencyMs,
          error: "Action not found",
          source,
          input: body && typeof body === "object" ? (body as Record<string, unknown>) : undefined,
        });
        return runError(res, 404, "NOT_FOUND", "Action not found", requestId);
      }

      const schema = action.inputSchema as Record<string, unknown> | null;

      const normResult = normalizeRequestBody(body, schema && typeof schema === "object" ? schema : null);
      if ("error" in normResult) {
        const latencyMs = Date.now() - startMs;
        await safeLogUsage({ statusCode: 400, status: "error", actionDoc: action, routingMode });
        await logRun({
          requestId,
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          actionName,
          status: "error",
          statusCode: 400,
          latencyMs,
        });
        await logApiRequest({
          id: requestId,
          ownerUserId: req.apiKey.ownerUserId,
          projectId: req.apiKey.projectId,
          actionName,
          status: "error",
          latencyMs,
          error: normResult.error,
          source,
          input: body && typeof body === "object" ? (body as Record<string, unknown>) : undefined,
        });
        return runError(res, 400, "VALIDATION_ERROR", normResult.error, requestId);
      }

      const { normalized, variables } = normResult;

      // Validate normalized body against action.inputSchema (ajv)
      if (schema && typeof schema === "object") {
        let validate: ValidateFunction;
        try {
          validate = ajv.compile(schema);
        } catch (schemaErr) {
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 500, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "error",
            statusCode: 500,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "error",
            latencyMs,
            error: "Invalid action schema",
            source,
            input: body && typeof body === "object" ? (body as Record<string, unknown>) : undefined,
          });
          return runError(res, 500, "RUNTIME_ERROR", "Invalid action schema", requestId);
        }
        const valid = validate(normalized);
        if (!valid && validate.errors?.length) {
          const firstErr = validate.errors[0];
          const msg =
            firstErr?.instancePath && firstErr?.message
              ? `${firstErr.instancePath}: ${firstErr.message}`
              : "Body must be { input: {...} }";
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 400, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "error",
            statusCode: 400,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "error",
            latencyMs,
            error: msg,
            source,
            input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
          });
          return runError(res, 400, "VALIDATION_ERROR", msg, requestId);
        }
      }

      // Input safety guard on normalized body / variables
      try {
        const inputText = JSON.stringify(
          normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : {}
        );
        const inputCheck = await runInputSafetyCheck({
          text: inputText,
          direction: "input",
          userId: req.apiKey.ownerUserId,
          projectId: req.apiKey.projectId,
          actionId: (action as ProjectActionDoc & { _id: ObjectId })._id,
        });
        if (inputCheck.ruleTriggered) {
          await recordSafetyEvent({
            ctx: {
              text: inputText,
              direction: "input",
              userId: req.apiKey.ownerUserId,
              projectId: req.apiKey.projectId,
              actionId: (action as ProjectActionDoc & { _id: ObjectId })._id,
            },
            ruleTriggered: inputCheck.ruleTriggered,
            decision: inputCheck.decision,
          });
        }
        if (inputCheck.decision === "block") {
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 400, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "error",
            statusCode: 400,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "error",
            latencyMs,
            error: "Blocked by safety guard (input)",
            source,
            input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
          });
          return runError(res, 400, "SAFETY_INPUT_BLOCKED", "Request blocked by safety guard", requestId);
        }
      } catch {
        // If safety guard fails, continue; do not break runtime.
      }

      const prompt = substituteVariables(action.promptTemplate, variables);
      if (prompt.length > MAX_INPUT_CHARS) {
        const latencyMs = Date.now() - startMs;
        await safeLogUsage({ statusCode: 400, status: "error", actionDoc: action, routingMode });
        await logRun({
          requestId,
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          actionName,
          status: "error",
          statusCode: 400,
          latencyMs,
        });
        await logApiRequest({
          id: requestId,
          ownerUserId: req.apiKey.ownerUserId,
          projectId: req.apiKey.projectId,
          actionName,
          status: "error",
          latencyMs,
          error: "Input too long",
          source,
          input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
        });
        return runError(res, 400, "REQUEST_TOO_LARGE", "Input too long", requestId);
      }

      const executionProvider = getExecutionProvider();
      const decision = selectModelsForAction({ action, routingMode, provider: executionProvider });
      let modelList = decision.models;

      const estimatedTokens = estimateTokensFromInput(prompt);
      const estimatedCredits = Math.min(
        Math.max(1, creditsFromTokens(estimatedTokens)),
        MAX_CREDITS_PER_REQUEST
      );

      // Usage guardrails: enforce per-user monthly usage limits before any cost guard or wallet reservation.
      try {
        const usageDecision = await checkUsageGuard({
          userId: req.apiKey.ownerUserId,
          estimatedCredits,
        });

        if (usageDecision.status === "block") {
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 429, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "failed_usage_limit",
            statusCode: 429,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "failed_usage_limit",
            latencyMs,
            error: "Monthly usage limit reached",
            source,
            input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
          });
          return res.status(429).json({
            ok: false,
            error: { code: "USAGE_LIMIT_REACHED", message: "Monthly usage limit reached" },
            requestId,
          });
        }

        // For "warn" we just continue; logs/events are written inside the guard.
      } catch {
        // If usage guard fails, do not block execution.
      }

      // Cost guard: enforce budgets and per-request limits before reserving credits
      try {
        const cgDecision = await checkCostGuard({
          workspaceId: project?.workspaceId ?? null,
          projectId,
          actionId: (action as ProjectActionDoc & { _id: ObjectId })._id,
          model: decision.primaryModel,
          estimatedCredits,
        });

        if (cgDecision.decision === "block") {
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 402, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "failed_insufficient_credits",
            statusCode: 402,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "failed_insufficient_credits",
            latencyMs,
            error: cgDecision.reason ?? "Cost guard blocked request",
            source,
            input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
          });
          return res.status(402).json({
            ok: false,
            error: { code: "COST_GUARD_BLOCKED", message: cgDecision.reason ?? "Request blocked by cost guard" },
            requestId,
          });
        }

        if (cgDecision.decision === "fallback" && cgDecision.fallbackModel) {
          modelList = [cgDecision.fallbackModel, ...modelList.filter((m) => m !== cgDecision.fallbackModel)];
        }

        // For "warn", we simply continue; clients could read logs for context.
      } catch {
        // If cost guard fails, default to normal execution to avoid breaking runtime.
      }

      const asyncMode = req.headers["x-async"] === "true" || req.query.async === "1";
      const { isQueueEnabled } = await import("./queue/config");
      const useAsyncQueue = asyncMode && isQueueEnabled();

      let reserved = false;
      try {
        await reserveCredits({
          userId: req.apiKey.ownerUserId,
          estimatedCredits,
          requestId,
        });
        reserved = true;
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 402, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "failed_insufficient_credits",
            statusCode: 402,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "failed_insufficient_credits",
            latencyMs,
            error: "Insufficient balance",
            source,
            input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
          });
          return res.status(402).json({
            ok: false,
            error: { code: "INSUFFICIENT_BALANCE", message: "Insufficient balance" },
            requiredCredits: err.requiredCredits,
            balanceCredits: err.balanceCredits,
            requestId,
          });
        }
        throw err;
      }

      if (useAsyncQueue) {
        const db = await getDb();
        await db.collection("ai_job_results").insertOne({
          requestId,
          projectId: projectIdRaw,
          actionName,
          status: "queued",
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const { enqueueAiRunJob } = await import("./queue/enqueue");
        await enqueueAiRunJob({
          requestId,
          projectId: projectIdRaw,
          actionName,
          input: variables,
          ownerUserId: req.apiKey.ownerUserId.toString(),
          apiKeyId: req.apiKey._id.toString(),
          estimatedCredits,
          routingMode,
        });
        return res.status(202).json({
          ok: true,
          requestId,
          status: "queued",
          message: "Job queued for background processing",
        });
      }

      let result;
      try {
        result = await runWithFallback({
          provider: executionProvider,
          models: modelList,
          prompt,
          temperature: action.temperature,
          maxTokens: action.maxTokens,
        });
      } catch (providerErr) {
        if (reserved) {
          await refundCredits({
            userId: req.apiKey.ownerUserId,
            refundCredits: estimatedCredits,
            requestId,
            meta: { reason: "Provider failed", actionName },
          });
        }
        throw providerErr;
      }

      const resolvedModel = result._resolvedModel ?? action.model ?? decision.primaryModel;

      if (resolvedModel && resolvedModel !== decision.primaryModel) {
        logger.info(
          {
            requestId,
            actionName,
            projectId: req.apiKey.projectId,
            primaryModel: decision.primaryModel,
            resolvedModel,
          },
          "[ModelRouter] Fallback model used"
        );
      }

      const totalTokens = result.usage?.total_tokens ?? null;
      const actualCredits =
        typeof totalTokens === "number"
          ? Math.max(1, creditsFromTokens(totalTokens))
          : estimatedCredits;

      const cappedCredits = Math.min(actualCredits, MAX_CREDITS_PER_REQUEST);

      if (cappedCredits < estimatedCredits) {
        await refundCredits({
          userId: req.apiKey.ownerUserId,
          refundCredits: estimatedCredits - cappedCredits,
          requestId,
          meta: { actionName, actualCredits: cappedCredits },
        });
      } else if (cappedCredits > estimatedCredits) {
        const additional = cappedCredits - estimatedCredits;
        try {
          await deductAdditionalCredits({
            userId: req.apiKey.ownerUserId,
            additionalCredits: additional,
            requestId,
            meta: { actionName, totalTokens },
          });
        } catch (extraErr) {
          if (extraErr instanceof InsufficientBalanceError) {
            await refundCredits({
              userId: req.apiKey.ownerUserId,
              refundCredits: estimatedCredits,
              requestId,
              meta: { reason: "Insufficient for actual usage", actionName },
            });
            await safeLogUsage({ statusCode: 402, status: "error", actionDoc: action, routingMode });
            const latencyMs = Date.now() - startMs;
            await logRun({
              requestId,
              projectId: req.apiKey.projectId,
              ownerUserId: req.apiKey.ownerUserId,
              apiKeyId: req.apiKey._id,
              actionName,
              status: "failed_insufficient_credits",
              statusCode: 402,
              latencyMs,
            });
            await logApiRequest({
              id: requestId,
              ownerUserId: req.apiKey.ownerUserId,
              projectId: req.apiKey.projectId,
              actionName,
              status: "failed_insufficient_credits",
              latencyMs,
              error: "Insufficient balance for actual usage",
              source,
              input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
            });
            return res.status(402).json({
              ok: false,
              error: { code: "INSUFFICIENT_BALANCE", message: "Insufficient balance for actual usage" },
              requiredCredits: additional,
              balanceCredits: extraErr.balanceCredits,
              requestId,
            });
          }
          throw extraErr;
        }
      }

      await safeLogUsage({
        statusCode: 200,
        status: "success",
        provider: executionProvider,
        model: resolvedModel,
        inputTokens: result.usage?.prompt_tokens ?? null,
        outputTokens: result.usage?.completion_tokens ?? null,
        totalTokens,
      });

      const { recordBillingLedger } = await import("./billing/ledger");
      await recordBillingLedger({
        requestId,
        userId: req.apiKey.ownerUserId,
        projectId: req.apiKey.projectId,
        apiKeyId: req.apiKey._id,
        actionName,
        provider: executionProvider,
        model: resolvedModel ?? "unknown",
        inputTokens: result.usage?.prompt_tokens ?? 0,
        outputTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: totalTokens ?? 0,
        creditsCharged: cappedCredits,
      }).catch(() => {});

      // Output safety guard
      let finalOutput = result.output ?? "";
      try {
        const outputCheck = await runOutputSafetyCheck({
          text: finalOutput,
          direction: "output",
          userId: req.apiKey.ownerUserId,
          projectId: req.apiKey.projectId,
          actionId: (action as ProjectActionDoc & { _id: ObjectId })._id,
        });
        if (outputCheck.ruleTriggered) {
          await recordSafetyEvent({
            ctx: {
              text: finalOutput,
              direction: "output",
              userId: req.apiKey.ownerUserId,
              projectId: req.apiKey.projectId,
              actionId: (action as ProjectActionDoc & { _id: ObjectId })._id,
            },
            ruleTriggered: outputCheck.ruleTriggered,
            decision: outputCheck.decision,
          });
        }
        if (outputCheck.decision === "block") {
          const latencyMs = Date.now() - startMs;
          await safeLogUsage({ statusCode: 400, status: "error", actionDoc: action, routingMode });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "error",
            statusCode: 400,
            latencyMs,
          });
          await logApiRequest({
            id: requestId,
            ownerUserId: req.apiKey.ownerUserId,
            projectId: req.apiKey.projectId,
            actionName,
            status: "error",
            latencyMs,
            error: "Blocked by safety guard (output)",
            source,
            input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
          });
          return runError(res, 400, "SAFETY_OUTPUT_BLOCKED", "Response blocked by safety guard", requestId);
        }
        if (outputCheck.decision === "sanitize" && outputCheck.sanitizedText) {
          finalOutput = outputCheck.sanitizedText;
        }
      } catch {
        // Safety guard failures should not break runtime.
      }

      // AI Evaluation - record simple quality metrics per run
      try {
        const { recordAiEvaluation } = await import("./ai/evaluator");
        await recordAiEvaluation({
          action: action as ProjectActionDoc & { _id: ObjectId },
          model: resolvedModel ?? "unknown",
          latencyMs,
          totalTokens: totalTokens ?? 0,
          inputTokens: result.usage?.prompt_tokens ?? 0,
          outputTokens: result.usage?.completion_tokens ?? 0,
          succeeded: true,
          output: result.output ?? "",
        });
      } catch {
        // Never fail user request if evaluation logging fails
      }

      const latencyMs = Date.now() - startMs;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[RunBySpec] ${requestId} action=${actionName} credits=${cappedCredits} latency=${latencyMs}ms`);
      }
      await logRun({
        requestId,
        projectId: req.apiKey.projectId,
        ownerUserId: req.apiKey.ownerUserId,
        apiKeyId: req.apiKey._id,
        actionName,
        status: "success",
        statusCode: 200,
        latencyMs,
        upstreamProvider: executionProvider,
        upstreamModel: resolvedModel,
      });
      await logApiRequest({
        id: requestId,
        ownerUserId: req.apiKey.ownerUserId,
        projectId: req.apiKey.projectId,
        actionName,
        status: "success",
        tokensUsed: totalTokens ?? 0,
        latencyMs,
        source,
        input: normalized && typeof normalized === "object" ? (normalized as Record<string, unknown>) : undefined,
      });

      const { emitWebhookEvent } = await import("./webhooks/events");
      emitWebhookEvent({
        event: "action.run.succeeded",
        payload: {
          requestId,
          projectId: projectIdRaw,
          actionName,
          creditsCharged: cappedCredits,
          latencyMs,
          output: result.output,
        },
        ownerUserId: req.apiKey.ownerUserId,
        projectId: req.apiKey.projectId,
      });

      return res.json({
        ok: true,
        requestId,
        output: finalOutput,
        creditsCharged: cappedCredits,
        usage: {
          tokens: totalTokens ?? undefined,
          creditsCharged: cappedCredits,
        },
        latencyMs,
      });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      ((error as Error & { isTimeout?: boolean }).isTimeout ||
        error.message.toLowerCase().includes("timeout") ||
        error.message.toLowerCase().includes("abort"));

    const statusCode = isTimeout ? 504 : 502;
    const latencyMs = Date.now() - startMs;
    const errMsg = sanitizeForResponse(error);

    await safeLogUsage({
      statusCode,
      status: "error",
      actionDoc: undefined,
      routingMode: "quality",
    });

    await logRun({
      requestId,
      projectId: req.apiKey.projectId,
      ownerUserId: req.apiKey.ownerUserId,
      apiKeyId: req.apiKey._id,
      actionName,
      status: "error",
      statusCode,
      latencyMs,
      rawUpstreamError: errMsg,
    });

    await logApiRequest({
      id: requestId,
      ownerUserId: req.apiKey.ownerUserId,
      projectId: req.apiKey.projectId,
      actionName,
      status: "error",
      latencyMs,
      error: errMsg,
      source,
      input:
        typeof body === "object" && body ? (body as Record<string, unknown>) : undefined,
    });

    if (req.apiKey) {
      const { emitWebhookEvent } = await import("./webhooks/events");
      emitWebhookEvent({
        event: "action.run.failed",
        payload: {
          requestId,
          projectId: projectIdRaw,
          actionName,
          statusCode,
          latencyMs,
          error: sanitizeForResponse(error),
        },
        ownerUserId: req.apiKey.ownerUserId,
        projectId: req.apiKey.projectId,
      });
    }

    if (isTimeout) {
      return res.status(504).json({
        error: "upstream_timeout",
        message: "The upstream AI provider took too long to respond.",
      });
    }

    return runError(res, 502, "RUNTIME_ERROR", "Request failed", requestId);
  }
});

export { router as runBySpecRouter };
