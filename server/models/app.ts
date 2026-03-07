/**
 * App Store - apps, versions, installs
 */

import type { ObjectId } from "mongodb";

export type AppPermission =
  | "run:actions"
  | "read:projects"
  | "manage:webhooks"
  | "manage:workflows";

export const APP_PERMISSIONS: AppPermission[] = [
  "run:actions",
  "read:projects",
  "manage:webhooks",
  "manage:workflows",
];

export interface AppDoc {
  _id: ObjectId;
  name: string;
  description: string;
  author: string;
  authorUserId: ObjectId;
  permissions: AppPermission[];
  category?: string;
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  visibility: "public" | "private";
  createdAt: Date;
  updatedAt: Date;
}

export interface AppVersionDoc {
  _id: ObjectId;
  appId: ObjectId;
  version: string;
  changelog?: string;
  createdAt: Date;
}

export interface AppInstallDoc {
  _id: ObjectId;
  appId: ObjectId;
  workspaceId: ObjectId;
  installedByUserId: ObjectId;
  installedAt: Date;
}
