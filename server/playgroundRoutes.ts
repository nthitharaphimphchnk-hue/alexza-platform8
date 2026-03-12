/**
 * Public AI Playground - no account required.
 * Rate limited per IP. Uses demo actions with inline prompts.
 */

import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { runWithFallback } from "./providers";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "./modelRegistry";
import type { ProviderType, ProjectActionDoc } from "./models/types";
import { selectModelsForAction } from "./ai/model-router";
import type { RoutingMode } from "./modelRegistry";

const router = Router();

const PLAYGROUND_RATE_LIMIT_PER_MIN = Number.parseInt(
  process.env.PLAYGROUND_RATE_LIMIT_IP_PER_MIN ?? "5",
  10
) || 5;

const WINDOW_MS = 60_000;
const ipWindows = new Map<string, { start: number; count: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "0.0.0.0";
  }
  return req.socket.remoteAddress ?? "0.0.0.0";
}

function rateLimitPlayground(req: Request, res: Response, next: () => void): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const current = ipWindows.get(ip);

  if (!current || now - current.start >= WINDOW_MS) {
    ipWindows.set(ip, { start: now, count: 1 });
    return next();
  }

  if (current.count >= PLAYGROUND_RATE_LIMIT_PER_MIN) {
    res.setHeader("X-RateLimit-Limit", String(PLAYGROUND_RATE_LIMIT_PER_MIN));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.status(429).json({
      ok: false,
      error: { code: "RATE_LIMIT", message: "Too many requests. Try again in a minute." },
      requestId: randomUUID(),
    });
    return;
  }

  current.count += 1;
  ipWindows.set(ip, current);
  res.setHeader("X-RateLimit-Limit", String(PLAYGROUND_RATE_LIMIT_PER_MIN));
  res.setHeader("X-RateLimit-Remaining", String(PLAYGROUND_RATE_LIMIT_PER_MIN - current.count));
  next();
}

const DEMO_ACTIONS: Record<
  string,
  { prompt: (input: Record<string, unknown>) => string; label: string }
> = {
  summarize_text: {
    label: "Summarize Text",
    prompt: (input) =>
      `Summarize the following text in 2-3 concise sentences. Preserve key facts.\n\nText:\n${String(input.text ?? "")}`,
  },
  generate_blog: {
    label: "Generate Blog",
    prompt: (input) =>
      `Write a short blog post (200-300 words) on: ${String(input.topic ?? "")}\n\nKey points to cover: ${String(input.keyPoints ?? "")}\n\nInclude an engaging intro, 2-3 body paragraphs, and a conclusion.`,
  },
  extract_contact_info: {
    label: "Extract Contact Info",
    prompt: (input) =>
      `Extract contact information from this text. Respond with JSON only: {"name": string, "email": string, "phone": string}\n\nUse empty string for missing fields.\n\nText:\n${String(input.text ?? "")}`,
  },
  support_agent: {
    label: "Support Agent",
    prompt: (input) =>
      `You are a customer support agent. Draft a helpful, empathetic response to this customer message.\n\nCustomer message: ${String(input.message ?? "")}\n\nContext: ${String(input.context ?? "General inquiry")}\n\nKeep the response professional and under 100 words.`,
  },
  research_agent: {
    label: "Research Agent",
    prompt: (input) =>
      `Synthesize the following research notes into a coherent summary.\n\nTopic: ${String(input.topic ?? "")}\n\nNotes:\n${String(input.notes ?? "")}\n\nInclude: key findings, conclusions, and 2-3 actionable recommendations.`,
  },
};

const ALLOWED_ACTIONS = Object.keys(DEMO_ACTIONS);

function getExecutionProvider(): ProviderType {
  const key = process.env.OPENROUTER_API_KEY;
  if (key && key.trim().length > 0) return "openrouter";
  return "openai";
}

function getModels(provider: ProviderType): string[] {
  return provider === "openrouter" ? QUALITY_MODELS : QUALITY_MODELS_OPENAI;
}

router.post(
  "/playground/run",
  rateLimitPlayground,
  async (req: Request, res: Response) => {
    const requestId = randomUUID();

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
    if (!hasOpenRouter && !hasOpenAI) {
      return res.status(503).json({
        ok: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Playground is not configured." },
        requestId,
      });
    }

    const body = req.body as { action?: string; input?: Record<string, unknown> };
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const input = body.input && typeof body.input === "object" ? body.input : {};

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid action. Allowed: ${ALLOWED_ACTIONS.join(", ")}`,
        },
        requestId,
      });
    }

    const spec = DEMO_ACTIONS[action];
    const prompt = spec.prompt(input);

    try {
      const provider = getExecutionProvider();

      // Use model router heuristics by synthesizing a pseudo action doc
      const fakeAction: ProjectActionDoc = {
        // values not persisted; only used for routing heuristics
        userId: {} as any,
        projectId: {} as any,
        actionName: action,
        description: spec.label,
        inputSchema: {},
        promptTemplate: prompt,
        provider,
        model: provider === "openrouter" ? QUALITY_MODELS[0] : QUALITY_MODELS_OPENAI[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const routingMode: RoutingMode = "quality";
      const decision = selectModelsForAction({ action: fakeAction, routingMode, provider });

      const result = await runWithFallback({
        provider,
        models: decision.models,
        prompt,
        temperature: 0.7,
        maxTokens: 2048,
      });

      return res.json({
        ok: true,
        output: result.output,
        requestId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      return res.status(502).json({
        ok: false,
        error: { code: "RUNTIME_ERROR", message: msg },
        requestId,
      });
    }
  }
);

/** GET /api/playground/actions - list demo actions (for UI) */
router.get("/playground/actions", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    actions: ALLOWED_ACTIONS.map((id) => ({
      id,
      label: DEMO_ACTIONS[id].label,
    })),
  });
});

export default router;
