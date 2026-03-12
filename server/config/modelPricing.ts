/**
 * Per-model pricing - upstream cost (USD per 1K tokens).
 * Used for billing ledger cost and margin calculation.
 */

/** Cost per 1K tokens: input, output (USD) */
export interface ModelCostPer1k {
  input: number;
  output: number;
}

/** Model ID -> cost. Supports both "gpt-4o" and "openai/gpt-4o" formats. */
const MODEL_COSTS: Record<string, ModelCostPer1k> = {
  // OpenAI
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "openai/gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  // OpenAI reasoning-tier
  "gpt-4.1": { input: 0.01, output: 0.03 },
  "openai/gpt-4.1": { input: 0.01, output: 0.03 },
  // Anthropic
  "anthropic/claude-3.5-sonnet": { input: 0.003, output: 0.015 },
  "anthropic/claude-3-opus": { input: 0.015, output: 0.075 },
  "anthropic/claude-3-haiku": { input: 0.00025, output: 0.00125 },
  // Meta
  "meta-llama/llama-3.2-3b-instruct:free": { input: 0, output: 0 },
};

/** Default cost when model not in registry (conservative estimate) */
const DEFAULT_COST: ModelCostPer1k = { input: 0.001, output: 0.003 };

/**
 * Get cost per 1K tokens for a model.
 * Normalizes model ID (e.g. strips provider prefix for lookup).
 */
export function getModelCost(modelId: string): ModelCostPer1k {
  if (!modelId || typeof modelId !== "string") return DEFAULT_COST;
  const key = modelId.trim().toLowerCase();
  if (MODEL_COSTS[key]) return MODEL_COSTS[key]!;
  const withPrefix = key.startsWith("openai/") ? key : `openai/${key}`;
  if (MODEL_COSTS[withPrefix]) return MODEL_COSTS[withPrefix]!;
  return DEFAULT_COST;
}

/**
 * Calculate upstream cost (USD) from token usage.
 */
export function calculateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const cost = getModelCost(modelId);
  const inputCost = (inputTokens / 1000) * cost.input;
  const outputCost = (outputTokens / 1000) * cost.output;
  return Math.round((inputCost + outputCost) * 1e8) / 1e8;
}
