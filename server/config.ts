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

/** Per API key: Free plan */
export const RATE_LIMIT_FREE_PER_MIN = readPositiveIntFromEnv("RATE_LIMIT_FREE_PER_MIN", 30);

/** Per API key: Pro plan */
export const RATE_LIMIT_PRO_PER_MIN = readPositiveIntFromEnv("RATE_LIMIT_PRO_PER_MIN", 120);

/** Per IP: safety net (applies to all requests) */
export const RATE_LIMIT_IP_PER_MIN = readPositiveIntFromEnv("RATE_LIMIT_IP_PER_MIN", 60);

/** Upstream provider timeout (ms) */
export const UPSTREAM_TIMEOUT_MS = readPositiveIntFromEnv("UPSTREAM_TIMEOUT_MS", 30_000);
export const MAX_INPUT_CHARS = readPositiveIntFromEnv("MAX_INPUT_CHARS", 12000);
export const MAX_ESTIMATED_TOKENS = readPositiveIntFromEnv("MAX_ESTIMATED_TOKENS", 8000);
export const MAX_CREDITS_PER_REQUEST = readPositiveIntFromEnv("MAX_CREDITS_PER_REQUEST", 50);

/** Free plan: max actions per project */
export const MAX_ACTIONS_PER_PROJECT_FREE = readPositiveIntFromEnv(
  "MAX_ACTIONS_PER_PROJECT_FREE",
  3
);
