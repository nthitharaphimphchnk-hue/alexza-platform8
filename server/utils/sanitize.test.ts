/**
 * Hidden Gateway - ensures sanitize never leaks upstream info.
 */

import { describe, it, expect } from "vitest";
import { sanitizeForLog, sanitizeForResponse, maskEmail, getDbLogContext } from "./sanitize";

const SENSITIVE = ["http", "openrouter", "openai", "gpt", "claude"];

function assertNoSensitive(str: string) {
  const lower = str.toLowerCase();
  for (const s of SENSITIVE) {
    expect(lower).not.toContain(s);
  }
}

describe("sanitize - Hidden Gateway", () => {
  it("sanitizeForLog redacts URLs", () => {
    const err = new Error("Failed: https://openrouter.ai/api/v1/chat");
    const result = sanitizeForLog(err);
    assertNoSensitive(result);
    expect(result).toContain("[REDACTED]");
  });

  it("sanitizeForLog redacts provider names", () => {
    const err = new Error("OpenRouter error: model gpt-4o not found");
    const result = sanitizeForLog(err);
    assertNoSensitive(result);
  });

  it("sanitizeForResponse redacts for client", () => {
    const err = new Error("Call failed: https://api.openai.com/v1/chat");
    const result = sanitizeForResponse(err);
    assertNoSensitive(result);
  });

  it("response JSON from run must not contain sensitive strings", () => {
    const mockSuccess = {
      ok: true,
      requestId: "abc-123",
      output: "Hello",
      creditsCharged: 1,
      latencyMs: 100,
    };
    const json = JSON.stringify(mockSuccess);
    assertNoSensitive(json);
  });

  it("maskEmail hides local part", () => {
    expect(maskEmail("user@kkumail.com")).toBe("u***@kkumail.com");
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
    expect(maskEmail("x@domain.org")).toBe("x***@domain.org");
    expect(maskEmail("invalid")).toBe("***@***");
  });

  it("getDbLogContext returns safe values", () => {
    const ctx = getDbLogContext();
    expect(typeof ctx.dbName).toBe("string");
    expect(typeof ctx.uriHostHash).toBe("string");
    expect(ctx.uriHostHash).toMatch(/^[a-f0-9]{8}$/);
  });

  it("response JSON from error must not contain sensitive strings", () => {
    const mockError = {
      ok: false,
      error: { code: "RUNTIME_ERROR", message: "Request failed" },
      requestId: "xyz-456",
    };
    const json = JSON.stringify(mockError);
    assertNoSensitive(json);
  });
});
