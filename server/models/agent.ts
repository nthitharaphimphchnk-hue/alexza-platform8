/**
 * AI Agent - uses actions, workflows, webhooks as tools
 */

import type { ObjectId } from "mongodb";

export type AgentToolType = "action" | "workflow" | "webhook";

export interface AgentToolAction {
  type: "action";
  projectId: string;
  actionName: string;
  label?: string;
}

export interface AgentToolWorkflow {
  type: "workflow";
  workflowId: string;
  label?: string;
}

export interface AgentToolWebhook {
  type: "webhook";
  url: string;
  method?: string;
  label?: string;
}

export type AgentTool = AgentToolAction | AgentToolWorkflow | AgentToolWebhook;

export interface AgentDoc {
  _id: ObjectId;
  name: string;
  description: string;
  workspaceId: ObjectId;
  ownerUserId: ObjectId;
  tools: AgentTool[];
  memoryEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMemoryDoc {
  _id: ObjectId;
  agentId: ObjectId;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}
