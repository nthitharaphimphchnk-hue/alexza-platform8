/**
 * Wallet API - balance, transactions, admin topup.
 * GET /api/wallet/balance, GET /api/wallet/transactions, POST /api/wallet/topup/manual
 */

import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import {
  getBalance,
  adminTopup,
  TOKENS_PER_CREDIT,
  CREDIT_PRICE,
  FREE_CREDITS,
} from "./wallet";

interface WalletTransactionDoc {
  _id: ObjectId;
  userId: ObjectId;
  type: string;
  credits: number;
  requestId?: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

function adminAuth(req: Request): boolean {
  const key = process.env.ADMIN_API_KEY?.trim();
  if (!key) return false;
  const header = (req.headers["x-admin-key"] as string)?.trim();
  return !!header && header === key;
}

const router = Router();

router.get("/wallet/balance", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const { balanceCredits } = await getBalance(req.user._id);
    return res.json({
      ok: true,
      balanceCredits,
      tokensPerCredit: TOKENS_PER_CREDIT,
      creditPrice: CREDIT_PRICE,
      freeCredits: FREE_CREDITS,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/wallet/transactions", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const rawLimit = Number.parseInt(String(req.query.limit ?? "50"), 10);
    const limit = Number.isNaN(rawLimit) ? 50 : Math.max(1, Math.min(200, rawLimit));
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor.trim() : undefined;

    const db = await getDb();
    const col = db.collection<WalletTransactionDoc>("wallet_transactions");

    const filter: { userId: ObjectId; _id?: { $lt: ObjectId } } = { userId: req.user._id };
    if (cursor && ObjectId.isValid(cursor)) {
      filter._id = { $lt: new ObjectId(cursor) };
    }

    const rows = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id.toString() : null;

    return res.json({
      ok: true,
      transactions: items.map((r) => ({
        id: r._id.toString(),
        userId: r.userId.toString(),
        type: r.type,
        amountCredits: r.credits,
        reason: (r.meta as Record<string, unknown>)?.reason ?? "",
        relatedRunId: r.requestId ?? null,
        usageLogId: null,
        totalTokens: (r.meta as Record<string, unknown>)?.totalTokens ?? null,
        createdAt: r.createdAt,
      })),
      nextCursor,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/wallet/topup/manual", async (req, res, next) => {
  try {
    if (!adminAuth(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const body = req.body as { userId?: unknown; credits?: unknown; reason?: unknown };
    const rawUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const rawCredits = typeof body.credits === "number" ? body.credits : Number(body.credits);
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "Manual top-up";

    if (!ObjectId.isValid(rawUserId)) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "userId must be a valid ObjectId",
      });
    }

    const credits = Number.isFinite(rawCredits) ? Math.floor(rawCredits) : 0;
    if (credits <= 0 || credits > 1000000) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "credits must be a positive integer between 1 and 1000000",
      });
    }

    const userId = new ObjectId(rawUserId);
    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const { balanceCredits } = await adminTopup({ userId, credits, reason });

    return res.json({
      ok: true,
      balanceCredits,
      creditsAdded: credits,
      userId: userId.toString(),
    });
  } catch (error) {
    return next(error);
  }
});

export { router as walletRouter };
