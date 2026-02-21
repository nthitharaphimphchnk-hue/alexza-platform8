/**
 * Hidden Gateway - validates public action DTOs contain no provider/model fields.
 */

import { describe, it, expect } from "vitest";
import {
  toPublicAction,
  toPublicProposedAction,
  SERVER_ONLY_ACTION_FIELDS,
  type PublicActionDTO,
  type PublicProposedActionDTO,
} from "./actionDto";
import type { ObjectId } from "mongodb";

const mockObjectId = { toString: () => "abc123" } as unknown as ObjectId;

describe("actionDto - Hidden Gateway", () => {
  it("toPublicAction excludes provider, model, routingPolicy, fallbackModels, temperature, maxTokens", () => {
    const doc = {
      _id: mockObjectId,
      actionName: "test_action",
      description: "Test",
      inputSchema: { type: "object" },
      outputSchema: undefined,
      promptTemplate: "User: {{input}}",
      provider: "openrouter",
      model: "openai/gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 2048,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = toPublicAction(doc);

    expect(result).not.toHaveProperty("provider");
    expect(result).not.toHaveProperty("model");
    expect(result).not.toHaveProperty("routingPolicy");
    expect(result).not.toHaveProperty("fallbackModels");
    expect(result).not.toHaveProperty("temperature");
    expect(result).not.toHaveProperty("maxTokens");
    expect(result).not.toHaveProperty("promptTemplate");

    expect(result).toHaveProperty("actionName", "test_action");
    expect(result).toHaveProperty("description", "Test");
    expect(result).toHaveProperty("inputSchema");
    expect(result).toHaveProperty("instruction", "User: {{input}}");
  });

  it("toPublicProposedAction excludes provider and model", () => {
    const raw = {
      actionName: "summarize",
      description: "Summarize text",
      inputSchema: { type: "object", properties: { input: { type: "string" } } },
      promptTemplate: "Summarize: {{input}}",
      provider: "openrouter",
      model: "openai/gpt-4o",
    };

    const result = toPublicProposedAction(raw);

    expect(result).not.toHaveProperty("provider");
    expect(result).not.toHaveProperty("model");
    expect(result).toHaveProperty("actionName", "summarize");
    expect(result).toHaveProperty("instruction", "Summarize: {{input}}");
  });

  it("SERVER_ONLY_ACTION_FIELDS includes all forbidden fields", () => {
    const forbidden = ["provider", "model", "routingPolicy", "fallbackModels", "temperature", "maxTokens"];
    for (const field of forbidden) {
      expect(SERVER_ONLY_ACTION_FIELDS).toContain(field);
    }
  });

  it("PublicActionDTO type allows only safe fields", () => {
    const dto: PublicActionDTO = {
      id: "1",
      actionName: "x",
      description: "y",
      inputSchema: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(dto).not.toHaveProperty("provider");
    expect(dto).not.toHaveProperty("model");
  });

  it("PublicProposedActionDTO type allows only safe fields", () => {
    const dto: PublicProposedActionDTO = {
      actionName: "x",
      description: "y",
      inputSchema: {},
    };
    expect(dto).not.toHaveProperty("provider");
    expect(dto).not.toHaveProperty("model");
  });
});
