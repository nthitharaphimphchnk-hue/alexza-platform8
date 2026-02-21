import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

export const FREE_TRIAL_CREDITS = 1000;
export const TOKENS_PER_CREDIT = 1000;
export const RUN_COST_CREDITS = 1;

export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export type CreditTransactionType =
  | "bonus"
  | "topup"
  | "usage"
  | "refund"
  | "monthly_reset_bonus";

interface UserWalletDoc {
  walletBalanceCredits?: number;
  monthlyCreditsAllowance?: number;
  monthlyCreditsUsed?: number;
}

export class MonthlyQuotaExceededError extends Error {
  allowance: number;
  used: number;
  needed: number;

  constructor(message: string, allowance: number, used: number, needed: number) {
    super(message);
    this.name = "MonthlyQuotaExceededError";
    this.allowance = allowance;
    this.used = used;
    this.needed = needed;
  }
}

interface CreditTransactionDoc {
  userId: ObjectId;
  type: CreditTransactionType;
  amountCredits: number;
  reason: string;
  relatedRunId?: string;
  usageLogId?: ObjectId;
  provider?: string;
  model?: string;
  totalTokens?: number | null;
  createdAt: Date;
}

interface CreateCreditTransactionParams {
  userId: ObjectId;
  type: CreditTransactionType;
  amountCredits: number;
  reason: string;
  relatedRunId?: string;
  usageLogId?: ObjectId;
  provider?: string;
  model?: string;
  totalTokens?: number | null;
  createdAt?: Date;
}

const router = Router();
let creditsCollectionsReady: Promise<void> | null = null;

async function ensureCreditsCollections() {
  if (!creditsCollectionsReady) {
    creditsCollectionsReady = (async () => {
      const db = await getDb();
      const users = db.collection<UserWalletDoc>("users");
      const transactions = db.collection<CreditTransactionDoc>("credit_transactions");

      await users.createIndex({ walletBalanceCredits: 1 });
      await transactions.createIndex({ userId: 1, createdAt: -1 });
      await transactions.createIndex({ type: 1, createdAt: -1 });
      await transactions.createIndex({ relatedRunId: 1 });
      await transactions.createIndex({ usageLogId: 1 });
    })();
  }
  return creditsCollectionsReady;
}

export async function createCreditTransaction(params: CreateCreditTransactionParams) {
  await ensureCreditsCollections();
  const db = await getDb();
  const transactions = db.collection<CreditTransactionDoc>("credit_transactions");
  const createdAt = params.createdAt ?? new Date();
  const result = await transactions.insertOne({
    userId: params.userId,
    type: params.type,
    amountCredits: params.amountCredits,
    reason: params.reason,
    relatedRunId: params.relatedRunId,
    usageLogId: params.usageLogId,
    provider: params.provider,
    model: params.model,
    totalTokens: params.totalTokens ?? null,
    createdAt,
  });
  return {
    id: result.insertedId,
    createdAt,
  };
}

export async function getWalletBalanceCredits(userId: ObjectId): Promise<number> {
  await ensureCreditsCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");
  const user = await users.findOne({ _id: userId });
  return typeof user?.walletBalanceCredits === "number" ? user.walletBalanceCredits : 0;
}

export async function deductCreditsForUsage(params: {
  userId: ObjectId;
  costCredits: number;
  reason: string;
  relatedRunId?: string;
  usageLogId?: ObjectId;
  provider?: string;
  model?: string;
  totalTokens?: number | null;
}): Promise<{ balanceCredits: number }> {
  await ensureCreditsCollections();
  const db = await getDb();
  const users = db.collection<UserWalletDoc>("users");
  const next = await users.findOneAndUpdate(
    {
      _id: params.userId,
      walletBalanceCredits: { $gte: params.costCredits },
      $expr: {
        $lte: [
          { $add: [{ $ifNull: ["$monthlyCreditsUsed", 0] }, params.costCredits] },
          { $ifNull: ["$monthlyCreditsAllowance", 0] },
        ],
      },
    },
    {
      $inc: {
        walletBalanceCredits: -params.costCredits,
        monthlyCreditsUsed: params.costCredits,
      },
    },
    { returnDocument: "after" }
  );

  if (!next) {
    const snapshot = await users.findOne({ _id: params.userId });
    if (!snapshot) {
      throw new InsufficientCreditsError("Insufficient credits");
    }
    const allowance =
      typeof snapshot.monthlyCreditsAllowance === "number" ? snapshot.monthlyCreditsAllowance : 0;
    const used = typeof snapshot.monthlyCreditsUsed === "number" ? snapshot.monthlyCreditsUsed : 0;
    if (used + params.costCredits > allowance) {
      throw new MonthlyQuotaExceededError("Monthly quota exceeded.", allowance, used, params.costCredits);
    }
    throw new InsufficientCreditsError("Insufficient credits");
  }

  await createCreditTransaction({
    userId: params.userId,
    type: "usage",
    amountCredits: -params.costCredits,
    reason: params.reason,
    relatedRunId: params.relatedRunId,
    usageLogId: params.usageLogId,
    provider: params.provider,
    model: params.model,
    totalTokens: params.totalTokens ?? null,
  });

  return {
    balanceCredits: typeof next.walletBalanceCredits === "number" ? next.walletBalanceCredits : 0,
  };
}

