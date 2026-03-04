/**
 * RBAC permission checks for workspaces.
 * owner/admin: manage workspace + projects + api keys + billing
 * developer: manage actions, run actions, view analytics
 * viewer: read-only
 */

import type { ObjectId } from "mongodb";
import type { WorkspaceRole } from "./types";

export type Permission =
  | "workspace:manage"
  | "workspace:view"
  | "projects:manage"
  | "projects:view"
  | "keys:manage"
  | "keys:view"
  | "actions:manage"
  | "actions:run"
  | "analytics:view"
  | "billing:manage"
  | "members:manage";

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    "workspace:manage",
    "workspace:view",
    "projects:manage",
    "projects:view",
    "keys:manage",
    "keys:view",
    "actions:manage",
    "actions:run",
    "analytics:view",
    "billing:manage",
    "members:manage",
  ],
  admin: [
    "workspace:manage",
    "workspace:view",
    "projects:manage",
    "projects:view",
    "keys:manage",
    "keys:view",
    "actions:manage",
    "actions:run",
    "analytics:view",
    "billing:manage",
    "members:manage",
  ],
  developer: [
    "workspace:view",
    "projects:view",
    "keys:view",
    "actions:manage",
    "actions:run",
    "analytics:view",
  ],
  viewer: ["workspace:view", "projects:view", "keys:view", "analytics:view"],
};

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return hasPermission(role, "workspace:manage");
}

export function canManageProjects(role: WorkspaceRole): boolean {
  return hasPermission(role, "projects:manage");
}

export function canManageKeys(role: WorkspaceRole): boolean {
  return hasPermission(role, "keys:manage");
}

export function canManageActions(role: WorkspaceRole): boolean {
  return hasPermission(role, "actions:manage");
}

export function canRunActions(role: WorkspaceRole): boolean {
  return hasPermission(role, "actions:run");
}

export function canViewAnalytics(role: WorkspaceRole): boolean {
  return hasPermission(role, "analytics:view");
}

export function canManageBilling(role: WorkspaceRole): boolean {
  return hasPermission(role, "billing:manage");
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return hasPermission(role, "members:manage");
}
