import type { NextFunction, Request, Response } from "express";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "../db";
import { getSessionCookieName, hashSessionToken } from "../utils/crypto";

interface UserDoc {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

interface SessionDoc {
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AuthUser {
  _id: ObjectId;
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function unauthorized(res: Response) {
  return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[getSessionCookieName()];
    if (!token || typeof token !== "string") {
      return unauthorized(res);
    }

    const db = await getDb();
    const sessions = db.collection<SessionDoc>("sessions");
    const users = db.collection<UserDoc>("users");
    const tokenHash = hashSessionToken(token);

    const session = await sessions.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return unauthorized(res);
    }

    const user = (await users.findOne({
      _id: session.userId,
    })) as WithId<UserDoc> | null;

    if (!user) {
      return unauthorized(res);
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[Auth] user _id type:",
        typeof req.user._id,
        req.user._id?.constructor?.name
      );
    }

    next();
  } catch {
    return unauthorized(res);
  }
}
