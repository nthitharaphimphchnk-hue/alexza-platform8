/**
 * Unit tests for webhook signature generation and verification.
 */

import { describe, it, expect } from "vitest";
import { computeWebhookSignature, verifyWebhookSignature } from "./signature";

describe("webhook signature", () => {
  const secret = "whsec_test123";
  const timestamp = "1700000000000";
  const rawBody = '{"userId":"abc","event":"auth.user.created"}';

  it("computes deterministic signature", () => {
    const sig1 = computeWebhookSignature(secret, timestamp, rawBody);
    const sig2 = computeWebhookSignature(secret, timestamp, rawBody);
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("produces different signature for different payloads", () => {
    const sig1 = computeWebhookSignature(secret, timestamp, rawBody);
    const sig2 = computeWebhookSignature(secret, timestamp, '{"userId":"xyz"}');
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signature for different timestamps", () => {
    const sig1 = computeWebhookSignature(secret, "1700000000000", rawBody);
    const sig2 = computeWebhookSignature(secret, "1700000000001", rawBody);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signature for different secrets", () => {
    const sig1 = computeWebhookSignature("secret1", timestamp, rawBody);
    const sig2 = computeWebhookSignature("secret2", timestamp, rawBody);
    expect(sig1).not.toBe(sig2);
  });

  it("verifyWebhookSignature returns true for valid signature", () => {
    const sig = computeWebhookSignature(secret, timestamp, rawBody);
    expect(verifyWebhookSignature(secret, sig, timestamp, rawBody)).toBe(true);
  });

  it("verifyWebhookSignature returns false for invalid signature", () => {
    const sig = computeWebhookSignature(secret, timestamp, rawBody);
    expect(verifyWebhookSignature(secret, "sha256=" + "0".repeat(64), timestamp, rawBody)).toBe(false);
    expect(verifyWebhookSignature("wrong_secret", sig, timestamp, rawBody)).toBe(false);
    expect(verifyWebhookSignature(secret, sig, "9999999999999", rawBody)).toBe(false);
    expect(verifyWebhookSignature(secret, sig, timestamp, "{}")).toBe(false);
  });
});
