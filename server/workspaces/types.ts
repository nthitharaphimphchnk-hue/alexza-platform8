/**
 * Workspace and member types.
 */

import type { ObjectId } from "mongodb";

export type WorkspaceRole = "owner" | "admin" | "developer" | "viewer";
export type WorkspaceMemberStatus = "invited" | "active";

export interface WorkspaceDoc {
  name: string;
  ownerUserId: ObjectId;
  createdAt: Date;
}

export interface WorkspaceMemberDoc {
  workspaceId: ObjectId;
  userId: ObjectId;
  role: WorkspaceRole;
  invitedEmail?: string;
  status: WorkspaceMemberStatus;
  createdAt: Date;
}

export interface WorkspaceInviteDoc {
  workspaceId: ObjectId;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedByUserId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}
