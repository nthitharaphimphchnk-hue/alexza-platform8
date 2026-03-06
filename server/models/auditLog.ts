/**
 * Audit Log - activity tracking for security and enterprise readiness.
 */

import type { ObjectId } from "mongodb";

export type AuditResourceType =
  | "project"
  | "action"
  | "api_key"
  | "webhook"
  | "wallet"
  | "team"
  | "user"
  | "workspace";

export type AuditStatus = "success" | "failed";

export interface AuditLogDoc {
  _id: ObjectId;
  ownerUserId: ObjectId;
  actorUserId: ObjectId;
  actorEmail: string;
  workspaceId?: ObjectId | null;
  projectId?: ObjectId | null;
  actionType: string;
  resourceType: AuditResourceType;
  resourceId: string;
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
  status: AuditStatus;
  createdAt: Date;
}
