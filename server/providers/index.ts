/**
 * Provider abstraction - run via OpenRouter or OpenAI
 * Hidden Gateway: never expose provider/model to clients.
 */

import type { ProviderType } from "../models/types";
import { runOpenRouter } from "./openrouter";
import { runOpenAI } from "./openai";

export interface RunProviderParams {
  provider: ProviderType;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface RunProviderResult {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  /** Internal only: which model succeeded (for admin logs) */
  _resolvedModel?: string;
}

export async function runProvider(params: RunProviderParams): Promise<RunProviderResult> {
  const providerName = params.provider === "openrouter" ? "openrouter" : "openai";
  console.log(`[Runtime] providerName=${providerName}`);

  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.prompt });

  if (params.provider === "openrouter") {
    const out = await runOpenRouter({
      model: params.model,
      messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
    return { ...out, _resolvedModel: params.model };
  }

  if (params.provider === "openai") {
    const out = await runOpenAI({
      model: params.model,
      messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
    return { ...out, _resolvedModel: params.model };
  }

  throw new Error(`Unknown provider: ${params.provider}`);
}

/** Transient errors that warrant trying next model */
function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("rate limit") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("capacity")
  );
}

export interface RunWithFallbackParams {
  provider: ProviderType;
  models: string[];
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Try models in order; on transient failure, try next. Stop at first success.
 * Logs which model succeeded (admin-only). Never returns model to client.
 */
export async function runWithFallback(
  params: RunWithFallbackParams
): Promise<RunProviderResult> {
  const { provider, models, prompt, temperature, maxTokens, systemPrompt } = params;
  if (models.length === 0) {
    throw new Error("No models to try");
  }

  let lastError: unknown = null;
  for (const model of models) {
    try {
      const result = await runProvider({
        provider,
        model,
        prompt,
        temperature,
        maxTokens,
        systemPrompt,
      });
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Runtime] runWithFallback succeeded`);
      }
      return result;
    } catch (err) {
      lastError = err;
      const idx = models.indexOf(model);
      if (isTransientError(err) && idx >= 0 && idx < models.length - 1) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Providers] runWithFallback transient failure, trying next model`);
        }
        continue;
      }
      throw new Error("Request failed");
    }
  }
  throw new Error("Request failed");
}
