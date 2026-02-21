/**
 * Model registry - routing mode chains
 */

import { describe, it, expect } from "vitest";
import {
  QUALITY_MODELS,
  QUALITY_MODELS_OPENAI,
  BALANCED_MODELS,
  BALANCED_MODELS_OPENAI,
  CHEAP_MODELS,
  CHEAP_MODELS_OPENAI,
} from "./modelRegistry";

function getModelsForMode(
  mode: "cheap" | "balanced" | "quality",
  provider: "openrouter" | "openai"
): string[] {
  if (mode === "cheap") return provider === "openrouter" ? CHEAP_MODELS : CHEAP_MODELS_OPENAI;
  if (mode === "balanced") return provider === "openrouter" ? BALANCED_MODELS : BALANCED_MODELS_OPENAI;
  return provider === "openrouter" ? QUALITY_MODELS : QUALITY_MODELS_OPENAI;
}

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

  it("BALANCED_MODELS and CHEAP_MODELS exist", () => {
    expect(Array.isArray(BALANCED_MODELS)).toBe(true);
    expect(Array.isArray(CHEAP_MODELS)).toBe(true);
  });

  it("model chain selection by routingMode", () => {
    const qualityOpenRouter = getModelsForMode("quality", "openrouter");
    const balancedOpenRouter = getModelsForMode("balanced", "openrouter");
    const cheapOpenRouter = getModelsForMode("cheap", "openrouter");

    expect(qualityOpenRouter).toEqual(QUALITY_MODELS);
    expect(balancedOpenRouter).toEqual(BALANCED_MODELS);
    expect(cheapOpenRouter).toEqual(CHEAP_MODELS);

    const qualityOpenAI = getModelsForMode("quality", "openai");
    const cheapOpenAI = getModelsForMode("cheap", "openai");

    expect(qualityOpenAI).toEqual(QUALITY_MODELS_OPENAI);
    expect(cheapOpenAI).toEqual(CHEAP_MODELS_OPENAI);
  });
});
