/**
 * Project access checks - workspace-aware.
 * Supports legacy ownerUserId and workspaceId.
 */

import type { ObjectId } from "mongodb";
import { getDb } from "../db";
import type { WorkspaceMemberDoc } from "./types";

export async function getWorkspaceIdsForUser(userId: ObjectId): Promise<ObjectId[]> {
  const db = await getDb();
  const rows = await db
    .collection<WorkspaceMemberDoc>("workspace_members")
    .find({ userId, status: "active" })
    .project({ workspaceId: 1 })
    .toArray();
  return rows.map((r) => r.workspaceId);
}

export async function ensureProjectAccess(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const project = await db.collection<{ _id: ObjectId; ownerUserId: ObjectId; workspaceId?: ObjectId }>("projects").findOne({ _id: projectId });
  if (!project) return false;

  if (project.ownerUserId.equals(userId)) return true;

  if (project.workspaceId) {
    const workspaceIds = await getWorkspaceIdsForUser(userId);
    return workspaceIds.some((wid) => wid.equals(project.workspaceId!));
  }

  return false;
}
