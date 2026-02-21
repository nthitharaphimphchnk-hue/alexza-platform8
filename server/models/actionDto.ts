/**
 * Hidden Gateway - Public DTO for actions.
 * provider, model, routingPolicy are SERVER_ONLY and never returned to clients.
 */

import type { ObjectId } from "mongodb";
import type { ProjectActionDoc } from "./types";

/** Public action DTO - no provider/model/routingPolicy exposed */
export interface PublicActionDTO {
  id: string;
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  instruction?: string; // sanitized promptTemplate, optional for display
  createdAt: Date;
  updatedAt: Date;
}

/** Proposed action for client (from Builder AI) - no provider/model */
export interface PublicProposedActionDTO {
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  instruction?: string;
}

/** Fields that must NEVER appear in public API responses */
export const SERVER_ONLY_ACTION_FIELDS = [
  "provider",
  "model",
  "routingPolicy",
  "fallbackModels",
  "temperature",
  "maxTokens",
  "promptTemplate", // exposed as "instruction" only when sanitized
] as const;

export function toPublicAction(
  doc: ProjectActionDoc & { _id: ObjectId }
): PublicActionDTO {
  return {
    id: doc._id.toString(),
    actionName: doc.actionName,
    description: doc.description,
    inputSchema: doc.inputSchema,
    outputSchema: doc.outputSchema,
    instruction: doc.promptTemplate || undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Strip provider/model/gateway; return only public fields */
export function toPublicProposedAction(pa: {
  actionName?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  promptTemplate?: string;
  [key: string]: unknown;
}): PublicProposedActionDTO {
  return {
    actionName: typeof pa.actionName === "string" ? pa.actionName : "action",
    description: typeof pa.description === "string" ? pa.description : "",
    inputSchema:
      pa.inputSchema && typeof pa.inputSchema === "object"
        ? pa.inputSchema
        : { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
    outputSchema:
      pa.outputSchema && typeof pa.outputSchema === "object" ? pa.outputSchema : undefined,
    instruction: typeof pa.promptTemplate === "string" ? pa.promptTemplate : undefined,
  };
}
