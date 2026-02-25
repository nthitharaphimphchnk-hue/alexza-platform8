const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "";
export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

/** Base URL for OAuth redirects (backend). Uses API_BASE_URL or same origin when empty. */
export function getOAuthBaseUrl(): string {
  const base = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return base.replace(/\/+$/, "");
}

/** Full OAuth URL for a provider (e.g. google, github). Pass next path (e.g. /app/dashboard) for post-login redirect. */
export function getOAuthUrl(provider: "google" | "github", next?: string): string {
  const base = getOAuthBaseUrl();
  const url = `${base}/auth/${provider}`;
  const nextPath = next || "/app/dashboard";
  if (typeof window !== "undefined") {
    const fullRedirect = nextPath.startsWith("/") ? window.location.origin + nextPath : nextPath;
    return `${url}?redirect=${encodeURIComponent(fullRedirect)}&next=${encodeURIComponent(nextPath)}`;
  }
  return `${url}?next=${encodeURIComponent(nextPath)}`;
}
let hasLoggedApiBase = false;

export function logApiBaseUrlOnce() {
  if (!import.meta.env.DEV || hasLoggedApiBase) return;
  hasLoggedApiBase = true;
  console.log(`[API] Base URL: ${API_BASE_URL}`);
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  logApiBaseUrlOnce();
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const err = payload?.error;
    const message =
      typeof err === "object" && typeof err?.message === "string"
        ? err.message
        : typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error === "string"
            ? payload.error
            : `Request failed with status ${response.status}`;
    const code =
      typeof err === "object" && typeof err?.code === "string"
        ? err.code
        : typeof payload?.error === "string"
          ? payload.error
          : undefined;
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}
