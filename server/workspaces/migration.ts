/**
 * Workspace migration: create default personal workspace for existing users,
 * migrate projects to workspace.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";
import type { WorkspaceDoc } from "./types";
import type { WorkspaceMemberDoc } from "./types";

export async function ensurePersonalWorkspace(userId: ObjectId): Promise<void> {
  const db = await getDb();
  const workspaces = db.collection<WorkspaceDoc>("workspaces");
  const members = db.collection<WorkspaceMemberDoc>("workspace_members");

  const existing = await members.findOne({ userId, role: "owner" });
  if (existing) return;

  const existingWs = await workspaces.findOne({ ownerUserId: userId });
  if (existingWs) {
    const memberExists = await members.findOne({ workspaceId: existingWs._id, userId });
    if (!memberExists) {
      await members.insertOne({
        workspaceId: existingWs._id,
        userId,
        role: "owner",
        status: "active",
        createdAt: new Date(),
      });
    }
    return;
  }

  const now = new Date();
  const insertResult = await workspaces.insertOne({
    name: "Personal",
    ownerUserId: userId,
    createdAt: now,
  });

  await members.insertOne({
    workspaceId: insertResult.insertedId,
    userId,
    role: "owner",
    status: "active",
    createdAt: now,
  });
}

export async function runWorkspaceMigration() {
  const db = await getDb();
  const workspaces = db.collection<WorkspaceDoc>("workspaces");
  const members = db.collection<WorkspaceMemberDoc>("workspace_members");
  const projects = db.collection<{ _id: ObjectId; ownerUserId: ObjectId; workspaceId?: ObjectId }>("projects");
  const users = db.collection<{ _id: ObjectId }>("users");

  await workspaces.createIndex({ ownerUserId: 1 });
  await members.createIndex({ workspaceId: 1, userId: 1 }, { unique: true });
  await members.createIndex({ userId: 1 });
  await members.createIndex({ workspaceId: 1 });
  await projects.createIndex({ workspaceId: 1 });

  const allUsers = await users.find({}).project({ _id: 1 }).toArray();
  let created = 0;

  for (const user of allUsers) {
    const existingMember = await members.findOne({
      userId: user._id,
      role: "owner",
    });
    if (existingMember) continue;

    const existingWorkspace = await workspaces.findOne({ ownerUserId: user._id });
    if (existingWorkspace) {
      const memberExists = await members.findOne({
        workspaceId: existingWorkspace._id,
        userId: user._id,
      });
      if (!memberExists) {
        await members.insertOne({
          workspaceId: existingWorkspace._id,
          userId: user._id,
          role: "owner",
          status: "active",
          createdAt: new Date(),
        });
        created += 1;
      }
      const userProjects = await projects.find({ ownerUserId: user._id, workspaceId: { $exists: false } }).toArray();
      if (userProjects.length > 0) {
        await projects.updateMany(
          { ownerUserId: user._id, workspaceId: { $exists: false } },
          { $set: { workspaceId: existingWorkspace._id } }
        );
      }
      continue;
    }

    const now = new Date();
    const insertResult = await workspaces.insertOne({
      name: "Personal",
      ownerUserId: user._id,
      createdAt: now,
    });

    await members.insertOne({
      workspaceId: insertResult.insertedId,
      userId: user._id,
      role: "owner",
      status: "active",
      createdAt: now,
    });

    const userProjects = await projects.find({ ownerUserId: user._id, workspaceId: { $exists: false } }).toArray();
    if (userProjects.length > 0) {
      await projects.updateMany(
        { ownerUserId: user._id, workspaceId: { $exists: false } },
        { $set: { workspaceId: insertResult.insertedId } }
      );
    }

    created += 1;
  }

  if (created > 0) {
    logger.info({ created }, "[Workspace] migration: created personal workspaces");
  }
}
