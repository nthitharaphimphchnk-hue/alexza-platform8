import { ObjectId } from "mongodb";
import { getDb } from "./db";

interface UsageLogDoc {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  endpoint: string;
  status: "success" | "error";
  statusCode: number;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: Date;
  latencyMs: number;
}

interface LogUsageParams {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  endpoint: string;
  status: "success" | "error";
  statusCode: number;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  latencyMs: number;
}

let usageIndexesReady: Promise<void> | null = null;

export async function ensureUsageIndexes() {
  if (!usageIndexesReady) {
    usageIndexesReady = (async () => {
      const db = await getDb();
      const logs = db.collection<UsageLogDoc>("usage_logs");
      await logs.createIndex({ projectId: 1, createdAt: -1 });
      await logs.createIndex({ ownerUserId: 1, createdAt: -1 });
      await logs.createIndex({ apiKeyId: 1, createdAt: -1 });
      await logs.createIndex({ status: 1, createdAt: -1 });
    })();
  }
  return usageIndexesReady;
}

export async function logUsage(params: LogUsageParams) {
  await ensureUsageIndexes();
  const db = await getDb();
  const logs = db.collection<UsageLogDoc>("usage_logs");
  await logs.insertOne({
    projectId: params.projectId,
    ownerUserId: params.ownerUserId,
    apiKeyId: params.apiKeyId,
    endpoint: params.endpoint,
    status: params.status,
    statusCode: params.statusCode,
    provider: params.provider,
    model: params.model,
    inputTokens: params.inputTokens ?? null,
    outputTokens: params.outputTokens ?? null,
    totalTokens: params.totalTokens ?? null,
    createdAt: new Date(),
    latencyMs: params.latencyMs,
  });
}
