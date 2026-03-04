/**
 * Volume discount pricing - tier selection and conversion tests.
 */

import { describe, it, expect } from "vitest";
import {
  CREDIT_PRICE_TIERS,
  getCreditPriceForAmount,
  getUsdForCredits,
  getCreditsForUsd,
} from "./pricing";

describe("pricing - getCreditPriceForAmount", () => {
  it("returns base tier price for small amounts", () => {
    expect(getCreditPriceForAmount(0)).toBe(0.003);
    expect(getCreditPriceForAmount(1)).toBe(0.003);
    expect(getCreditPriceForAmount(9999)).toBe(0.003);
  });

  it("returns second tier for 10k+", () => {
    expect(getCreditPriceForAmount(10_000)).toBe(0.0027);
    expect(getCreditPriceForAmount(50_000)).toBe(0.0027);
    expect(getCreditPriceForAmount(99_999)).toBe(0.0027);
  });

  it("returns third tier for 100k+", () => {
    expect(getCreditPriceForAmount(100_000)).toBe(0.0024);
    expect(getCreditPriceForAmount(1_000_000)).toBe(0.0024);
  });

  it("handles invalid input with fallback", () => {
    expect(getCreditPriceForAmount(-1)).toBe(0.003);
    expect(getCreditPriceForAmount(NaN)).toBe(0.003);
  });
});

describe("pricing - getUsdForCredits", () => {
  it("calculates cost for tiered credits", () => {
    expect(getUsdForCredits(1)).toBeCloseTo(0.003);
    expect(getUsdForCredits(10_000)).toBeCloseTo(30);
    expect(getUsdForCredits(10_001)).toBeCloseTo(30 + 0.0027);
    expect(getUsdForCredits(100_000)).toBeCloseTo(30 + 90 * 2.7);
  });
});

describe("pricing - getCreditsForUsd", () => {
  it("calculates credits for USD using tiers", () => {
    expect(getCreditsForUsd(30)).toBe(10_000);
    expect(getCreditsForUsd(10)).toBeGreaterThanOrEqual(3333);
    expect(getCreditsForUsd(10)).toBeLessThan(4000);
  });

  it("$100 gives more credits than flat 0.003 rate", () => {
    const flatCredits = Math.floor(100 / 0.003);
    const tieredCredits = getCreditsForUsd(100);
    expect(tieredCredits).toBeGreaterThan(flatCredits);
  });

  it("handles small amounts", () => {
    expect(getCreditsForUsd(0.01)).toBeGreaterThanOrEqual(1);
    expect(getCreditsForUsd(0)).toBe(0);
    expect(getCreditsForUsd(-1)).toBe(0);
  });

  it("round-trip: credits from usd then usd from credits is consistent", () => {
    const usd = 100;
    const credits = getCreditsForUsd(usd);
    const backToUsd = getUsdForCredits(credits);
    expect(backToUsd).toBeLessThanOrEqual(usd + 1);
    expect(backToUsd).toBeGreaterThanOrEqual(usd - 5);
  });
});
