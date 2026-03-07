/**
 * API Request Logs - user-facing request history for debugging.
 * Logged from POST /v1/projects/:id/run/:actionName
 */

import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { logger } from "./utils/logger";

export type ApiRequestStatus = "success" | "error" | "failed_insufficient_credits";

export interface ApiRequestDoc {
  id: string;
  ownerUserId: ObjectId;
  projectId: ObjectId;
  actionName: string;
  status: ApiRequestStatus;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
  source?: "api" | "playground";
  input?: Record<string, unknown>;
  createdAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<ApiRequestDoc>("api_requests");
      await col.createIndex({ id: 1 }, { unique: true });
      await col.createIndex({ ownerUserId: 1, createdAt: -1 });
      await col.createIndex({ projectId: 1, createdAt: -1 });
      await col.createIndex({ createdAt: -1 });
    })();
  }
  return indexesReady;
}

export interface LogApiRequestParams {
  id: string;
  ownerUserId: ObjectId;
  projectId: ObjectId;
  actionName: string;
  status: ApiRequestStatus;
  tokensUsed?: number;
  latencyMs: number;
  error?: string;
  source?: "api" | "playground";
  input?: Record<string, unknown>;
}

export async function logApiRequest(params: LogApiRequestParams): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const doc: ApiRequestDoc = {
    id: params.id,
    ownerUserId: params.ownerUserId,
    projectId: params.projectId,
    actionName: params.actionName,
    status: params.status,
    tokensUsed: params.tokensUsed ?? 0,
    latencyMs: params.latencyMs,
    error: params.error,
    source: params.source,
    ...(params.input && typeof params.input === "object" && Object.keys(params.input).length > 0 && { input: params.input }),
    createdAt: new Date(),
  };
  try {
    await db.collection<ApiRequestDoc>("api_requests").insertOne(doc);
  } catch (err) {
    logger.warn({ err, requestId: params.id }, "[ApiRequests] log insert failed");
  }
}