function canUseManualTopup(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  if (!configuredAdminKey || configuredAdminKey.trim().length === 0) {
    return false;
  }
  const rawHeader = req.headers["x-admin-key"];
  const providedAdminKey = typeof rawHeader === "string" ? rawHeader.trim() : "";
  return providedAdminKey.length > 0 && providedAdminKey === configuredAdminKey;
}

router.get("/credits/balance", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const balanceCredits = await getWalletBalanceCredits(req.user._id);
    return res.json({ ok: true, balanceCredits });
  } catch (error) {
    return next(error);
  }
});

router.get("/credits/transactions", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const rawLimit = Number.parseInt(String(req.query.limit ?? "50"), 10);
    const limit = Number.isNaN(rawLimit) ? 50 : Math.max(1, Math.min(200, rawLimit));

    await ensureCreditsCollections();
    const db = await getDb();
    const transactions = db.collection<CreditTransactionDoc>("credit_transactions");
    const rows = await transactions
      .find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return res.json({
      ok: true,
      transactions: rows.map((row) => ({
        id: row._id.toString(),
        userId: row.userId.toString(),
        type: row.type,
        amountCredits: row.amountCredits,
        reason: row.reason,
        relatedRunId: row.relatedRunId ?? null,
        usageLogId: row.usageLogId?.toString() ?? null,
        totalTokens: typeof row.totalTokens === "number" ? row.totalTokens : null,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/credits/topup", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    if (!canUseManualTopup(req)) {
      return res.status(403).json({
        ok: false,
        error: "FORBIDDEN",
        message: "Manual top-up is not allowed in this environment",
      });
    }

    const amountCreditsRaw = (req.body as { amountCredits?: unknown })?.amountCredits;
    const reasonRaw = (req.body as { reason?: unknown })?.reason;
    const amountCredits = Number.parseInt(String(amountCreditsRaw), 10);
    const reason =
      typeof reasonRaw === "string" && reasonRaw.trim().length > 0
        ? reasonRaw.trim().slice(0, 200)
        : "Manual top-up";

    if (!Number.isFinite(amountCredits) || amountCredits <= 0) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "amountCredits must be a positive integer",
      });
    }
    if (amountCredits > 100000) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "amountCredits must be less than or equal to 100000",
      });
    }

    await ensureCreditsCollections();
    const db = await getDb();
    const users = db.collection<UserWalletDoc>("users");

    const updatedUser = await users.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { walletBalanceCredits: amountCredits } },
      { returnDocument: "after" }
    );
    if (!updatedUser) {
      return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    }

    try {
      const transaction = await createCreditTransaction({
        userId: req.user._id,
        type: "topup",
        amountCredits,
        reason,
      });
      return res.json({
        ok: true,
        balanceCredits: typeof updatedUser.walletBalanceCredits === "number" ? updatedUser.walletBalanceCredits : 0,
        transaction: {
          id: transaction.id.toString(),
          userId: req.user._id.toString(),
          type: "topup" as const,
          amountCredits,
          reason,
          relatedRunId: null,
          usageLogId: null,
          provider: null,
          model: null,
          totalTokens: null,
          createdAt: transaction.createdAt,
        },
      });
    } catch (transactionError) {
      await users.updateOne({ _id: req.user._id }, { $inc: { walletBalanceCredits: -amountCredits } });
      throw transactionError;
    }
  } catch (error) {
    return next(error);
  }
});

export { router as creditsRouter };
