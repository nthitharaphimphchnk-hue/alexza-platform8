function readPositiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readPositiveFloatFromEnv(name: string, fallback: number): number {
  return parseCreditPrice(process.env[name], fallback);
}

/**
 * Parse credit price from env string. Exported for unit tests.
 * Returns fallback if raw is empty, NaN, or <= 0.
 */
export function parseCreditPrice(raw: string | undefined, fallback: number): number {
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number.parseFloat(raw.trim());
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/** Credit price in USD per credit. Default 0.003. Configurable via CREDIT_PRICE env. */
export const CREDIT_PRICE = readPositiveFloatFromEnv("CREDIT_PRICE", 0.003);

/** Get credit price (for use in modules that import config lazily). Safe to log (numeric only). */
export function getCreditPrice(): number {
  return CREDIT_PRICE;
}

export const RATE_LIMIT_REQUESTS_PER_MINUTE = readPositiveIntFromEnv(
  "RATE_LIMIT_REQUESTS_PER_MINUTE",
  30
);

/** Per API key: Free plan (req/min). Env: RATE_LIMIT_FREE or RATE_LIMIT_FREE_PER_MIN */
export const RATE_LIMIT_FREE_PER_MIN =
  readPositiveIntFromEnv("RATE_LIMIT_FREE", 0) || readPositiveIntFromEnv("RATE_LIMIT_FREE_PER_MIN", 30);

/** Per API key: Pro plan (req/min). Env: RATE_LIMIT_PRO or RATE_LIMIT_PRO_PER_MIN */
export const RATE_LIMIT_PRO_PER_MIN =
  readPositiveIntFromEnv("RATE_LIMIT_PRO", 0) || readPositiveIntFromEnv("RATE_LIMIT_PRO_PER_MIN", 120);

/** Per API key: Enterprise plan (req/min). Env: RATE_LIMIT_ENTERPRISE */
export const RATE_LIMIT_ENTERPRISE_PER_MIN = readPositiveIntFromEnv("RATE_LIMIT_ENTERPRISE", 600);

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
