/**
 * Community Hub - discovery APIs (trending, popular, top creators, new packs).
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { logger } from "./utils/logger";
import type { AgentMarketplaceDoc } from "./models/agentMarketplace";
import type { WorkflowMarketplaceDoc } from "./models/workflowMarketplace";
import type { MarketplaceTemplateDoc } from "./models/marketplaceTemplate";
import type { AppDoc } from "./models/app";
import type { TemplatePackDoc } from "./models/templatePack";
import type { CreatorDoc } from "./models/creator";
import type { CreatorEarningDoc } from "./models/monetization";
import type { CommunityFeedDoc } from "./models/community";

const router = Router();

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const feed = db.collection<CommunityFeedDoc>("community_feed");
      await feed.createIndex({ type: 1, itemId: 1 }, { unique: true });
      await feed.createIndex({ type: 1, score: -1, createdAt: -1 });
    })();
  }
  return indexesReady;
}

function toAgentItem(doc: AgentMarketplaceDoc & { authorUsername?: string }) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    tags: doc.tags ?? [],
    downloads: doc.downloads ?? 0,
    rating: doc.rating ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    authorUserId: doc.authorUserId.toString(),
    authorUsername: doc.authorUsername,
  };
}

function toWorkflowItem(doc: WorkflowMarketplaceDoc & { authorUsername?: string }) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    tags: doc.tags ?? [],
    downloads: doc.downloads ?? 0,
    rating: doc.rating ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    authorUserId: doc.authorUserId.toString(),
    authorUsername: doc.authorUsername,
  };
}

// GET /api/community/trending-agents
router.get("/community/trending-agents", async (_req, res, next) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const col = db.collection<AgentMarketplaceDoc>("agent_marketplace");

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const rows = await col
      .aggregate<
        AgentMarketplaceDoc & {
          score: number;
        }
      >([
        { $match: { visibility: "public" } },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: [{ $ifNull: ["$downloads", 0] }, 1] },
                { $multiply: [{ $ifNull: ["$rating", 0] }, 20] },
                {
                  $cond: [
                    { $gte: ["$createdAt", sevenDaysAgo] },
                    50,
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $limit: 12 },
      ])
      .toArray();

    return res.json({
      ok: true,
      agents: rows.map((r) => toAgentItem(r)),
    });
  } catch (error) {
    logger.error({ err: error }, "[Community] trending-agents error");
    return next(error);
  }
});

// GET /api/community/popular-workflows
router.get("/community/popular-workflows", async (_req, res, next) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const col = db.collection<WorkflowMarketplaceDoc>("workflow_marketplace");

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const rows = await col
      .aggregate<
        WorkflowMarketplaceDoc & {
          score: number;
        }
      >([
        { $match: { visibility: "public" } },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: [{ $ifNull: ["$downloads", 0] }, 1] },
                { $multiply: [{ $ifNull: ["$rating", 0] }, 20] },
                {
                  $cond: [
                    { $gte: ["$createdAt", sevenDaysAgo] },
                    50,
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $limit: 12 },
      ])
      .toArray();

    return res.json({
      ok: true,
      workflows: rows.map((r) => toWorkflowItem(r)),
    });
  } catch (error) {
    logger.error({ err: error }, "[Community] popular-workflows error");
    return next(error);
  }
});

// GET /api/community/top-creators
router.get("/community/top-creators", async (_req, res, next) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const creatorsCol = db.collection<CreatorDoc>("creators");
    const earningsCol = db.collection<CreatorEarningDoc>("creator_earnings");

    const agg = await earningsCol
      .aggregate<{
        _id: { creatorUserId: ObjectId; creatorId: ObjectId };
        revenue: number;
        payoutAmount: number;
      }>([
        {
          $group: {
            _id: { creatorUserId: "$creatorUserId", creatorId: "$creatorId" },
            revenue: { $sum: "$revenue" },
            payoutAmount: { $sum: "$payoutAmount" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 12 },
      ])
      .toArray();

    if (agg.length === 0) {
      return res.json({ ok: true, creators: [] });
    }

    const creatorIds = agg.map((a) => a._id.creatorId);
    const creators = await creatorsCol
      .find({ _id: { $in: creatorIds } })
      .toArray();
    const creatorsById = new Map(creators.map((c) => [c._id.toString(), c]));

    const result = agg
      .map((row) => {
        const c = creatorsById.get(row._id.creatorId.toString());
        if (!c) return null;
        return {
          id: c._id.toString(),
          username: c.username,
          displayName: c.displayName,
          avatar: c.avatar,
          bio: c.bio,
          revenue: row.revenue,
          payoutAmount: row.payoutAmount,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return res.json({ ok: true, creators: result });
  } catch (error) {
    logger.error({ err: error }, "[Community] top-creators error");
    return next(error);
  }
});

// GET /api/community/new-packs
router.get("/community/new-packs", async (_req, res, next) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const col = db.collection<TemplatePackDoc>("template_packs");
    const rows = await col.find({}).sort({ createdAt: -1 }).limit(12).toArray();
    const packs = rows.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      templateCount: doc.templateIds?.length ?? 0,
      tags: doc.tags ?? [],
      createdAt: doc.createdAt,
    }));
    return res.json({ ok: true, packs });
  } catch (error) {
    logger.error({ err: error }, "[Community] new-packs error");
    return next(error);
  }
});

// GET /api/community/featured-apps
router.get("/community/featured-apps", async (_req, res, next) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const col = db.collection<AppDoc>("apps");
    const rows = await col
      .find({ visibility: "public" })
      .sort({ downloads: -1, rating: -1, createdAt: -1 })
      .limit(12)
      .toArray();
    const apps = rows.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      downloads: doc.downloads ?? 0,
      rating: doc.rating ?? 0,
      ratingCount: doc.ratingCount ?? 0,
      category: doc.category,
      tags: doc.tags ?? [],
    }));
    return res.json({ ok: true, apps });
  } catch (error) {
    logger.error({ err: error }, "[Community] featured-apps error");
    return next(error);
  }
});

export { router as communityRouter };

