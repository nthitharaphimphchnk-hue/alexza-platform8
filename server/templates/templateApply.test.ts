/**
 * Unit tests: apply template creates an Action with correct fields.
 */

import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import {
  toActionName,
  buildActionFromTemplate,
  ACTION_NAME_REGEX,
} from "./templateApply";
import type { ActionTemplateDoc } from "../models/actionTemplate";

describe("templateApply", () => {
  describe("toActionName", () => {
    it("converts template name to URL-safe action name", () => {
      expect(toActionName("Summarize Short")).toBe("summarize_short");
      expect(toActionName("Translate Thai to English")).toBe("translate_thai_to_english");
      expect(toActionName("Extract Contact Info")).toBe("extract_contact_info");
    });

    it("strips invalid characters", () => {
      expect(toActionName("AIDA Ad Copy!")).toBe("aida_ad_copy");
      expect(toActionName("Email Draft (v2)")).toBe("email_draft_v2");
    });

    it("handles empty and whitespace", () => {
      expect(toActionName("")).toBe("");
      expect(toActionName("   ")).toBe("");
    });
  });

  describe("ACTION_NAME_REGEX", () => {
    it("accepts valid action names", () => {
      expect(ACTION_NAME_REGEX.test("summarize_short")).toBe(true);
      expect(ACTION_NAME_REGEX.test("translate-th-en")).toBe(true);
      expect(ACTION_NAME_REGEX.test("extract123")).toBe(true);
    });

    it("rejects invalid action names", () => {
      expect(ACTION_NAME_REGEX.test("Summarize Short")).toBe(false);
      expect(ACTION_NAME_REGEX.test("aida!")).toBe(false);
      expect(ACTION_NAME_REGEX.test("")).toBe(false);
    });
  });

  describe("buildActionFromTemplate", () => {
    it("creates an Action with correct fields from template", () => {
      const userId = new ObjectId();
      const projectId = new ObjectId();
      const template: ActionTemplateDoc = {
        _id: new ObjectId(),
        name: "Summarize Short",
        description: "Create a brief 2-3 sentence summary.",
        category: "summarize",
        tags: ["summary", "brief"],
        promptTemplate: "Summarize: {{text}}",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
        outputSchema: { type: "object", properties: { summary: { type: "string" } } },
        createdBy: "system",
        visibility: "public",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = buildActionFromTemplate(
        template,
        "summarize_short",
        userId,
        projectId,
        "openrouter",
        "openai/gpt-4o-mini"
      );

      expect(action.userId).toBe(userId);
      expect(action.projectId).toBe(projectId);
      expect(action.actionName).toBe("summarize_short");
      expect(action.description).toBe(template.description);
      expect(action.inputSchema).toEqual(template.inputSchema);
      expect(action.outputSchema).toEqual(template.outputSchema);
      expect(action.promptTemplate).toBe(template.promptTemplate);
      expect(action.provider).toBe("openrouter");
      expect(action.model).toBe("openai/gpt-4o-mini");
      expect(action.routingPolicy).toBe("quality");
      expect(action.temperature).toBe(0.7);
      expect(action.maxTokens).toBe(2048);
      expect(action.createdAt).toBeInstanceOf(Date);
      expect(action.updatedAt).toBeInstanceOf(Date);
    });

    it("includes optional outputSchema when present", () => {
      const template: ActionTemplateDoc = {
        _id: new ObjectId(),
        name: "Extract",
        description: "Extract data",
        category: "extraction",
        tags: [],
        promptTemplate: "Extract: {{text}}",
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object" },
        createdBy: "system",
        visibility: "public",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = buildActionFromTemplate(
        template,
        "extract",
        new ObjectId(),
        new ObjectId(),
        "openai",
        "gpt-4o"
      );

      expect(action.outputSchema).toEqual({ type: "object" });
    });

    it("omits outputSchema when template has none", () => {
      const template: ActionTemplateDoc = {
        _id: new ObjectId(),
        name: "Summarize",
        description: "Summarize",
        category: "summarize",
        tags: [],
        promptTemplate: "Summarize: {{text}}",
        inputSchema: { type: "object" },
        createdBy: "system",
        visibility: "public",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = buildActionFromTemplate(
        template,
        "summarize",
        new ObjectId(),
        new ObjectId(),
        "openai",
        "gpt-4o"
      );

      expect(action.outputSchema).toBeUndefined();
    });
  });
});
