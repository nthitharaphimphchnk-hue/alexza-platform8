/**
 * Template apply logic - build Action doc from template.
 * Used by templatesRoutes and unit tests.
 */

import type { ObjectId } from "mongodb";
import type { ActionTemplateDoc } from "../models/actionTemplate";
import type { ProjectActionDoc } from "../models/types";

export const ACTION_NAME_REGEX = /^[a-z0-9_-]+$/;

export function toActionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function buildActionFromTemplate(
  template: ActionTemplateDoc,
  actionName: string,
  userId: ObjectId,
  projectId: ObjectId,
  provider: "openrouter" | "openai",
  model: string
): ProjectActionDoc {
  const now = new Date();
  return {
    userId,
    projectId,
    actionName,
    description: template.description,
    inputSchema: template.inputSchema,
    outputSchema: template.outputSchema,
    promptTemplate: template.promptTemplate,
    provider,
    model,
    routingPolicy: "quality",
    temperature: 0.7,
    maxTokens: 2048,
    createdAt: now,
    updatedAt: now,
  };
}
