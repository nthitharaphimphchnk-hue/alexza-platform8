import type { NextFunction, Request, Response } from "express";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "../db";
import { hashApiKey } from "../utils/apiKey";

interface ApiKeyDoc {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  name?: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface AuthorizedApiKey {
  id: string;
  _id: ObjectId;
  projectId: ObjectId;
  ownerUserId: ObjectId;
  keyPrefix: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: AuthorizedApiKey;
      projectId?: ObjectId;
      ownerUserId?: ObjectId;
    }
  }
}

function unauthorized(res: Response) {
  return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
}

function extractRawApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length > 0) return token;
  }

  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }

  return null;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const rawKey = extractRawApiKey(req);
    if (!rawKey) {
      return unauthorized(res);
    }

    const db = await getDb();
    const apiKeys = db.collection<ApiKeyDoc>("api_keys");
    const keyHash = hashApiKey(rawKey);

    const keyDoc = (await apiKeys.findOne({
      keyHash,
    })) as WithId<ApiKeyDoc> | null;

    if (!keyDoc || keyDoc.revokedAt) {
      return unauthorized(res);
    }

    req.apiKey = {
      id: keyDoc._id.toString(),
      _id: keyDoc._id,
      projectId: keyDoc.projectId,
      ownerUserId: keyDoc.ownerUserId,
      keyPrefix: keyDoc.keyPrefix,
      name: keyDoc.name,
    };
    req.projectId = keyDoc.projectId;
    req.ownerUserId = keyDoc.ownerUserId;

    next();
  } catch {
    return unauthorized(res);
  }
}
