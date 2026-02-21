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
  InsufficientCreditsError,
  MonthlyQuotaExceededError,
  RUN_COST_CREDITS,
  TOKENS_PER_CREDIT,
  deductCreditsForUsage,
  refundCreditsFromRun,
} from "./credits";
import { MAX_CREDITS_PER_REQUEST, MAX_INPUT_CHARS } from "./config";
import { requireApiKey } from "./middleware/requireApiKey";
import { rateLimitByIp } from "./middleware/rateLimitByIp";
import { rateLimitByApiKey } from "./middleware/rateLimitByApiKey";
import { logUsage } from "./usage";
import { logRun } from "./runLogs";
import { runWithFallback } from "./providers";
import { sanitizeForResponse } from "./utils/sanitize";
import {
  QUALITY_MODELS,
  QUALITY_MODELS_OPENAI,
} from "./modelRegistry";
import type { ProjectActionDoc } from "./models/types";
import type { ProviderType } from "./models/types";

const router = Router();
const ajv = new Ajv({ allErrors: true, strict: false });

function getExecutionProvider(): ProviderType {
  const key = process.env.OPENROUTER_API_KEY;
  if (key && key.trim().length > 0) return "openrouter";
  return "openai";
}

function getQualityModels(provider: ProviderType): string[] {
  return provider === "openrouter" ? QUALITY_MODELS : QUALITY_MODELS_OPENAI;
}

function toOpenAIModelId(model: string): string {
  if (model.startsWith("openai/")) return model.slice(7);
  return model;
}

