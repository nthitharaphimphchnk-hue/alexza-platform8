/**
 * Template Pack (Starter Pack) - group of templates, agents, workflows
 */

import type { ObjectId } from "mongodb";

export interface TemplatePackDoc {
  _id: ObjectId;
  name: string;
  description: string;
  /** Template IDs from action_templates */
  templateIds: ObjectId[];
  /** Agent configs (for future use) */
  agents: unknown[];
  /** Workflow configs (for future use) */
  workflows: unknown[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
