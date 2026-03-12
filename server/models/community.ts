/**
 * Community feed - curated/discovered items across the community.
 */

import type { ObjectId } from "mongodb";

export type CommunityItemType = "agent" | "workflow" | "template" | "pack" | "app" | "creator";

export interface CommunityFeedDoc {
  _id: ObjectId;
  type: CommunityItemType;
  itemId: ObjectId;
  score: number;
  createdAt: Date;
}

