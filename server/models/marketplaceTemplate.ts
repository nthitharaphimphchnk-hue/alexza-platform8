/**
 * Marketplace Template - user-published action templates
 */

import type { ObjectId } from "mongodb";

export type MarketplaceVisibility = "public" | "private";

export interface MarketplaceTemplateDoc {
  _id: ObjectId;
  name: string;
  description: string;
  author: string; // display name or email
  authorUserId: ObjectId;
  templateId: ObjectId; // references action_templates._id
  category?: string; // content, marketing, data_extraction, etc.
  tags: string[];
  downloads: number;
  rating: number; // 0-5 average
  ratingCount: number;
  visibility: MarketplaceVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceRatingDoc {
  _id: ObjectId;
  marketplaceTemplateId: ObjectId;
  userId: ObjectId;
  rating: number; // 1-5
  createdAt: Date;
}
