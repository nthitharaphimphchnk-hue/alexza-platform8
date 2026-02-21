function readPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const RATE_LIMIT_REQUESTS_PER_MINUTE = readPositiveIntFromEnv(
  "RATE_LIMIT_REQUESTS_PER_MINUTE",
  30
);
export const MAX_INPUT_CHARS = readPositiveIntFromEnv("MAX_INPUT_CHARS", 12000);
export const MAX_ESTIMATED_TOKENS = readPositiveIntFromEnv("MAX_ESTIMATED_TOKENS", 8000);
export const MAX_CREDITS_PER_REQUEST = readPositiveIntFromEnv("MAX_CREDITS_PER_REQUEST", 50);

/** Free plan: max actions per project */
export const MAX_ACTIONS_PER_PROJECT_FREE = readPositiveIntFromEnv(
  "MAX_ACTIONS_PER_PROJECT_FREE",
  3
);
