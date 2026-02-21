/**
 * OpenAI provider - Builder AI & optional Execution fallback
 */

import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

export interface OpenAIRunParams {
  model: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAIRunResponse {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function runOpenAI(params: OpenAIRunParams): Promise<OpenAIRunResponse> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: params.model,
    messages: params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 2048,
  });

  const choice = response.choices?.[0];
  const output = choice?.message?.content ?? "";

  return {
    output,
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens ?? undefined,
          completion_tokens: response.usage.completion_tokens ?? undefined,
          total_tokens: response.usage.total_tokens ?? undefined,
        }
      : undefined,
  };
}
