/**
 * Run logs - internal debug fields, SERVER_ONLY.
 * Exposed only via AdminTools with x-admin-key.
 */

import { ObjectId } from "mongodb";
import { getDb } from "./db";

export interface RunLogDoc {
  requestId: string;
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  actionName: string;
  status: "success" | "error";
  statusCode: number;
  latencyMs: number;
  /** SERVER_ONLY - internal debug */
  upstreamProvider?: string;
  /** SERVER_ONLY - internal debug */
  upstreamModel?: string;
  /** SERVER_ONLY - internal debug */
  upstreamRequestId?: string;
  /** SERVER_ONLY - internal debug */
  upstreamLatencyMs?: number;
  /** SERVER_ONLY - sanitized error message, no stack traces */
  rawUpstreamError?: string;
  createdAt: Date;
}

export interface LogRunParams {
  requestId: string;
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  actionName: string;
  status: "success" | "error";
  statusCode: number;
  latencyMs: number;
  upstreamProvider?: string;
  upstreamModel?: string;
  upstreamRequestId?: string;
  upstreamLatencyMs?: number;
  rawUpstreamError?: string;
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<RunLogDoc>("run_logs");
      await col.createIndex({ requestId: 1 }, { unique: true });
      await col.createIndex({ projectId: 1, createdAt: -1 });
      await col.createIndex({ ownerUserId: 1, createdAt: -1 });
      await col.createIndex({ createdAt: -1 });
    })();
  }
  return indexesReady;
}

export async function logRun(params: LogRunParams) {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<RunLogDoc>("run_logs").insertOne({
    requestId: params.requestId,
    projectId: params.projectId,
    ownerUserId: params.ownerUserId,
    apiKeyId: params.apiKeyId,
    actionName: params.actionName,
    status: params.status,
    statusCode: params.statusCode,
    latencyMs: params.latencyMs,
    upstreamProvider: params.upstreamProvider,
    upstreamModel: params.upstreamModel,
    upstreamRequestId: params.upstreamRequestId,
    upstreamLatencyMs: params.upstreamLatencyMs,
    rawUpstreamError: params.rawUpstreamError,
    createdAt: new Date(),
  });
}
