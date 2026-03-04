/**
 * Workspace API - CRUD, invite, accept.
 */

import { Router } from "express";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { logger } from "../utils/logger";
import { normalizeEnvUrl } from "../utils/envUrls";
import type { WorkspaceDoc, WorkspaceMemberDoc, WorkspaceRole } from "./types";
import { hasPermission } from "./permissions";

const router = Router();
const BASE_URL = normalizeEnvUrl(process.env.CLIENT_URL) || normalizeEnvUrl(process.env.BASE_URL) || "http://localhost:3000";

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message } as const;
}

function parseWorkspaceId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

const ROLES: WorkspaceRole[] = ["owner", "admin", "developer", "viewer"];

async function getMemberRole(workspaceId: ObjectId, userId: ObjectId): Promise<WorkspaceRole | null> {
  const db = await getDb();
  const member = await db
    .collection<WorkspaceMemberDoc>("workspace_members")
    .findOne({ workspaceId, userId, status: "active" });
  return member?.role ?? null;
}

async function getWorkspace(workspaceId: ObjectId) {
  const db = await getDb();
  return db.collection<WorkspaceDoc>("workspaces").findOne({ _id: workspaceId });
}

router.get("/workspaces", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const db = await getDb();
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");
    const workspaces = db.collection<WorkspaceDoc>("workspaces");

    const myMemberships = await members
      .find({ userId: req.user._id, status: "active" })
      .sort({ createdAt: 1 })
      .toArray();

    const workspaceIds = myMemberships.map((m) => m.workspaceId);
    const wsList = await workspaces.find({ _id: { $in: workspaceIds } }).toArray();

    const roleMap = new Map(myMemberships.map((m) => [m.workspaceId.toString(), m.role]));

    const items = wsList.map((ws) => ({
      id: ws._id.toString(),
      name: ws.name,
      ownerUserId: ws.ownerUserId.toString(),
      role: roleMap.get(ws._id.toString()) ?? "viewer",
      createdAt: ws.createdAt,
    }));

    return res.json({ ok: true, workspaces: items });
  } catch (error) {
    logger.error({ err: error }, "[Workspaces] list error");
    return next(error);
  }
});

router.post("/workspaces", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2) {
      return res.status(400).json(validationError("Workspace name must be at least 2 characters"));
    }

    const db = await getDb();
    const workspaces = db.collection<WorkspaceDoc>("workspaces");
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");
    const now = new Date();

    const insertResult = await workspaces.insertOne({
      name,
      ownerUserId: req.user._id,
      createdAt: now,
    });

    await members.insertOne({
      workspaceId: insertResult.insertedId,
      userId: req.user._id,
      role: "owner",
      status: "active",
      createdAt: now,
    });

    const ws = await workspaces.findOne({ _id: insertResult.insertedId });
    if (!ws) throw new Error("Failed to load workspace");

    return res.status(201).json({
      ok: true,
      workspace: {
        id: ws._id.toString(),
        name: ws.name,
        ownerUserId: ws.ownerUserId.toString(),
        role: "owner",
        createdAt: ws.createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[Workspaces] create error");
    return next(error);
  }
});

