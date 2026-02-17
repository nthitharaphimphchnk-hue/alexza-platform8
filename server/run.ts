import { Router } from "express";
import OpenAI from "openai";
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

  try {
    const body = req.body as RunRequestBody;
    const input = typeof body.input === "string" ? body.input : "";
    if (input.trim().length < 1) {
      const statusCode = 400;
      if (req.apiKey) {
        await logUsage({
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          endpoint: "/v1/run",
          statusCode,
          latencyMs: Date.now() - startMs,
        });
      }
      return res.status(statusCode).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "input must be a non-empty string",
      });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      const statusCode = 500;
      if (req.apiKey) {
        await logUsage({
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          endpoint: "/v1/run",
          statusCode,
          latencyMs: Date.now() - startMs,
        });
      }
      return res.status(statusCode).json({
        ok: false,
        error: "MISSING_OPENAI_KEY",
        message: "Missing OPENAI_API_KEY",
      });
    }

    const model = getOpenAIModel();
    const openaiResponse = await openai.responses.create({
      model,
      input,
    });
    const output = typeof openaiResponse.output_text === "string" ? openaiResponse.output_text : "";
    const statusCode = 200;

    if (req.apiKey) {
      await logUsage({
        projectId: req.apiKey.projectId,
        ownerUserId: req.apiKey.ownerUserId,
        apiKeyId: req.apiKey._id,
        endpoint: "/v1/run",
        statusCode,
        latencyMs: Date.now() - startMs,
      });
    }

    return res.json({
      ok: true,
      output,
      model,
      usage: openaiResponse.usage ?? undefined,
    });
  } catch (error) {
    if (req.apiKey) {
      try {
        await logUsage({
          projectId: req.apiKey.projectId,
          ownerUserId: req.apiKey.ownerUserId,
          apiKeyId: req.apiKey._id,
          endpoint: "/v1/run",
          statusCode: 500,
          latencyMs: Date.now() - startMs,
        });
      } catch {
        // avoid masking original error if usage logging fails
      }
    }
    return next(error);
  }
});

export { router as runRouter };
