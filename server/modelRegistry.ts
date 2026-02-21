/**
 * Model registry - routing policies and fallback chains.
 * SERVER_ONLY: never expose to clients. Hidden Gateway.
 */

/** Quality-first: best models in order (OpenRouter model IDs) */
export const QUALITY_MODELS: string[] = [
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
  "openai/gpt-4o-mini",
];

/** Quality models when using OpenAI provider directly (no OpenRouter) */
export const QUALITY_MODELS_OPENAI: string[] = [
  "gpt-4o",
  "gpt-4o-mini",
];

/** Balanced: cost/quality tradeoff (optional, not wired yet) */
export const BALANCED_MODELS: string[] = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
];

/** Cheap: lowest cost */
export const CHEAP_MODELS: string[] = [
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.2-3b-instruct:free",
];

/** Cheap models when using OpenAI provider directly */
export const CHEAP_MODELS_OPENAI: string[] = [
  "gpt-4o-mini",
];

/** Balanced models when using OpenAI provider directly */
export const BALANCED_MODELS_OPENAI: string[] = [
  "gpt-4o-mini",
];

export type RoutingMode = "cheap" | "balanced" | "quality";
