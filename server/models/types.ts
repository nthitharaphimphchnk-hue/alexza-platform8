/**
 * ALEXZA AI - Shared types for Builder & Actions
 */

import type { ObjectId } from "mongodb";

export interface ChatThreadDoc {
  userId: ObjectId;
  projectId: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDoc {
  threadId: ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

/** SERVER_ONLY - never expose to client */
export type ProviderType = "openrouter" | "openai";

export interface ProjectActionDoc {
  userId: ObjectId;
  projectId: ObjectId;
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  promptTemplate: string;
  /** SERVER_ONLY */
  provider: ProviderType;
  /** SERVER_ONLY */
  model: string;
  /** SERVER_ONLY */
  routingPolicy?: string;
  /** SERVER_ONLY - fallback model IDs if primary fails */
  fallbackModels?: string[];
  /** SERVER_ONLY */
  temperature?: number;
  /** SERVER_ONLY */
  maxTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposedAction {
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  promptTemplate: string;
  provider: ProviderType;
  model: string;
  temperature?: number;
  maxTokens?: number;
}
