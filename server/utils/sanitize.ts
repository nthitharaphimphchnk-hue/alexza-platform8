/**
 * Sanitize strings for logs and responses - never expose upstream URLs, provider names, etc.
 */

import crypto from "crypto";

/** Mask email for server logs: user@domain.com -> u***@domain.com (no full email, no user enumeration) */
export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "***@***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = local.charAt(0);
  return `${first}***@${domain}`;
}

/** Safe db context for logs: db name + short hash of host (no credentials) */
export function getDbLogContext(): { dbName: string; uriHostHash: string } {
  const dbName = (process.env.MONGODB_DB || process.env.DB_NAME || "?").trim() || "?";
  const uri = (process.env.MONGODB_URI || "").trim();
  let host = "?";
  if (uri) {
    const withHost = uri.match(/@([^:\/\?]+)/);
    const noAuth = uri.match(/mongodb(?:\+srv)?:\/\/([^:\/\?]+)/);
    host = (withHost?.[1] ?? noAuth?.[1] ?? "?").toLowerCase();
  }
  const hash = crypto.createHash("sha256").update(host).digest("hex").slice(0, 8);
  return { dbName, uriHostHash: hash };
}

const REDACT_PATTERNS = [
  /https?:\/\/[^\s"'<>]+/g,
  /\bopenrouter\.ai\b/gi,
  /\bopenrouter\b/gi,
  /\bopenai\.com\b/gi,
  /\bapi\.openai\b/gi,
  /\bopenai\b/gi,
  /\banthropic\b/gi,
  /\bmeta-llama\b/gi,
  /\bllama\b/gi,
  /\bgpt-\d[^\s]*/gi,
  /\bgpt\b/gi,
  /\bclaude-\d[^\s]*/gi,
  /\bclaude\b/gi,
  /\bsonnet\b/gi,
  /\bopus\b/gi,
  /\bhaiku\b/gi,
];

function redact(str: string): string {
  let result = str;
  for (const re of REDACT_PATTERNS) {
    result = result.replace(re, "[REDACTED]");
  }
  return result;
}

/** Sanitize error for logging - never log URLs or upstream identifiers */
export function sanitizeForLog(err: unknown): string {
  if (err instanceof Error) {
    const msg = redact(err.message);
    const stack = err.stack;
    if (process.env.NODE_ENV === "production" && stack) {
      return `${err.name}: ${msg}`;
    }
    return stack ? redact(stack) : `${err.name}: ${msg}`;
  }
  return redact(String(err));
}

/** Sanitize error message for client response - no stack, no URLs, no provider/model */
export function sanitizeForResponse(err: unknown): string {
  if (err instanceof Error) {
    const redacted = redact(err.message);
    return redacted.length > 0 ? redacted : "Request failed";
  }
  const redacted = redact(String(err));
  return redacted.length > 0 ? redacted : "Request failed";
}
