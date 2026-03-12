/**
 * Monetization routes - purchases and creator earnings.
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";
import { getStripe } from "./modules/stripe/stripe.client";
import { normalizeEnvUrl } from "./utils/envUrls";
import type { CreatorDoc } from "./models/creator";
import type { MarketplaceTemplateDoc } from "./models/marketplaceTemplate";
import type { AgentMarketplaceDoc } from "./models/agentMarketplace";
import type { WorkflowMarketplaceDoc } from "./models/workflowMarketplace";
import type { AppDoc } from "./models/app";
import type { CreatorEarningDoc, MarketplacePurchaseDoc, MarketplaceItemType } from "./models/monetization";

const router = Router();

const APP_URL = normalizeEnvUrl(process.env.APP_URL || process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || process.env.APP_BASE_URL) || "";

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function getRevenueSplit() {
  const creatorShareEnv = Number(process.env.CREATOR_SHARE ?? "0.7");
  const creatorShare = clamp01(creatorShareEnv);
  const platformShare = clamp01(1 - creatorShare);
  return { creatorShare, platformShare };
}

function toCents(amountMajor: number): number {
  return Math.round(amountMajor * 100);
}

function fromCents(amountCents: number): number {
  return Math.round(amountCents) / 100;
}

let indexesReady: Promise<void> | null = null;
async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const purchases = db.collection<MarketplacePurchaseDoc>("marketplace_purchases");
      await purchases.createIndex({ stripeSessionId: 1 }, { unique: true });
      await purchases.createIndex({ buyerUserId: 1, createdAt: -1 });
      await purchases.createIndex({ creatorUserId: 1, createdAt: -1 });
      await purchases.createIndex({ itemType: 1, itemId: 1 });
      const earnings = db.collection<CreatorEarningDoc>("creator_earnings");
      await earnings.createIndex({ creatorUserId: 1, createdAt: -1 });
      await earnings.createIndex({ purchaseId: 1 }, { unique: true });
    })();
  }
  return indexesReady;
}

async function resolveItem(params: { itemType: MarketplaceItemType; id: ObjectId }) {
  const db = await getDb();
  if (params.itemType === "template") {
    const doc = await db.collection<MarketplaceTemplateDoc>("marketplace_templates").findOne({ _id: params.id, visibility: "public" as any });
    return doc ? { title: doc.name, authorUserId: doc.authorUserId, price: doc.price ?? 0, billingType: (doc.billingType ?? "one-time") as any, currency: (doc.currency ?? "usd") as string } : null;
  }
  if (params.itemType === "agent") {
    const doc = await db.collection<AgentMarketplaceDoc>("agent_marketplace").findOne({ _id: params.id, visibility: "public" as any });
    return doc ? { title: doc.name, authorUserId: doc.authorUserId, price: doc.price ?? 0, billingType: (doc.billingType ?? "one-time") as any, currency: (doc.currency ?? "usd") as string } : null;
  }
  if (params.itemType === "workflow") {
    const doc = await db.collection<WorkflowMarketplaceDoc>("workflow_marketplace").findOne({ _id: params.id, visibility: "public" as any });
    return doc ? { title: doc.name, authorUserId: doc.authorUserId, price: doc.price ?? 0, billingType: (doc.billingType ?? "one-time") as any, currency: (doc.currency ?? "usd") as string } : null;
  }
  if (params.itemType === "app") {
    const doc = await db.collection<AppDoc>("apps").findOne({ _id: params.id, visibility: "public" as any });
    return doc ? { title: doc.name, authorUserId: doc.authorUserId, price: doc.price ?? 0, billingType: (doc.billingType ?? "one-time") as any, currency: (doc.currency ?? "usd") as string } : null;
  }
  return null;
}

async function getCreatorByUserId(userId: ObjectId): Promise<CreatorDoc | null> {
  const db = await getDb();
  return db.collection<CreatorDoc>("creators").findOne({ userId });
}

async function ensureConnectAccount(creator: CreatorDoc): Promise<string | null> {
  const existing = creator.stripeConnectAccountId?.trim();
  if (existing) return existing;
  return null;
}

async function createMarketplaceCheckout(params: {
  buyerUserId: ObjectId;
  itemType: MarketplaceItemType;
  itemId: ObjectId;
}) {
  await ensureIndexes();
  const db = await getDb();

  const item = await resolveItem({ itemType: params.itemType, id: params.itemId });
  if (!item) {
    return { ok: false as const, status: 404, error: "NOT_FOUND", message: "Item not found" };
  }
  if (!item.price || item.price <= 0) {
    return { ok: false as const, status: 400, error: "VALIDATION_ERROR", message: "Item is free; no purchase required" };
  }
  if (!APP_URL) {
    return { ok: false as const, status: 503, error: "CONFIG_ERROR", message: "APP_URL/CLIENT_URL not configured" };
  }

  const creator = await getCreatorByUserId(item.authorUserId);
  if (!creator) {
    return { ok: false as const, status: 409, error: "CREATOR_PROFILE_REQUIRED", message: "Creator must have a profile to monetize" };
  }
  const connectAccountId = await ensureConnectAccount(creator);
  if (!connectAccountId) {
    return { ok: false as const, status: 409, error: "CONNECT_NOT_CONFIGURED", message: "Creator Stripe Connect is not configured" };
  }

  const { creatorShare, platformShare } = getRevenueSplit();
  const currency = item.currency || "usd";
  const priceCents = toCents(item.price);
  const platformFeeCents = Math.round(priceCents * platformShare);
  const payoutCents = priceCents - platformFeeCents;

  const stripe = getStripe();
  const now = new Date();

  // Create checkout session first, then record purchase (session id unique)
  const session =
    item.billingType === "monthly"
      ? await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [
            {
              price_data: {
                currency,
                unit_amount: priceCents,
                recurring: { interval: "month" },
                product_data: { name: item.title, description: `Monthly subscription` },
              },
              quantity: 1,
            },
          ],
          success_url: `${APP_URL}/app/marketplace?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${APP_URL}/app/marketplace?status=cancel`,
          subscription_data: {
            application_fee_percent: Math.round(platformShare * 100),
            transfer_data: { destination: connectAccountId },
          },
          metadata: {
            kind: "marketplace_purchase",
            itemType: params.itemType,
            itemId: params.itemId.toString(),
            buyerUserId: params.buyerUserId.toString(),
            creatorUserId: item.authorUserId.toString(),
          },
        })
      : await stripe.checkout.sessions.create({
          mode: "payment",
          currency,
          line_items: [
            {
              price_data: {
                currency,
                unit_amount: priceCents,
                product_data: { name: item.title, description: `One-time purchase` },
              },
              quantity: 1,
            },
          ],
          success_url: `${APP_URL}/app/marketplace?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${APP_URL}/app/marketplace?status=cancel`,
          payment_intent_data: {
            application_fee_amount: platformFeeCents,
            transfer_data: { destination: connectAccountId },
          },
          metadata: {
            kind: "marketplace_purchase",
            itemType: params.itemType,
            itemId: params.itemId.toString(),
            buyerUserId: params.buyerUserId.toString(),
            creatorUserId: item.authorUserId.toString(),
          },
        });

  const purchaseDoc: Omit<MarketplacePurchaseDoc, "_id"> = {
    buyerUserId: params.buyerUserId,
    creatorId: creator._id,
    creatorUserId: creator.userId,
    itemType: params.itemType,
    itemId: params.itemId,
    price: fromCents(priceCents),
    currency,
    billingType: item.billingType,
    creatorShare,
    platformShare,
    revenue: fromCents(priceCents),
    platformFee: fromCents(platformFeeCents),
    payoutAmount: fromCents(payoutCents),
    stripeSessionId: session.id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<MarketplacePurchaseDoc>("marketplace_purchases").insertOne(purchaseDoc as MarketplacePurchaseDoc);

  logger.info(
    { sessionId: session.id, itemType: params.itemType, itemId: params.itemId.toString(), buyerUserId: params.buyerUserId.toString() },
    "[Monetization] checkout created"
  );

  return { ok: true as const, url: session.url ?? null, sessionId: session.id };
}

// Purchase endpoints (template marketplace required by spec)
router.post("/marketplace/:id/purchase", requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  const id = parseObjectId(req.params.id ?? "");
  if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const result = await createMarketplaceCheckout({ buyerUserId: req.user._id, itemType: "template", itemId: id });
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error, message: result.message });
  return res.json({ ok: true, url: result.url, sessionId: result.sessionId });
});

router.post("/agent-marketplace/:id/purchase", requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  const id = parseObjectId(req.params.id ?? "");
  if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const result = await createMarketplaceCheckout({ buyerUserId: req.user._id, itemType: "agent", itemId: id });
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error, message: result.message });
  return res.json({ ok: true, url: result.url, sessionId: result.sessionId });
});

router.post("/workflow-marketplace/:id/purchase", requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  const id = parseObjectId(req.params.id ?? "");
  if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const result = await createMarketplaceCheckout({ buyerUserId: req.user._id, itemType: "workflow", itemId: id });
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error, message: result.message });
  return res.json({ ok: true, url: result.url, sessionId: result.sessionId });
});

router.post("/apps/:id/purchase", requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  const id = parseObjectId(req.params.id ?? "");
  if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const result = await createMarketplaceCheckout({ buyerUserId: req.user._id, itemType: "app", itemId: id });
  if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error, message: result.message });
  return res.json({ ok: true, url: result.url, sessionId: result.sessionId });
});

// GET /api/creator/earnings - creator earnings dashboard
router.get("/creator/earnings", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    const db = await getDb();
    const creator = await db.collection<CreatorDoc>("creators").findOne({ userId: req.user._id });
    if (!creator) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Creator profile not found" });

    const earningsCol = db.collection<CreatorEarningDoc>("creator_earnings");
    const purchasesCol = db.collection<MarketplacePurchaseDoc>("marketplace_purchases");

    const [recent, totalsAgg, topAgg] = await Promise.all([
      purchasesCol
        .find({ creatorUserId: req.user._id, status: "paid" })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      earningsCol
        .aggregate<{ revenue: number; payoutAmount: number; platformFee: number }>([
          { $match: { creatorUserId: req.user._id } },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$revenue" },
              payoutAmount: { $sum: "$payoutAmount" },
              platformFee: { $sum: "$platformFee" },
            },
          },
        ])
        .toArray(),
      purchasesCol
        .aggregate<{ itemType: string; itemId: ObjectId; sales: number; revenue: number }>([
          { $match: { creatorUserId: req.user._id, status: "paid" } },
          { $group: { _id: { itemType: "$itemType", itemId: "$itemId" }, sales: { $sum: 1 }, revenue: { $sum: "$revenue" } } },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
    ]);

    const totals = totalsAgg[0] ?? { revenue: 0, payoutAmount: 0, platformFee: 0 };
    const top = topAgg.map((t) => ({ itemType: t._id.itemType, itemId: t._id.itemId.toString(), sales: t.sales, revenue: t.revenue }));

    return res.json({
      ok: true,
      totals,
      recentSales: recent.map((p) => ({
        id: (p as MarketplacePurchaseDoc & { _id: ObjectId })._id.toString(),
        itemType: p.itemType,
        itemId: p.itemId.toString(),
        revenue: p.revenue,
        platformFee: p.platformFee,
        payoutAmount: p.payoutAmount,
        currency: p.currency,
        createdAt: p.createdAt,
      })),
      topSelling: top,
    });
  } catch (error) {
    logger.error({ err: error }, "[Monetization] earnings error");
    return next(error);
  }
});

export { router as monetizationRouter };

