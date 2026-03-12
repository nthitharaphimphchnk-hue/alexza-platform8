/**
 * Creator Profiles - public profiles, stats, follow system
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth, optionalAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";
import type { CreatorDoc } from "./models/creator";
import { USERNAME_REGEX } from "./models/creator";
import { getStripe } from "./modules/stripe/stripe.client";
import { normalizeEnvUrl } from "./utils/envUrls";
import type { AgentMarketplaceDoc } from "./models/agentMarketplace";
import type { WorkflowMarketplaceDoc } from "./models/workflowMarketplace";
import type { MarketplaceTemplateDoc } from "./models/marketplaceTemplate";
import type { AppDoc } from "./models/app";

const router = Router();
const APP_URL = normalizeEnvUrl(process.env.APP_URL || process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || process.env.APP_BASE_URL) || "";

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function slugifyUsername(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 32);
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const creators = db.collection<CreatorDoc>("creators");
      await creators.createIndex({ username: 1 }, { unique: true });
      await creators.createIndex({ userId: 1 }, { unique: true });
      await creators.createIndex({ displayName: "text", bio: "text" });
      const follows = db.collection("creator_follows");
      await follows.createIndex({ creatorUserId: 1, followerUserId: 1 }, { unique: true });
      await follows.createIndex({ followerUserId: 1 });
    })();
  }
  return indexesReady;
}

export interface CreatorStats {
  totalAgents: number;
  totalWorkflows: number;
  totalTemplates: number;
  totalApps: number;
  downloads: number;
  rating: number; // weighted average 0-5
  ratingCount: number;
}

// POST /api/creators/me/connect/onboard - create/connect Stripe account + onboarding link
router.post("/creators/me/connect/onboard", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    if (!APP_URL) {
      return res.status(503).json({ ok: false, error: "CONFIG_ERROR", message: "APP_URL/CLIENT_URL not configured" });
    }

    const db = await getDb();
    const col = db.collection<CreatorDoc>("creators");
    const creator = await col.findOne({ userId: req.user._id });
    if (!creator) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Creator profile not found" });

    const stripe = getStripe();
    let accountId = creator.stripeConnectAccountId?.trim() || "";
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: { transfers: { requested: true } },
        metadata: { creatorUserId: req.user._id.toString() },
      });
      accountId = account.id;
      await col.updateOne({ _id: creator._id }, { $set: { stripeConnectAccountId: accountId, updatedAt: new Date() } });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${APP_URL}/app/creator/earnings?connect=refresh`,
      return_url: `${APP_URL}/app/creator/earnings?connect=return`,
    });

    return res.json({ ok: true, url: link.url, accountId });
  } catch (error) {
    logger.error({ err: error }, "[Creators] connect onboard error");
    return next(error);
  }
});

async function getCreatorStats(userId: ObjectId): Promise<CreatorStats> {
  const db = await getDb();

  const [agents, workflows, templates, apps] = await Promise.all([
    db
      .collection<AgentMarketplaceDoc>("agent_marketplace")
      .find({ authorUserId: userId, visibility: "public" })
      .toArray(),
    db
      .collection<WorkflowMarketplaceDoc>("workflow_marketplace")
      .find({ authorUserId: userId, visibility: "public" })
      .toArray(),
    db
      .collection<MarketplaceTemplateDoc>("marketplace_templates")
      .find({ authorUserId: userId, visibility: "public" })
      .toArray(),
    db
      .collection<AppDoc>("apps")
      .find({ authorUserId: userId, visibility: "public" })
      .toArray(),
  ]);

  const allItems = [
    ...agents.map((a) => ({ d: a.downloads ?? 0, r: a.rating ?? 0, rc: a.ratingCount ?? 0 })),
    ...workflows.map((w) => ({ d: w.downloads ?? 0, r: w.rating ?? 0, rc: w.ratingCount ?? 0 })),
    ...templates.map((t) => ({ d: t.downloads ?? 0, r: t.rating ?? 0, rc: t.ratingCount ?? 0 })),
    ...apps.map((a) => ({ d: a.downloads ?? 0, r: a.rating ?? 0, rc: a.ratingCount ?? 0 })),
  ];

  const downloads = allItems.reduce((s, x) => s + x.d, 0);
  const ratingCount = allItems.reduce((s, x) => s + x.rc, 0);
  const weightedSum = allItems.reduce((s, x) => s + x.r * x.rc, 0);
  const rating = ratingCount > 0 ? Math.round((weightedSum / ratingCount) * 10) / 10 : 0;

  return {
    totalAgents: agents.length,
    totalWorkflows: workflows.length,
    totalTemplates: templates.length,
    totalApps: apps.length,
    downloads,
    rating,
    ratingCount,
  };
}

function toPublicCreator(doc: CreatorDoc, stats?: CreatorStats, followers?: number, isFollowing?: boolean) {
  return {
    id: doc._id.toString(),
    username: doc.username,
    displayName: doc.displayName,
    bio: doc.bio,
    avatar: doc.avatar || undefined,
    userId: doc.userId.toString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(stats && {
      totalAgents: stats.totalAgents,
      totalWorkflows: stats.totalWorkflows,
      totalTemplates: stats.totalTemplates,
      totalApps: stats.totalApps,
      downloads: stats.downloads,
      rating: stats.rating,
      ratingCount: stats.ratingCount,
    }),
    ...(typeof followers === "number" && { followers }),
    ...(typeof isFollowing === "boolean" && { isFollowing }),
  };
}

// PUT /api/creators/me - create or update my creator profile
router.put("/creators/me", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const body = req.body as { username?: string; displayName?: string; bio?: string; avatar?: string };
    let username = typeof body.username === "string" ? slugifyUsername(body.username) : "";
    if (!username) {
      const fallback = req.user.email?.split("@")[0] || "user";
      username = slugifyUsername(fallback) || "user";
    }
    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Username must be 2–32 characters: lowercase letters, numbers, underscore only",
      });
    }

    const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 500) : "";
    const avatar = typeof body.avatar === "string" ? body.avatar.trim().slice(0, 500) : "";

    const db = await getDb();
    const col = db.collection<CreatorDoc>("creators");
    const existing = await col.findOne({ userId: req.user._id });
    const now = new Date();

    if (existing) {
      const conflict = username !== existing.username && (await col.findOne({ username }));
      if (conflict) {
        return res.status(409).json({ ok: false, error: "CONFLICT", message: "Username already taken" });
      }
      await col.updateOne(
        { userId: req.user._id },
        {
          $set: {
            username,
            displayName: displayName || existing.displayName,
            bio: bio !== undefined ? bio : existing.bio,
            avatar: avatar !== undefined ? avatar : existing.avatar,
            updatedAt: now,
          },
        }
      );
      const updated = await col.findOne({ userId: req.user._id });
      const stats = await getCreatorStats(req.user._id);
      return res.json({ ok: true, creator: toPublicCreator(updated!, stats) });
    }

    const taken = await col.findOne({ username });
    if (taken) {
      return res.status(409).json({ ok: false, error: "CONFLICT", message: "Username already taken" });
    }

    const usersCol = db.collection<{ _id: ObjectId; name?: string; email: string }>("users");
    const user = await usersCol.findOne({ _id: req.user._id });
    const defaultDisplayName = user?.name?.trim() || user?.email?.split("@")[0] || "Creator";

    const doc: Omit<CreatorDoc, "_id"> = {
      username,
      displayName: displayName || defaultDisplayName,
      bio,
      avatar,
      userId: req.user._id,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc as CreatorDoc);
    const stats = await getCreatorStats(req.user._id);
    logger.info({ creatorId: result.insertedId.toString(), userId: req.user._id.toString() }, "[Creators] profile created");
    return res.status(201).json({
      ok: true,
      creator: toPublicCreator({ _id: result.insertedId, ...doc } as CreatorDoc, stats),
    });
  } catch (error) {
    logger.error({ err: error }, "[Creators] me put error");
    return next(error);
  }
});

// GET /api/creators/me - get my creator profile (if any)
router.get("/creators/me", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const db = await getDb();
    const creator = await db.collection<CreatorDoc>("creators").findOne({ userId: req.user._id });
    if (!creator) return res.json({ ok: true, creator: null });

    const stats = await getCreatorStats(req.user._id);
    const followsCol = db.collection("creator_follows");
    const followers = await followsCol.countDocuments({ creatorUserId: req.user._id });
    return res.json({ ok: true, creator: toPublicCreator(creator, stats, followers) });
  } catch (error) {
    logger.error({ err: error }, "[Creators] me get error");
    return next(error);
  }
});

// GET /api/creators - list creators (with optional search)
router.get("/creators", async (req, res, next) => {
  try {
    await ensureIndexes();
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const limit = Math.min(parseInt(String(req.query.limit || "24"), 10) || 24, 50);

    const db = await getDb();
    const col = db.collection<CreatorDoc>("creators");

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
      ];
    }

    const creators = await col.find(filter).sort({ updatedAt: -1 }).limit(limit).toArray();

    const followsCol = db.collection("creator_follows");
    const withStats = await Promise.all(
      creators.map(async (c) => {
        const [stats, followers] = await Promise.all([
          getCreatorStats(c.userId),
          followsCol.countDocuments({ creatorUserId: c.userId }),
        ]);
        const hasContent =
          stats.totalAgents > 0 ||
          stats.totalWorkflows > 0 ||
          stats.totalTemplates > 0 ||
          stats.totalApps > 0;
        return { ...toPublicCreator(c, stats, followers), hasContent };
      })
    );

    // Optionally filter to only creators with at least one public item
    const list = withStats.filter((c) => c.hasContent);
    return res.json({ ok: true, creators: list });
  } catch (error) {
    logger.error({ err: error }, "[Creators] list error");
    return next(error);
  }
});

// GET /api/creators/:username - get creator profile with content
router.get("/creators/:username", optionalAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    const username = typeof req.params.username === "string" ? req.params.username.trim().toLowerCase() : "";
    if (!username) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const creator = await db.collection<CreatorDoc>("creators").findOne({ username });
    if (!creator) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const userId = creator.userId;
    const [stats, followers, isFollowing, agents, workflows, templates, apps] = await Promise.all([
      getCreatorStats(userId),
      db.collection("creator_follows").countDocuments({ creatorUserId: userId }),
      req.user
        ? db.collection("creator_follows").countDocuments({ creatorUserId: userId, followerUserId: req.user._id }).then((n) => n > 0)
        : false,
      db
        .collection<AgentMarketplaceDoc>("agent_marketplace")
        .find({ authorUserId: userId, visibility: "public" })
        .sort({ downloads: -1, rating: -1 })
        .limit(20)
        .toArray(),
      db
        .collection<WorkflowMarketplaceDoc>("workflow_marketplace")
        .find({ authorUserId: userId, visibility: "public" })
        .sort({ downloads: -1, rating: -1 })
        .limit(20)
        .toArray(),
      db
        .collection<MarketplaceTemplateDoc>("marketplace_templates")
        .find({ authorUserId: userId, visibility: "public" })
        .sort({ downloads: -1, rating: -1 })
        .limit(20)
        .toArray(),
      db
        .collection<AppDoc>("apps")
        .find({ authorUserId: userId, visibility: "public" })
        .sort({ downloads: -1, rating: -1 })
        .limit(20)
        .toArray(),
    ]);

    const toAgentItem = (a: AgentMarketplaceDoc) => ({
      id: a._id.toString(),
      name: a.name,
      description: a.description,
      category: a.category,
      tags: a.tags ?? [],
      downloads: a.downloads ?? 0,
      rating: a.rating ?? 0,
      ratingCount: a.ratingCount ?? 0,
    });
    const toWorkflowItem = (w: WorkflowMarketplaceDoc) => ({
      id: w._id.toString(),
      name: w.name,
      description: w.description,
      category: w.category,
      tags: w.tags ?? [],
      downloads: w.downloads ?? 0,
      rating: w.rating ?? 0,
      ratingCount: w.ratingCount ?? 0,
    });
    const toTemplateItem = (t: MarketplaceTemplateDoc) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags ?? [],
      downloads: t.downloads ?? 0,
      rating: t.rating ?? 0,
      ratingCount: t.ratingCount ?? 0,
    });
    const toAppItem = (a: AppDoc) => ({
      id: a._id.toString(),
      name: a.name,
      description: a.description,
      category: a.category,
      tags: a.tags ?? [],
      downloads: a.downloads ?? 0,
      rating: a.rating ?? 0,
      ratingCount: a.ratingCount ?? 0,
    });

    return res.json({
      ok: true,
      creator: toPublicCreator(creator, stats, followers, isFollowing),
      agents: agents.map(toAgentItem),
      workflows: workflows.map(toWorkflowItem),
      templates: templates.map(toTemplateItem),
      apps: apps.map(toAppItem),
    });
  } catch (error) {
    logger.error({ err: error }, "[Creators] get by username error");
    return next(error);
  }
});

// POST /api/creators/:username/follow
router.post("/creators/:username/follow", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const username = typeof req.params.username === "string" ? req.params.username.trim().toLowerCase() : "";
    if (!username) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const creator = await db.collection<CreatorDoc>("creators").findOne({ username });
    if (!creator) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    if (creator.userId.equals(req.user._id)) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "Cannot follow yourself" });
    }

    const followsCol = db.collection("creator_follows");
    await followsCol.updateOne(
      { creatorUserId: creator.userId, followerUserId: req.user._id },
      { $setOnInsert: { creatorUserId: creator.userId, followerUserId: req.user._id, createdAt: new Date() } },
      { upsert: true }
    );

    const followers = await followsCol.countDocuments({ creatorUserId: creator.userId });
    return res.json({ ok: true, following: true, followers });
  } catch (error) {
    logger.error({ err: error }, "[Creators] follow error");
    return next(error);
  }
});

// DELETE /api/creators/:username/follow
router.delete("/creators/:username/follow", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const username = typeof req.params.username === "string" ? req.params.username.trim().toLowerCase() : "";
    if (!username) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const creator = await db.collection<CreatorDoc>("creators").findOne({ username });
    if (!creator) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const followsCol = db.collection("creator_follows");
    await followsCol.deleteOne({ creatorUserId: creator.userId, followerUserId: req.user._id });

    const followers = await followsCol.countDocuments({ creatorUserId: creator.userId });
    return res.json({ ok: true, following: false, followers });
  } catch (error) {
    logger.error({ err: error }, "[Creators] unfollow error");
    return next(error);
  }
});

export { router as creatorsRouter };
