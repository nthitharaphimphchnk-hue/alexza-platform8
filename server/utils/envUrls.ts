/**
 * Normalize env URL: trim spaces and remove trailing slash.
 */
export function normalizeEnvUrl(url: string | undefined): string {
  if (!url || typeof url !== "string") return "";
  return url.trim().replace(/\/+$/, "");
}

/**
 * Normalize and return origin only (protocol + host, no path).
 * Used for OAuth callback base to avoid path mismatches.
 */
export function normalizeEnvUrlOrigin(url: string | undefined): string {
  const normalized = normalizeEnvUrl(url);
  if (!normalized) return "";
  try {
    const u = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
    return u.origin;
  } catch {
    return normalized;
  }
}
