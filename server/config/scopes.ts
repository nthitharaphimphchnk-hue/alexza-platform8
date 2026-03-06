/**
 * API Key scopes - permissions for API key access.
 */

/** All supported scopes */
export const API_KEY_SCOPES = [
  "run:actions",
  "read:projects",
  "manage:projects",
  "read:analytics",
  "read:requests",
  "manage:webhooks",
  "manage:api_keys",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** Backward compatibility: keys without scopes are treated as having all scopes */
export const ALL_SCOPES: ApiKeyScope[] = [...API_KEY_SCOPES];

export function isValidScope(s: string): s is ApiKeyScope {
  return API_KEY_SCOPES.includes(s as ApiKeyScope);
}

/**
 * Check if key has required scope.
 * Backward compatibility: undefined/empty scopes = full access.
 */
export function hasScope(keyScopes: string[] | undefined, required: ApiKeyScope): boolean {
  if (!keyScopes || keyScopes.length === 0) return true;
  if (keyScopes.includes("*")) return true;
  const normalized = keyScopes.filter(isValidScope);
  if (normalized.length === 0) return true;
  return normalized.includes(required);
}
