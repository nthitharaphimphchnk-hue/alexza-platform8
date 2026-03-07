/**
 * Action Template - marketplace / library of reusable actions
 */

import type { ObjectId } from "mongodb";

export type TemplateCategory =
  | "summarize"
  | "translate"
  | "extraction"
  | "writing"
  | "support"
  | "other"
  | "content"
  | "marketing"
  | "data_extraction"
  | "productivity"
  | "agents";

export type TemplateVisibility = "public" | "private";

export type TemplateCreatedBy = "system" | string; // "system" or userId string

export interface ActionTemplateDoc {
  _id: ObjectId;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  promptTemplate: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  /** Server-only: model ID for execution */
  defaultModel?: string;
  createdBy: TemplateCreatedBy;
  visibility: TemplateVisibility;
  createdAt: Date;
  updatedAt: Date;
}
