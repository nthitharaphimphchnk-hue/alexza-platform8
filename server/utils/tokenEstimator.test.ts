import { describe, it, expect } from "vitest";
import { estimateTokensFromInput, calculateCredits } from "./tokenEstimator";

describe("tokenEstimator", () => {
  describe("estimateTokensFromInput", () => {
    it("estimates from string", () => {
      expect(estimateTokensFromInput("hello")).toBe(2); // 5/4 = 1.25 -> ceil 2
      expect(estimateTokensFromInput("")).toBe(1); // minimum 1
      expect(estimateTokensFromInput("a".repeat(8))).toBe(2);
    });

    it("estimates from object via JSON.stringify", () => {
      expect(estimateTokensFromInput({ input: "Hello" })).toBeGreaterThanOrEqual(1);
    });
  });

  describe("calculateCredits", () => {
    it("cheap: ceil(tokens/800), min 1", () => {
      expect(calculateCredits("cheap", 1)).toBe(1);
      expect(calculateCredits("cheap", 800)).toBe(1);
      expect(calculateCredits("cheap", 801)).toBe(2);
      expect(calculateCredits("cheap", 1600)).toBe(2);
    });

    it("balanced: ceil(tokens/600), min 1", () => {
      expect(calculateCredits("balanced", 1)).toBe(1);
      expect(calculateCredits("balanced", 600)).toBe(1);
      expect(calculateCredits("balanced", 601)).toBe(2);
    });

    it("quality: ceil(tokens/400), min 1", () => {
      expect(calculateCredits("quality", 1)).toBe(1);
      expect(calculateCredits("quality", 400)).toBe(1);
      expect(calculateCredits("quality", 401)).toBe(2);
    });
  });
});
