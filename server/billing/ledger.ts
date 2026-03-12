/**
 * Billing ledger - immutable record of usage and charges.
 * Idempotent per requestId.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { getCreditPrice } from "../config";
import { calculateCostUsd } from "../config/modelPricing";
import { logger } from "../utils/logger";

export interface BillingLedgerDoc {
  _id: ObjectId;
  requestId: string;
  userId: ObjectId;
  projectId: ObjectId;
  apiKeyId: ObjectId;
  actionName: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsCharged: number;
  costUsd: number;
  revenueUsd: number;
  marginUsd: number;
  createdAt: Date;
}

export interface RecordBillingParams {
  requestId: string;
  userId: ObjectId;
  projectId: ObjectId;
  apiKeyId: ObjectId;
  actionName: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsCharged: number;
}

let ledgerIndexesReady: Promise<void> | null = null;

export async function ensureLedgerIndexes(): Promise<void> {
  if (!ledgerIndexesReady) {
    ledgerIndexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<BillingLedgerDoc>("billing_ledger");
      await col.createIndex({ requestId: 1 }, { unique: true });
      await col.createIndex({ userId: 1, createdAt: -1 });
      await col.createIndex({ projectId: 1, createdAt: -1 });
      await col.createIndex({ model: 1, createdAt: -1 });
      await col.createIndex({ createdAt: -1 });
    })();
  }
  await ledgerIndexesReady;
}

/**
 * Record a billing ledger entry. Idempotent: skips if requestId already exists.
 */
export async function recordBillingLedger(params: RecordBillingParams): Promise<boolean> {
  await ensureLedgerIndexes();
  const db = await getDb();
  const col = db.collection<BillingLedgerDoc>("billing_ledger");

  const existing = await col.findOne({ requestId: params.requestId });
  if (existing) {
    logger.debug({ requestId: params.requestId }, "[Billing] Ledger already exists, skipping");
    return false;
  }

  const costUsd = calculateCostUsd(
    params.model,
    params.inputTokens,
    params.outputTokens
  );
  const creditPrice = getCreditPrice();
  const revenueUsd = params.creditsCharged * creditPrice;
  const marginUsd = Math.round((revenueUsd - costUsd) * 1e6) / 1e6;

  const doc: Omit<BillingLedgerDoc, "_id"> = {
    requestId: params.requestId,
    userId: params.userId,
    projectId: params.projectId,
    apiKeyId: params.apiKeyId,
    actionName: params.actionName,
    provider: params.provider,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.totalTokens,
    creditsCharged: params.creditsCharged,
    costUsd,
    revenueUsd,
    marginUsd,
    createdAt: new Date(),
  };

  try {
    await col.insertOne(doc as BillingLedgerDoc);
    return true;
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return false;
    }
    throw err;
  }
}
