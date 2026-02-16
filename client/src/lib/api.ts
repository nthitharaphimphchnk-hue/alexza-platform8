export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3002";
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
    const message =
      payload?.message || payload?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload?.error);
  }

  return payload as T;
}
