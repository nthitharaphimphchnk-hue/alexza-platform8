/**
 * Monetization - purchases and creator earnings across marketplaces.
 */

import type { ObjectId } from "mongodb";

export type BillingType = "one-time" | "monthly";
export type PurchaseStatus = "pending" | "paid" | "cancelled" | "failed";
export type MarketplaceItemType = "template" | "agent" | "workflow" | "app";

export interface MarketplacePurchaseDoc {
  _id: ObjectId;
  buyerUserId: ObjectId;
  creatorId: ObjectId; // creators._id
  creatorUserId: ObjectId; // users._id for quick lookup
  itemType: MarketplaceItemType;
  itemId: ObjectId; // marketplace record id (marketplace_templates/_id, agent_marketplace/_id, etc)
  price: number; // major units
  currency: string;
  billingType: BillingType;
  creatorShare: number; // 0-1
  platformShare: number; // 0-1
  revenue: number; // major units
  platformFee: number; // major units
  payoutAmount: number; // major units
  stripeSessionId: string;
  stripeSubscriptionId?: string;
  status: PurchaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorEarningDoc {
  _id: ObjectId;
  creatorId: ObjectId; // creators._id
  creatorUserId: ObjectId; // users._id
  itemType: MarketplaceItemType;
  itemId: ObjectId;
  purchaseId: ObjectId; // marketplace_purchases._id
  revenue: number;
  platformFee: number;
  payoutAmount: number;
  currency: string;
  createdAt: Date;
}

