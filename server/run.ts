import { Router, type Response } from "express";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import {
  InsufficientCreditsError,
  MonthlyQuotaExceededError,
  RUN_COST_CREDITS,
  TOKENS_PER_CREDIT,
  deductCreditsForUsage,
  getWalletBalanceCredits,
} from "./credits";
import { getUserBillingState } from "./billing";
import { MAX_CREDITS_PER_REQUEST, MAX_ESTIMATED_TOKENS, MAX_INPUT_CHARS } from "./config";
import { requireApiKey } from "./middleware/requireApiKey";
import { rateLimitByApiKey } from "./middleware/rateLimitByApiKey";
import { logUsage } from "./usage";

interface RunRequestBody {
  input?: unknown;
}

const router = Router();
let cachedOpenAIClient: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return null;
  if (!cachedOpenAIClient) {
    cachedOpenAIClient = new OpenAI({ apiKey });
  }
  return cachedOpenAIClient;
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function estimateTokensFromInput(input: string): number {
  // Rough approximation: 1 token ~= 4 chars for mixed English/code payloads.
  return Math.ceil(input.length / 4);
}

function runError(
  res: Response,
  statusCode: number,
  error: string,
  message: string,
  details?: Record<string, unknown>
) {
  return res.status(statusCode).json({
    ok: false,
    error,
    message,
    ...(details ? { details } : {}),
  });
}

router.post("/v1/run", requireApiKey, rateLimitByApiKey, async (req, res) => {
  const startMs = Date.now();
  const provider = "openai";
  const model = getOpenAIModel();

  const safeLogUsage = async (params: {
    statusCode: number;
    status: "success" | "error";
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
  }) => {
    if (!req.apiKey) return;
    try {
      await logUsage({
        projectId: req.apiKey.projectId,
        ownerUserId: req.apiKey.ownerUserId,
        apiKeyId: req.apiKey._id,
        endpoint: "/v1/run",
        statusCode: params.statusCode,
        status: params.status,
        provider,
        model,
        inputTokens: params.inputTokens ?? null,
        outputTokens: params.outputTokens ?? null,
        totalTokens: params.totalTokens ?? null,
        latencyMs: Date.now() - startMs,
      });
    } catch {
      // Never fail /v1/run just because usage logging fails.
    }
  };

  try {
    const body = req.body as RunRequestBody;
    const input = typeof body.input === "string" ? body.input : "";
    if (!req.apiKey) {
      return runError(res, 401, "UNAUTHORIZED", "Unauthorized");
    }
    if (input.trim().length < 1) {
      const statusCode = 400;
      await safeLogUsage({ statusCode, status: "error" });
      return runError(res, statusCode, "VALIDATION_ERROR", "input must be a non-empty string");
    }

    if (input.length > MAX_INPUT_CHARS) {
      const statusCode = 400;
      await safeLogUsage({ statusCode, status: "error" });
      return runError(res, statusCode, "REQUEST_TOO_LARGE", "Input too long. Please shorten.", {
        maxInputChars: MAX_INPUT_CHARS,
      });
    }

    const estimatedTokens = estimateTokensFromInput(input);
    if (estimatedTokens > MAX_ESTIMATED_TOKENS) {
      const statusCode = 400;
      await safeLogUsage({ statusCode, status: "error" });
      return runError(res, statusCode, "REQUEST_TOO_LARGE", "Input too long. Please shorten.", {
        maxEstimatedTokens: MAX_ESTIMATED_TOKENS,
        estimatedTokens,
      });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      const statusCode = 500;
      await safeLogUsage({ statusCode, status: "error" });
      return runError(res, statusCode, "PROVIDER_ERROR", "Provider is not configured.");
    }

    const balanceCredits = await getWalletBalanceCredits(req.apiKey.ownerUserId);
    const billingState = await getUserBillingState(req.apiKey.ownerUserId);
    if (balanceCredits < RUN_COST_CREDITS) {
      const statusCode = 402;
      await safeLogUsage({ statusCode, status: "error" });
      return runError(res, statusCode, "INSUFFICIENT_CREDITS", "Insufficient credits");
    }
    if (billingState.monthlyCreditsUsed + RUN_COST_CREDITS > billingState.monthlyCreditsAllowance) {
      const statusCode = 402;
      await safeLogUsage({ statusCode, status: "error" });
      return runError(res, statusCode, "MONTHLY_QUOTA_EXCEEDED", "Monthly quota exceeded.", {
        allowance: billingState.monthlyCreditsAllowance,
        used: billingState.monthlyCreditsUsed,
        needed: RUN_COST_CREDITS,
        nextResetAt: billingState.nextResetAt,
      });
    }

    const runId = randomUUID();
    const openaiResponse = await openai.responses.create({
      model,
      input,
    });
    const output = typeof openaiResponse.output_text === "string" ? openaiResponse.output_text : "";
    const statusCode = 200;
    const usage = openaiResponse.usage;
    const totalTokens = typeof usage?.total_tokens === "number" ? usage.total_tokens : null;
    const creditsCharged =
      typeof totalTokens === "number"
        ? Math.max(1, Math.ceil(totalTokens / TOKENS_PER_CREDIT))
        : RUN_COST_CREDITS;

    if (creditsCharged > MAX_CREDITS_PER_REQUEST) {
      const statusCode = 400;
      await safeLogUsage({
        statusCode,
        status: "error",
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        totalTokens,
      });
      return runError(
        res,
        statusCode,
        "COST_CAP_EXCEEDED",
        "Request cost too high for current limits.",
        {
          maxCreditsPerRequest: MAX_CREDITS_PER_REQUEST,
          creditsCharged,
          totalTokens,
        }
      );
    }
    let nextBalanceCredits = balanceCredits;
    try {
      const deduction = await deductCreditsForUsage({
        userId: req.apiKey.ownerUserId,
        costCredits: creditsCharged,
        reason: "Run request token cost",
        relatedRunId: runId,
        provider,
        model,
        totalTokens,
      });
      nextBalanceCredits = deduction.balanceCredits;
    } catch (error) {
      if (error instanceof MonthlyQuotaExceededError) {
        await safeLogUsage({
          statusCode: 402,
          status: "error",
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          totalTokens,
        });
        const latestBilling = await getUserBillingState(req.apiKey.ownerUserId);
        return runError(res, 402, "MONTHLY_QUOTA_EXCEEDED", "Monthly quota exceeded.", {
          allowance: error.allowance,
          used: error.used,
          needed: error.needed,
          nextResetAt: latestBilling.nextResetAt,
        });
      }
      if (error instanceof InsufficientCreditsError) {
        await safeLogUsage({
          statusCode: 402,
          status: "error",
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          totalTokens,
        });
        return runError(res, 402, "INSUFFICIENT_CREDITS", "Insufficient credits");
      }
      throw error;
    }
    await safeLogUsage({
      statusCode,
      status: "success",
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      totalTokens,
    });

    return res.json({
      ok: true,
      output,
      model,
      usage: usage ?? undefined,
      totalTokens,
      creditsCharged,
      balanceCredits: nextBalanceCredits,
    });
  } catch (error) {
    await safeLogUsage({ statusCode: 502, status: "error" });
    if (error instanceof OpenAI.APIError) {
      return runError(res, 502, "PROVIDER_ERROR", "Provider request failed", {
        status: error.status ?? null,
      });
    }
    return runError(res, 502, "PROVIDER_ERROR", "Provider request failed");
  }
});

export { router as runRouter };
