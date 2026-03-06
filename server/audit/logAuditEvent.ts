/**
 * Audit logging - persist events, redact secrets, log with pino.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";
import type { AuditLogDoc, AuditResourceType, AuditStatus } from "../models/auditLog";

const SECRET_KEYS = [
  "apiKey",
  "api_key",
  "secret",
  "password",
  "token",
  "authorization",
  "keyHash",
  "key_hash",
  "rawKey",
  "raw_key",
];

const MAX_STRING_LENGTH = 2000;
const MAX_PROMPT_LENGTH = 500;

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEYS.some((sk) => lower.includes(sk.toLowerCase()));
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + `...[truncated ${str.length - max} chars]`;
}

function redactMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (isSecretKey(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (v === null || v === undefined) {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      if (k.toLowerCase().includes("prompt")) {
        out[k] = truncate(v, MAX_PROMPT_LENGTH);
      } else {
        out[k] = truncate(v, MAX_STRING_LENGTH);
      }
      continue;
    }
    if (typeof v === "object" && !Array.isArray(v) && v !== null) {
      out[k] = redactMetadata(v as Record<string, unknown>);
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
          ? redactMetadata(item as Record<string, unknown>)
          : item
      );
      continue;
    }
    out[k] = v;
  }
  return out;
}

export interface LogAuditParams {
  ownerUserId: ObjectId;
  actorUserId: ObjectId;
  actorEmail: string;
  workspaceId?: ObjectId | null;
  projectId?: ObjectId | null;
  actionType: string;
  resourceType: AuditResourceType;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  status: AuditStatus;
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<AuditLogDoc>("audit_logs");
      await col.createIndex({ ownerUserId: 1, createdAt: -1 });
      await col.createIndex({ workspaceId: 1, createdAt: -1 });
      await col.createIndex({ projectId: 1, createdAt: -1 });
      await col.createIndex({ actorUserId: 1, createdAt: -1 });
      await col.createIndex({ actionType: 1 });
      await col.createIndex({ resourceType: 1 });
      await col.createIndex({ status: 1 });
      await col.createIndex({ createdAt: -1 });
    })();
  }
  return indexesReady;
}

export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    await ensureIndexes();
    const metadata = redactMetadata(params.metadata ?? {});

    const doc: Omit<AuditLogDoc, "_id"> = {
      ownerUserId: params.ownerUserId,
      actorUserId: params.actorUserId,
      actorEmail: params.actorEmail,
      workspaceId: params.workspaceId ?? null,
      projectId: params.projectId ?? null,
      actionType: params.actionType,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata,
      ip: params.ip ?? "",
      userAgent: params.userAgent ?? "",
      status: params.status,
      createdAt: new Date(),
    };

    const db = await getDb();
    await db.collection<AuditLogDoc>("audit_logs").insertOne(doc as AuditLogDoc);

    logger.info(
      {
        actionType: params.actionType,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        actorUserId: params.actorUserId.toString(),
        status: params.status,
      },
      "[Audit] event logged"
    );
  } catch (err) {
    logger.error({ err }, "[Audit] failed to persist event");
  }
}

export function redactMetadataForTest(meta: Record<string, unknown>): Record<string, unknown> {
  return redactMetadata(meta);
}
