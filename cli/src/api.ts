/**
 * API client for ALEXZA AI
 */

import { loadConfig } from "./config.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    apiKey?: string;
    baseUrl?: string;
  } = {}
): Promise<T> {
  const config = loadConfig();
  const baseUrl = (options.baseUrl ?? config.baseUrl ?? "http://localhost:3005").replace(/\/$/, "");
  const apiKey = options.apiKey ?? config.apiKey;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new ApiError("Not logged in. Run 'alexza login' to store your API key.");
  }

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body !== undefined && options.method !== "GET") {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, init);
  let body: unknown;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errBody = body as { error?: string; message?: string } | null;
    const msg = errBody?.message ?? errBody?.error ?? res.statusText ?? "Request failed";
    throw new ApiError(String(msg), res.status, body);
  }

  return body as T;
}
