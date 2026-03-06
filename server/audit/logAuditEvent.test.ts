/**
 * Unit tests for audit redact logic.
 */

import { describe, it, expect } from "vitest";
import { redactMetadataForTest } from "./logAuditEvent";

describe("logAuditEvent redact", () => {
  it("redacts api_key and secret keys", () => {
    const meta = {
      apiKey: "axza_secret123",
      secret: "whsec_abc",
      name: "My Key",
    };
    const result = redactMetadataForTest(meta);
    expect(result.apiKey).toBe("[REDACTED]");
    expect(result.secret).toBe("[REDACTED]");
    expect(result.name).toBe("My Key");
  });

  it("redacts nested secret keys", () => {
    const meta = {
      config: {
        api_key: "sk-xxx",
        url: "https://example.com",
      },
    };
    const result = redactMetadataForTest(meta);
    expect((result.config as Record<string, unknown>).api_key).toBe("[REDACTED]");
    expect((result.config as Record<string, unknown>).url).toBe("https://example.com");
  });

  it("truncates long prompt strings", () => {
    const longPrompt = "a".repeat(1000);
    const meta = { promptTemplate: longPrompt };
    const result = redactMetadataForTest(meta);
    const val = result.promptTemplate as string;
    expect(val.length).toBeLessThan(600);
    expect(val).toContain("[truncated");
  });

  it("preserves short strings", () => {
    const meta = { name: "Test", description: "Short" };
    const result = redactMetadataForTest(meta);
    expect(result.name).toBe("Test");
    expect(result.description).toBe("Short");
  });

  it("handles empty metadata", () => {
    const result = redactMetadataForTest({});
    expect(result).toEqual({});
  });
});
