/**
 * Model registry - Quality routing
 */

import { describe, it, expect } from "vitest";
import {
  QUALITY_MODELS,
  QUALITY_MODELS_OPENAI,
  BALANCED_MODELS,
  CHEAP_MODELS,
} from "./modelRegistry";

describe("modelRegistry", () => {
  it("QUALITY_MODELS has at least one model", () => {
    expect(QUALITY_MODELS.length).toBeGreaterThan(0);
    expect(QUALITY_MODELS[0]).toBeTruthy();
  });

  it("QUALITY_MODELS_OPENAI has at least one model", () => {
    expect(QUALITY_MODELS_OPENAI.length).toBeGreaterThan(0);
    expect(QUALITY_MODELS_OPENAI[0]).toBeTruthy();
  });

  it("QUALITY_MODELS fallback chain: primary + fallbacks", () => {
    const primary = QUALITY_MODELS[0];
    const fallbacks = QUALITY_MODELS.slice(1);
    expect(primary).toBeTruthy();
    expect(fallbacks.length).toBeGreaterThan(0);
  });

  it("BALANCED_MODELS and CHEAP_MODELS exist (optional)", () => {
    expect(Array.isArray(BALANCED_MODELS)).toBe(true);
    expect(Array.isArray(CHEAP_MODELS)).toBe(true);
  });
});
