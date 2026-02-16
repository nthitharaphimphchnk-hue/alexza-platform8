import { ObjectId } from "mongodb";
import { getDb } from "./db";

interface UsageLogDoc {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  endpoint: string;
  statusCode: number;
  createdAt: Date;
  latencyMs: number;
}

interface LogUsageParams {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  apiKeyId: ObjectId;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
}

let usageIndexesReady: Promise<void> | null = null;

async function ensureUsageIndexes() {
  if (!usageIndexesReady) {
    usageIndexesReady = (async () => {
      const db = await getDb();
      const logs = db.collection<UsageLogDoc>("usage_logs");
      await logs.createIndex({ projectId: 1, createdAt: -1 });
      await logs.createIndex({ ownerUserId: 1, createdAt: -1 });
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
    statusCode: params.statusCode,
    createdAt: new Date(),
    latencyMs: params.latencyMs,
  });
}
