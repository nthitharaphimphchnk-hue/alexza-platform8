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
  /** SAML SSO - IdP entry point URL */
  samlEntryPoint?: string;
  /** SAML SSO - IdP issuer/entity ID */
  samlIssuer?: string;
  /** SAML SSO - IdP certificate (X.509 PEM) for response signature validation */
  samlCertificate?: string;
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
