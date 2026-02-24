/**
 * Wallet service - prepaid credits model.
 * 1 credit = 1,000 tokens. Atomic operations.
 */

import { ObjectId } from "mongodb";
import { getDb } from "./db";

export const TOKENS_PER_CREDIT = 1000;
export const CREDIT_PRICE = 0.003;
export const FREE_CREDITS = 500;

export type WalletTransactionType = "grant" | "topup" | "reserve" | "usage" | "refund";

interface WalletTransactionDoc {
  userId: ObjectId;
  type: WalletTransactionType;
  credits: number;
  requestId?: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

interface UserWalletDoc {
  _id: ObjectId;
  walletBalanceCredits?: number;
  walletGrantedFreeCredits?: boolean;
  walletUpdatedAt?: Date;
}

let walletCollectionsReady: Promise<void> | null = null;

async function ensureWalletCollections() {
  if (!walletCollectionsReady) {
    walletCollectionsReady = (async () => {
      const db = await getDb();
      const transactions = db.collection<WalletTransactionDoc>("wallet_transactions");
      await transactions.createIndex({ userId: 1, createdAt: -1 });
      await transactions.createIndex({ requestId: 1 });
    })();
  }
  return walletCollectionsReady;
}

export async function writeWalletTransaction(params: {
  userId: ObjectId;
  type: WalletTransactionType;
  credits: number;
  requestId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await ensureWalletCollections();
  const db = await getDb();
  await db.collection<WalletTransactionDoc>("wallet_transactions").insertOne({
    userId: params.userId,
    type: params.type,
    credits: params.credits,
    requestId: params.requestId,
    createdAt: new Date(),
    meta: params.meta,
  });
}

export class InsufficientBalanceError extends Error {
  requiredCredits: number;
  balanceCredits: number;

  constructor(requiredCredits: number, balanceCredits: number) {
    super(`Insufficient balance: need ${requiredCredits}, have ${balanceCredits}`);
    this.name = "InsufficientBalanceError";
    this.requiredCredits = requiredCredits;
    this.balanceCredits = balanceCredits;
  }
}

export async function getBalance(userId: ObjectId): Promise<{ balanceCredits: number }> {
  await ensureWalletCollections();
  const db = await getDb();
  const user = (await db.collection<UserWalletDoc>("users").findOne({ _id: userId })) as UserWalletDoc | null;
  const balanceCredits = typeof user?.walletBalanceCredits === "number" ? user.walletBalanceCredits : 0;
  return { balanceCredits };
}

export async function ensureSufficientBalance(userId: ObjectId, requiredCredits: number): Promise<void> {
  const { balanceCredits } = await getBalance(userId);
  if (balanceCredits < requiredCredits) {
    throw new InsufficientBalanceError(requiredCredits, balanceCredits);
  }
}

/**
 * Atomic reserve: decrement balance by estimatedCredits only if balance >= estimatedCredits.
 * Returns new balance. Throws InsufficientBalanceError if not enough.
 */
export async function reserveCredits(params: {
  userId: ObjectId;
  estimatedCredits: number;
  requestId: string;
}): Promise<{ balanceCredits: number }> {
  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  const result = await users.findOneAndUpdate(
    {
      _id: params.userId,
      $expr: { $gte: [{ $ifNull: ["$walletBalanceCredits", 0] }, params.estimatedCredits] },
    },
    {
      $inc: { walletBalanceCredits: -params.estimatedCredits },
      $set: { walletUpdatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    const { balanceCredits } = await getBalance(params.userId);
    throw new InsufficientBalanceError(params.estimatedCredits, balanceCredits);
  }

  await writeWalletTransaction({
    userId: params.userId,
    type: "reserve",
    credits: -params.estimatedCredits,
    requestId: params.requestId,
    meta: { estimatedCredits: params.estimatedCredits },
  });

  return {
    balanceCredits: typeof result.walletBalanceCredits === "number" ? result.walletBalanceCredits : 0,
  };
}

/**
 * Deduct additional credits (when actual > estimated). Atomic.
 */
export async function deductAdditionalCredits(params: {
  userId: ObjectId;
  additionalCredits: number;
  requestId: string;
  meta?: Record<string, unknown>;
}): Promise<{ balanceCredits: number }> {
  if (params.additionalCredits <= 0) {
    return getBalance(params.userId);
  }

  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  const result = await users.findOneAndUpdate(
    {
      _id: params.userId,
      $expr: { $gte: [{ $ifNull: ["$walletBalanceCredits", 0] }, params.additionalCredits] },
    },
    {
      $inc: { walletBalanceCredits: -params.additionalCredits },
      $set: { walletUpdatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    const { balanceCredits } = await getBalance(params.userId);
    throw new InsufficientBalanceError(params.additionalCredits, balanceCredits);
  }

  await writeWalletTransaction({
    userId: params.userId,
    type: "usage",
    credits: -params.additionalCredits,
    requestId: params.requestId,
    meta: params.meta,
  });

  return {
    balanceCredits: typeof result.walletBalanceCredits === "number" ? result.walletBalanceCredits : 0,
  };
}

/**
 * Refund credits (when actual < estimated or provider failed).
 */
export async function refundCredits(params: {
  userId: ObjectId;
  refundCredits: number;
  requestId: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (params.refundCredits <= 0) return;

  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  await users.updateOne(
    { _id: params.userId },
    {
      $inc: { walletBalanceCredits: params.refundCredits },
      $set: { walletUpdatedAt: new Date() },
    }
  );

  await writeWalletTransaction({
    userId: params.userId,
    type: "refund",
    credits: params.refundCredits,
    requestId: params.requestId,
    meta: params.meta,
  });
}

/**
 * User self top-up (e.g. manual testing). Increments walletBalanceCredits.
 */
export async function topupForUser(params: {
  userId: ObjectId;
  credits: number;
  reason: string;
}): Promise<{ balanceCredits: number }> {
  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  const result = await users.findOneAndUpdate(
    { _id: params.userId },
    {
      $inc: { walletBalanceCredits: params.credits },
      $set: { walletUpdatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new Error("User not found");
  }

  await writeWalletTransaction({
    userId: params.userId,
    type: "topup",
    credits: params.credits,
    meta: { reason: params.reason },
  });

  return {
    balanceCredits: typeof result.walletBalanceCredits === "number" ? result.walletBalanceCredits : 0,
  };
}

/**
 * Stripe webhook top-up. Increments walletBalanceCredits with requestId for idempotency.
 */
export async function addCreditsFromStripe(params: {
  userId: ObjectId;
  credits: number;
  requestId: string;
  meta?: Record<string, unknown>;
}): Promise<{ balanceCredits: number }> {
  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  const result = await users.findOneAndUpdate(
    { _id: params.userId },
    {
      $inc: { walletBalanceCredits: params.credits },
      $set: { walletUpdatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new Error("User not found");
  }

  await writeWalletTransaction({
    userId: params.userId,
    type: "topup",
    credits: params.credits,
    requestId: params.requestId,
    meta: params.meta,
  });

  return {
    balanceCredits: typeof result.walletBalanceCredits === "number" ? result.walletBalanceCredits : 0,
  };
}

/**
 * Admin manual top-up. Increments walletBalanceCredits.
 */
export async function adminTopup(params: {
  userId: ObjectId;
  credits: number;
  reason: string;
}): Promise<{ balanceCredits: number }> {
  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  const result = await users.findOneAndUpdate(
    { _id: params.userId },
    {
      $inc: { walletBalanceCredits: params.credits },
      $set: { walletUpdatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new Error("User not found");
  }

  await writeWalletTransaction({
    userId: params.userId,
    type: "topup",
    credits: params.credits,
    meta: { reason: params.reason, adminTopup: true },
  });

  return {
    balanceCredits: typeof result.walletBalanceCredits === "number" ? result.walletBalanceCredits : 0,
  };
}

/**
 * Grant 500 free credits on signup (one-time). Atomic.
 * Only succeeds if walletGrantedFreeCredits is false.
 */
export async function grantFreeCreditsIfEligible(userId: ObjectId): Promise<{ granted: boolean; balanceCredits: number }> {
  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");

  const result = await users.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ walletGrantedFreeCredits: { $exists: false } }, { walletGrantedFreeCredits: false }],
    },
    {
      $inc: { walletBalanceCredits: FREE_CREDITS },
      $set: { walletGrantedFreeCredits: true, walletUpdatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    const { balanceCredits } = await getBalance(userId);
    return { granted: false, balanceCredits };
  }

  await writeWalletTransaction({
    userId,
    type: "grant",
    credits: FREE_CREDITS,
    meta: { reason: "New user signup bonus" },
  });

  return {
    granted: true,
    balanceCredits: typeof result.walletBalanceCredits === "number" ? result.walletBalanceCredits : 0,
  };
}

export function creditsFromTokens(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
}

/**
 * Migration: ensure wallet fields exist for all users.
 * Does NOT grant 500 retroactively.
 */
export async function runWalletMigration(): Promise<void> {
  await ensureWalletCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");
  const now = new Date();

  await users.updateMany(
    { walletBalanceCredits: { $exists: false } },
    { $set: { walletBalanceCredits: 0, walletUpdatedAt: now } }
  );

  await users.updateMany(
    { walletGrantedFreeCredits: { $exists: false } },
    { $set: { walletGrantedFreeCredits: true } }
  );
}
