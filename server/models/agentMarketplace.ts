/**
 * Agent Marketplace - publish, browse, install AI agents
 */

import type { ObjectId } from "mongodb";

export type AgentMarketplaceVisibility = "public" | "private";
export type MarketplaceBillingType = "one-time" | "monthly";

export interface AgentMarketplaceDoc {
  _id: ObjectId;
  name: string;
  description: string;
  authorUserId: ObjectId;
  agentId: ObjectId; // references agents._id
  category?: string;
  tags: string[];
  price: number; // in major units (e.g. 9.99)
  billingType: MarketplaceBillingType;
  currency: string; // e.g. "usd"
  downloads: number;
  rating: number; // 0-5 average
  ratingCount: number;
  visibility: AgentMarketplaceVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentInstallDoc {
  _id: ObjectId;
  marketplaceItemId: ObjectId; // agent_marketplace._id
  workspaceId: ObjectId;
  userId: ObjectId;
  installedAgentId: ObjectId; // the new agent created in workspace
  installedAt: Date;
}

export interface AgentRatingDoc {
  _id: ObjectId;
  marketplaceItemId: ObjectId;
  userId: ObjectId;
  rating: number; // 1-5
  reviewText?: string;
  createdAt: Date;
  updatedAt: Date;
}
