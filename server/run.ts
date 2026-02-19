import { Router } from "express";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import {
  InsufficientCreditsError,
  RUN_COST_CREDITS,
  TOKENS_PER_CREDIT,
  deductCreditsForUsage,
  getWalletBalanceCredits,
} from "./credits";
import { requireApiKey } from "./middleware/requireApiKey";
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

router.post("/v1/run", requireApiKey, async (req, res, next) => {
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
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    if (input.trim().length < 1) {
      const statusCode = 400;
      await safeLogUsage({ statusCode, status: "error" });
      return res.status(statusCode).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "input must be a non-empty string",
      });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      const statusCode = 500;
      await safeLogUsage({ statusCode, status: "error" });
      return res.status(statusCode).json({
        ok: false,
        error: "MISSING_OPENAI_KEY",
        message: "Missing OPENAI_API_KEY",
      });
    }

    const balanceCredits = await getWalletBalanceCredits(req.apiKey.ownerUserId);
    if (balanceCredits < RUN_COST_CREDITS) {
      const statusCode = 402;
      await safeLogUsage({ statusCode, status: "error" });
      return res.status(statusCode).json({
        ok: false,
        error: "INSUFFICIENT_CREDITS",
        message: "Insufficient credits",
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
      if (error instanceof InsufficientCreditsError) {
        await safeLogUsage({
          statusCode: 402,
          status: "error",
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          totalTokens,
        });
        return res.status(402).json({
          ok: false,
          error: "INSUFFICIENT_CREDITS",
          message: "Insufficient credits",
        });
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
    await safeLogUsage({ statusCode: 500, status: "error" });
    return next(error);
  }
});

export { router as runRouter };
