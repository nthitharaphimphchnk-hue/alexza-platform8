/**
 * Workflow Marketplace - publish, browse, install automation workflows
 */

import type { ObjectId } from "mongodb";

export type WorkflowMarketplaceVisibility = "public" | "private";
export type MarketplaceBillingType = "one-time" | "monthly";

export interface WorkflowMarketplaceDoc {
  _id: ObjectId;
  name: string;
  description: string;
  authorUserId: ObjectId;
  workflowId: ObjectId; // references workflows._id
  category?: string;
  tags: string[];
  price: number; // in major units (e.g. 9.99)
  billingType: MarketplaceBillingType;
  currency: string; // e.g. "usd"
  downloads: number;
  rating: number; // 0-5 average
  ratingCount: number;
  visibility: WorkflowMarketplaceVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstallDoc {
  _id: ObjectId;
  marketplaceItemId: ObjectId; // workflow_marketplace._id
  workspaceId: ObjectId;
  userId: ObjectId;
  installedWorkflowId: ObjectId; // the new workflow created in workspace
  installedAt: Date;
}

export interface WorkflowRatingDoc {
  _id: ObjectId;
  marketplaceItemId: ObjectId;
  userId: ObjectId;
  rating: number; // 1-5
  reviewText?: string;
  createdAt: Date;
  updatedAt: Date;
}
