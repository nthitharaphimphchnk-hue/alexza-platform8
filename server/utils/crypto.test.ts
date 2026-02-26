/**
 * Password hashing - signup and login use the same hash+compare.
 */

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./crypto";

describe("crypto - password hash", () => {
  it("create hash -> compare -> true", async () => {
    const password = "test-password-123";
    const hash = await hashPassword(password);
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(10);

    const ok = await verifyPassword(password, hash);
    expect(ok).toBe(true);
  });

  it("wrong password -> compare -> false", async () => {
    const hash = await hashPassword("correct");
    const ok = await verifyPassword("wrong", hash);
    expect(ok).toBe(false);
  });

  it("same password produces different hashes (salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("empty hash -> verifyPassword returns false (no bcrypt call)", async () => {
    expect(await verifyPassword("any", "")).toBe(false);
    expect(await verifyPassword("any", "   ")).toBe(false);
  });

  it("null/undefined-like hash -> verifyPassword returns false", async () => {
    expect(await verifyPassword("any", null as unknown as string)).toBe(false);
    expect(await verifyPassword("any", undefined as unknown as string)).toBe(false);
  });
});
