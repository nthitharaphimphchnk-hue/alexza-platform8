/**
 * OpenRouter provider - Execution Gateway
 */

import { UPSTREAM_TIMEOUT_MS } from "../config";

export interface OpenRouterRunParams {
  model: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function runOpenRouter(params: OpenRouterRunParams): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "https://alexza.ai",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      const err = new Error(`OpenRouter error ${response.status}: ${text}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        text?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const choice = data.choices?.[0];
    const output = choice?.message?.content ?? choice?.text ?? "";

    return {
      output,
      usage: data.usage,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      const timeoutErr = new Error("Request timeout");
      (timeoutErr as Error & { isTimeout?: boolean }).isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  }
}