router.get("/workspaces/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseWorkspaceId(req.params.id);
    if (!workspaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const ws = await getWorkspace(workspaceId);
    if (!ws) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({
      ok: true,
      workspace: {
        id: ws._id.toString(),
        name: ws.name,
        ownerUserId: ws.ownerUserId.toString(),
        role,
        createdAt: ws.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/workspaces/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseWorkspaceId(req.params.id);
    if (!workspaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role || !hasPermission(role, "workspace:manage")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2) {
      return res.status(400).json(validationError("Workspace name must be at least 2 characters"));
    }

    const db = await getDb();
    const updated = await db
      .collection<WorkspaceDoc>("workspaces")
      .findOneAndUpdate(
        { _id: workspaceId },
        { $set: { name } },
        { returnDocument: "after" }
      );

    if (!updated) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    return res.json({
      ok: true,
      workspace: {
        id: updated._id.toString(),
        name: updated.name,
        ownerUserId: updated.ownerUserId.toString(),
        role,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/workspaces/:id/members", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseWorkspaceId(req.params.id);
    if (!workspaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role || !hasPermission(role, "workspace:view")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const db = await getDb();
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");
    const users = db.collection<{ _id: ObjectId; email: string; name?: string }>("users");

    const rows = await members.find({ workspaceId, status: "active" }).toArray();
    const userIds = rows.map((r) => r.userId).filter(Boolean);
    const userList = await users.find({ _id: { $in: userIds } }).toArray();
    const userMap = new Map(userList.map((u) => [u._id.toString(), u]));

    const items = rows.map((m) => {
      const u = userMap.get(m.userId.toString());
      return {
        userId: m.userId.toString(),
        email: u?.email ?? m.invitedEmail ?? "",
        name: u?.name ?? "",
        role: m.role,
        status: m.status,
      };
    });

    return res.json({ ok: true, members: items });
  } catch (error) {
    return next(error);
  }
});

interface WorkspaceInviteDoc {
  workspaceId: ObjectId;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedByUserId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

router.post("/workspaces/:id/invite", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseWorkspaceId(req.params.id);
    if (!workspaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role || !hasPermission(role, "members:manage")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const roleRaw = typeof req.body?.role === "string" ? req.body.role : "developer";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json(validationError("Valid email is required"));
    }
    if (!ROLES.includes(roleRaw as WorkspaceRole) || roleRaw === "owner") {
      return res.status(400).json(validationError("role must be admin, developer, or viewer"));
    }
    const inviteRole = roleRaw as WorkspaceRole;

    const db = await getDb();
    const users = db.collection<{ _id: ObjectId; email: string }>("users");
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");
    const invites = db.collection<WorkspaceInviteDoc>("workspace_invites");

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      const existingMember = await members.findOne({
        workspaceId,
        userId: existingUser._id,
        status: "active",
      });
      if (existingMember) {
        return res.status(409).json({ ok: false, error: "ALREADY_MEMBER", message: "User is already a member" });
      }
    }

    const existingInvite = await invites.findOne({
      workspaceId,
      email,
      expiresAt: { $gt: new Date() },
    });
    if (existingInvite) {
      return res.status(409).json({ ok: false, error: "INVITE_PENDING", message: "Invite already sent" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await invites.insertOne({
      workspaceId,
      email,
      role: inviteRole,
      token,
      invitedByUserId: req.user._id,
      expiresAt,
      createdAt: now,
    });

    const ws = await getWorkspace(workspaceId);
    const inviteLink = `${BASE_URL}/app/workspaces/invite?token=${token}`;

    if (process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: `You're invited to ${ws?.name ?? "a workspace"} on ALEXZA AI`,
          html: `
            <p>You've been invited to join <strong>${ws?.name ?? "a workspace"}</strong> on ALEXZA AI.</p>
            <p>Role: ${inviteRole}</p>
            <p><a href="${inviteLink}">Accept invite</a></p>
            <p>This link expires in 7 days.</p>
          `,
        });
      } catch (emailErr) {
        logger.warn({ err: emailErr, email }, "[Workspaces] invite email failed, logging link");
      }
    }

    if (process.env.NODE_ENV !== "production") {
      logger.info({ inviteLink, email, role: inviteRole }, "[Workspaces] invite link (dev)");
    }

    return res.status(201).json({
      ok: true,
      invite: { email, role: inviteRole, expiresAt },
      inviteLink: process.env.NODE_ENV !== "production" ? inviteLink : undefined,
    });
  } catch (error) {
    logger.error({ err: error }, "[Workspaces] invite error");
    return next(error);
  }
});

router.get("/workspaces/invites/:token", async (req, res, next) => {
  try {
    const token = (req.params.token ?? "").trim();
    if (!token) return res.status(400).json(validationError("Token is required"));

    const db = await getDb();
    const invites = db.collection<WorkspaceInviteDoc>("workspace_invites");
    const workspaces = db.collection<WorkspaceDoc>("workspaces");
    const users = db.collection<{ _id: ObjectId; name: string }>("users");

    const invite = await invites.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });
    if (!invite) {
      return res.status(404).json({ ok: false, error: "INVITE_EXPIRED", message: "Invite not found or expired" });
    }

    const ws = await workspaces.findOne({ _id: invite.workspaceId });
    const inviter = await users.findOne({ _id: invite.invitedByUserId });

    return res.json({
      ok: true,
      workspaceName: ws?.name ?? "Workspace",
      role: invite.role,
      invitedBy: inviter?.name ?? "",
      email: invite.email,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/workspaces/invites/:token/accept", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const token = (req.params.token ?? "").trim();
    if (!token) return res.status(400).json(validationError("Token is required"));

    const db = await getDb();
    const invites = db.collection<WorkspaceInviteDoc>("workspace_invites");
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");

    const invite = await invites.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });
    if (!invite) {
      return res.status(404).json({ ok: false, error: "INVITE_EXPIRED", message: "Invite not found or expired" });
    }

    const userEmail = (req.user as { email?: string }).email ?? "";
    const normalizedInviteEmail = invite.email.toLowerCase();
    const normalizedUserEmail = userEmail.toLowerCase();
    if (normalizedUserEmail !== normalizedInviteEmail) {
      return res.status(403).json({
        ok: false,
        error: "EMAIL_MISMATCH",
        message: "Invite was sent to a different email address",
      });
    }

    const existing = await members.findOne({
      workspaceId: invite.workspaceId,
      userId: req.user._id,
      status: "active",
    });
    if (existing) {
      await invites.deleteOne({ _id: invite._id });
      return res.json({ ok: true, workspaceId: invite.workspaceId.toString(), alreadyMember: true });
    }

    const now = new Date();
    await members.insertOne({
      workspaceId: invite.workspaceId,
      userId: req.user._id,
      role: invite.role,
      status: "active",
      createdAt: now,
    });

    await invites.deleteOne({ _id: invite._id });

    return res.json({
      ok: true,
      workspaceId: invite.workspaceId.toString(),
      role: invite.role,
    });
  } catch (error) {
    logger.error({ err: error }, "[Workspaces] accept invite error");
    return next(error);
  }
});

router.patch("/workspaces/:id/members/:userId/role", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseWorkspaceId(req.params.id);
    const targetUserId = ObjectId.isValid(req.params.userId) ? new ObjectId(req.params.userId) : null;
    if (!workspaceId || !targetUserId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role || !hasPermission(role, "members:manage")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const newRole = typeof req.body?.role === "string" ? req.body.role : "";
    if (!ROLES.includes(newRole as WorkspaceRole) || newRole === "owner") {
      return res.status(400).json(validationError("role must be admin, developer, or viewer"));
    }

    const db = await getDb();
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");

    const targetMember = await members.findOne({ workspaceId, userId: targetUserId, status: "active" });
    if (!targetMember) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    if (targetMember.role === "owner") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cannot change owner role" });
    }

    if (req.user._id.equals(targetUserId) && role !== "owner") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cannot change your own role" });
    }

    await members.updateOne(
      { workspaceId, userId: targetUserId },
      { $set: { role: newRole as WorkspaceRole } }
    );

    return res.json({ ok: true, role: newRole });
  } catch (error) {
    return next(error);
  }
});

router.delete("/workspaces/:id/members/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const workspaceId = parseWorkspaceId(req.params.id);
    const targetUserId = ObjectId.isValid(req.params.userId) ? new ObjectId(req.params.userId) : null;
    if (!workspaceId || !targetUserId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role || !hasPermission(role, "members:manage")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const db = await getDb();
    const members = db.collection<WorkspaceMemberDoc>("workspace_members");

    const targetMember = await members.findOne({ workspaceId, userId: targetUserId, status: "active" });
    if (!targetMember) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    if (targetMember.role === "owner") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cannot remove owner" });
    }

    const isSelf = req.user._id.equals(targetUserId);
    if (!isSelf && role !== "owner" && role !== "admin") {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    await members.deleteOne({ workspaceId, userId: targetUserId });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export { router as workspacesRouter };
export { getMemberRole, getWorkspace };
export type { WorkspaceInviteDoc };
