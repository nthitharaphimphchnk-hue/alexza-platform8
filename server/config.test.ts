/**
 * Config unit tests - CREDIT_PRICE parsing and fallback.
 */

import { describe, it, expect } from "vitest";
import { parseCreditPrice } from "./config";

describe("config - parseCreditPrice", () => {
  it("returns fallback when raw is undefined", () => {
    expect(parseCreditPrice(undefined, 0.003)).toBe(0.003);
  });

  it("returns fallback when raw is empty string", () => {
    expect(parseCreditPrice("", 0.003)).toBe(0.003);
  });

  it("returns fallback when raw is whitespace only", () => {
    expect(parseCreditPrice("   ", 0.003)).toBe(0.003);
  });

  it("parses valid positive number", () => {
    expect(parseCreditPrice("0.003", 0.001)).toBe(0.003);
    expect(parseCreditPrice("0.005", 0.003)).toBe(0.005);
    expect(parseCreditPrice("1", 0.003)).toBe(1);
  });

  it("trims whitespace", () => {
    expect(parseCreditPrice("  0.003  ", 0.001)).toBe(0.003);
  });

  it("returns fallback when parsed is NaN", () => {
    expect(parseCreditPrice("abc", 0.003)).toBe(0.003);
    expect(parseCreditPrice("0.00.3", 0.003)).toBe(0.003);
  });

  it("returns fallback when parsed is <= 0", () => {
    expect(parseCreditPrice("0", 0.003)).toBe(0.003);
    expect(parseCreditPrice("-0.001", 0.003)).toBe(0.003);
  });
});