function resolveModelList(
  action: ProjectActionDoc,
  provider: ProviderType
): string[] {
  const qualityModels = getQualityModels(provider);
  const fallbacks =
    action.fallbackModels && Array.isArray(action.fallbackModels) && action.fallbackModels.length > 0
      ? action.fallbackModels.filter((m): m is string => typeof m === "string")
      : qualityModels.slice(1);

  const primary = action.model?.trim() || qualityModels[0];
  const models = [primary, ...fallbacks];
  if (provider === "openai") {
    return models.map(toOpenAIModelId);
  }
  return models;
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

router.post(
  "/v1/projects/:projectId/run/:actionName",
  rateLimitByIp,
  requireApiKey,
  rateLimitByApiKey,
  async (req, res) => {
    const startMs = Date.now();
    const projectIdRaw = req.params.projectId;
    const actionName = req.params.actionName?.trim();

    const requestId = randomUUID();

    if (!req.apiKey) {
      return runError(res, 401, "UNAUTHORIZED", "Unauthorized", requestId);
    }

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
    }) => {
      if (!req.apiKey) return;
      try {
        const execProvider = getExecutionProvider();
        const modelList = params.actionDoc
          ? resolveModelList(params.actionDoc, execProvider)
          : [];
        await logUsage({
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          endpoint: params.endpoint ?? `/v1/projects/${projectIdRaw}/run/${actionName}`,
          statusCode: params.statusCode,
          status: params.status,
          provider: params.provider ?? execProvider,
          model: params.model ?? modelList[0] ?? "default",
          inputTokens: params.inputTokens ?? null,
          outputTokens: params.outputTokens ?? null,
          totalTokens: params.totalTokens ?? null,
          latencyMs: Date.now() - startMs,
        });
      } catch {
        // never fail run for logging
      }
    };

    try {
      const db = await getDb();
      const action = await db
        .collection<ProjectActionDoc>("project_actions")
        .findOne({ projectId, actionName });

      if (!action) {
        await safeLogUsage({ statusCode: 404, status: "error", actionDoc: null });
        await logRun({
          requestId,
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          actionName,
          status: "error",
          statusCode: 404,
          latencyMs: Date.now() - startMs,
        });
        return runError(res, 404, "NOT_FOUND", "Action not found", requestId);
      }

      const body = (req.body as Record<string, unknown>) ?? {};
      const schema = action.inputSchema as Record<string, unknown> | null;

      const normResult = normalizeRequestBody(body, schema && typeof schema === "object" ? schema : null);
      if ("error" in normResult) {
        await safeLogUsage({ statusCode: 400, status: "error" });
        await logRun({
          requestId,
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          actionName,
          status: "error",
          statusCode: 400,
          latencyMs: Date.now() - startMs,
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
          await safeLogUsage({ statusCode: 500, status: "error" });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "error",
            statusCode: 500,
            latencyMs: Date.now() - startMs,
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
          await safeLogUsage({ statusCode: 400, status: "error" });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "error",
            statusCode: 400,
            latencyMs: Date.now() - startMs,
          });
          return runError(res, 400, "VALIDATION_ERROR", msg, requestId);
        }
      }

      const prompt = substituteVariables(action.promptTemplate, variables);
      if (prompt.length > MAX_INPUT_CHARS) {
        await safeLogUsage({ statusCode: 400, status: "error" });
        await logRun({
          requestId,
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          actionName,
          status: "error",
          statusCode: 400,
          latencyMs: Date.now() - startMs,
        });
        return runError(res, 400, "REQUEST_TOO_LARGE", "Input too long", requestId);
      }

      const executionProvider = getExecutionProvider();
      const modelList = resolveModelList(action, executionProvider);

      try {
        await deductCreditsForUsage({
          userId: req.apiKey.ownerUserId,
          costCredits: MAX_CREDITS_PER_REQUEST,
          reason: `Reserve for run: ${actionName}`,
          relatedRunId: requestId,
        });
      } catch (err) {
        if (err instanceof MonthlyQuotaExceededError) {
          await safeLogUsage({ statusCode: 402, status: "error", actionDoc: action });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "failed_insufficient_credits",
            statusCode: 402,
            latencyMs: Date.now() - startMs,
          });
          return runError(res, 402, "MONTHLY_QUOTA_EXCEEDED", "Monthly quota exceeded", requestId);
        }
        if (err instanceof InsufficientCreditsError) {
          await safeLogUsage({ statusCode: 402, status: "error", actionDoc: action });
          await logRun({
            requestId,
            projectId: req.apiKey.projectId,
            ownerUserId: req.apiKey.ownerUserId,
            apiKeyId: req.apiKey._id,
            actionName,
            status: "failed_insufficient_credits",
            statusCode: 402,
            latencyMs: Date.now() - startMs,
          });
          return runError(res, 402, "INSUFFICIENT_CREDITS", "Not enough credits", requestId);
        }
        throw err;
      }

      const result = await runWithFallback({
        provider: executionProvider,
        models: modelList,
        prompt,
        temperature: action.temperature,
        maxTokens: action.maxTokens,
      });

      const resolvedModel = result._resolvedModel ?? action.model;

      const totalTokens = result.usage?.total_tokens ?? null;
      const creditsCharged =
        typeof totalTokens === "number"
          ? Math.max(RUN_COST_CREDITS, Math.ceil(totalTokens / TOKENS_PER_CREDIT))
          : RUN_COST_CREDITS;

      const cappedCredits = Math.min(creditsCharged, MAX_CREDITS_PER_REQUEST);
      if (cappedCredits < MAX_CREDITS_PER_REQUEST) {
        await refundCreditsFromRun({
          userId: req.apiKey.ownerUserId,
          amountCredits: MAX_CREDITS_PER_REQUEST - cappedCredits,
          reason: `Refund excess reserve: ${actionName}`,
          relatedRunId: requestId,
        });
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

      const latencyMs = Date.now() - startMs;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[RunBySpec] ${requestId} action=${actionName} credits=${creditsCharged} latency=${latencyMs}ms`);
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

      return res.json({
        ok: true,
        requestId,
        output: result.output,
        creditsCharged: cappedCredits,
        usage: {
          tokens: totalTokens ?? undefined,
          creditsCharged: cappedCredits,
        },
        latencyMs,
      });
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      await safeLogUsage({ statusCode: 502, status: "error" });
      await logRun({
        requestId,
        projectId: req.apiKey.projectId,
        ownerUserId: req.apiKey.ownerUserId,
        apiKeyId: req.apiKey._id,
        actionName,
        status: "error",
        statusCode: 502,
        latencyMs,
        rawUpstreamError: sanitizeForResponse(error),
      });
      return runError(res, 502, "RUNTIME_ERROR", "Request failed", requestId);
    }
  }
);

export { router as runBySpecRouter };
