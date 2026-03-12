/**
 * Creator Profiles - public profiles for developers and AI builders
 */

import type { ObjectId } from "mongodb";

export interface CreatorDoc {
  _id: ObjectId;
  username: string; // unique, URL-safe
  displayName: string;
  bio: string;
  avatar: string; // URL
  userId: ObjectId; // references users._id
  stripeConnectAccountId?: string; // Stripe Connect account for payouts
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorFollowDoc {
  _id: ObjectId;
  creatorUserId: ObjectId; // the creator being followed
  followerUserId: ObjectId;
  createdAt: Date;
}

/** URL-safe username: lowercase letters, numbers, underscore */
export const USERNAME_REGEX = /^[a-z0-9_]{2,32}$/;
