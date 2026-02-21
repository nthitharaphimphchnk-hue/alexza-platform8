/**
 * Credits - atomic deduction behavior.
 * Full concurrent test requires MongoDB (run with MONGODB_URI).
 */

import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import {
  InsufficientCreditsError,
  MonthlyQuotaExceededError,
  refundCreditsFromRun,
} from "./credits";

describe("credits - deductCreditsForUsage", () => {
  it("InsufficientCreditsError has correct name", () => {
    const err = new InsufficientCreditsError();
    expect(err.name).toBe("InsufficientCreditsError");
    expect(err.message).toContain("credits");
  });

  it("MonthlyQuotaExceededError has allowance/used/needed", () => {
    const err = new MonthlyQuotaExceededError("Quota exceeded", 1000, 950, 100);
    expect(err.allowance).toBe(1000);
    expect(err.used).toBe(950);
    expect(err.needed).toBe(100);
  });

  it("refundCreditsFromRun does nothing when amount <= 0", async () => {
    const userId = new ObjectId();
    await expect(
      refundCreditsFromRun({
        userId,
        amountCredits: 0,
        reason: "test",
      })
    ).resolves.toBeUndefined();
  });
});
