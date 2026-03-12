/**
 * Agent Marketplace - publish, browse, install AI agents
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";
import type {
  AgentMarketplaceDoc,
  AgentMarketplaceVisibility,
} from "./models/agentMarketplace";
import type { AgentDoc } from "./models/agent";
import { getWorkspaceIdsForUser } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";

const router = Router();
const VISIBILITIES: AgentMarketplaceVisibility[] = ["public", "private"];

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

async function isAgentOwner(agentId: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const agent = await db.collection<AgentDoc>("agents").findOne({ _id: agentId });
  if (!agent) return false;
  return agent.ownerUserId.equals(userId);
}

async function ensureAgentAccess(agentId: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const agent = await db.collection<AgentDoc>("agents").findOne({ _id: agentId });
  if (!agent) return false;
  if (agent.ownerUserId.equals(userId)) return true;
  const workspaceIds = await getWorkspaceIdsForUser(userId);
  return workspaceIds.some((wid) => wid.equals(agent.workspaceId));
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const col = db.collection<AgentMarketplaceDoc>("agent_marketplace");
      await col.createIndex({ visibility: 1, createdAt: -1 });
      await col.createIndex({ visibility: 1, downloads: -1 });
      await col.createIndex({ visibility: 1, rating: -1 });
      await col.createIndex({ tags: 1 });
      await col.createIndex({ category: 1 });
      await col.createIndex({ name: "text", description: "text", tags: "text" });
      const installsCol = db.collection("agent_installs");
      await installsCol.createIndex({ marketplaceItemId: 1, userId: 1, workspaceId: 1 });
      const ratingsCol = db.collection("agent_ratings");
      await ratingsCol.createIndex({ marketplaceItemId: 1, userId: 1 }, { unique: true });
    })();
  }
  return indexesReady;
}

function toPublicItem(doc: AgentMarketplaceDoc & { author?: string; authorUsername?: string }) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    author: doc.author ?? undefined,
    authorUsername: doc.authorUsername ?? undefined,
    authorUserId: doc.authorUserId.toString(),
    agentId: doc.agentId.toString(),
    category: doc.category,
    tags: doc.tags ?? [],
    price: doc.price ?? 0,
    billingType: doc.billingType ?? "one-time",
    currency: doc.currency ?? "usd",
    downloads: doc.downloads ?? 0,
    rating: doc.rating ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    visibility: doc.visibility,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// POST /api/agent-marketplace/publish - publish an existing agent to the marketplace
router.post("/agent-marketplace/publish", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const body = req.body as {
      agentId?: string;
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      visibility?: string;
      price?: number;
      billingType?: string;
      currency?: string;
    };

    const agentId = parseObjectId(body.agentId ?? "");
    if (!agentId) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "agentId is required" });
    }

    const isOwner = await isAgentOwner(agentId, req.user._id);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Only the agent owner can publish" });
    }

    const db = await getDb();
    const agent = await db.collection<AgentDoc>("agents").findOne({ _id: agentId });
    if (!agent) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Agent not found" });

    const existing = await db
      .collection<AgentMarketplaceDoc>("agent_marketplace")
      .findOne({ agentId });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "CONFLICT",
        message: "This agent is already published to the marketplace",
      });
    }

    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : agent.name;
    const description = typeof body.description === "string" ? body.description : agent.description;
    const category = typeof body.category === "string" ? body.category.trim() || undefined : undefined;
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
    const visibility = VISIBILITIES.includes(body.visibility as AgentMarketplaceVisibility)
      ? (body.visibility as AgentMarketplaceVisibility)
      : "public";
    const price = typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0 ? Math.round(body.price * 100) / 100 : 0;
    const billingType = body.billingType === "monthly" ? "monthly" : "one-time";
    const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toLowerCase() : "usd";

    const now = new Date();
    const marketplaceDoc: Omit<AgentMarketplaceDoc, "_id"> = {
      name,
      description,
      authorUserId: req.user._id,
      agentId,
      category,
      tags,
      price,
      billingType,
      currency,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      visibility,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection<AgentMarketplaceDoc>("agent_marketplace")
      .insertOne(marketplaceDoc as AgentMarketplaceDoc);

    logger.info(
      { marketplaceId: result.insertedId.toString(), agentId: agentId.toString(), userId: req.user._id.toString() },
      "[AgentMarketplace] published"
    );

    return res.status(201).json({
      ok: true,
      item: toPublicItem({ _id: result.insertedId, ...marketplaceDoc } as AgentMarketplaceDoc),
    });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] publish error");
    return next(error);
  }
});

// GET /api/agent-marketplace - browse (search, category, tags, sort)
router.get("/agent-marketplace", async (req, res, next) => {
  try {
    await ensureIndexes();
    const q = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const tagsParam = req.query.tags;
    const tagsFilter = Array.isArray(tagsParam)
      ? tagsParam.filter((t): t is string => typeof t === "string")
      : typeof tagsParam === "string"
        ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    const sortParam = typeof req.query.sort === "string" ? req.query.sort : "";
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 100);

    const db = await getDb();
    const col = db.collection<AgentMarketplaceDoc>("agent_marketplace");

    const filter: Record<string, unknown> = { visibility: "public" };
    if (category) filter.category = category;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [q] } },
      ];
    }
    if (tagsFilter.length > 0) {
      filter.tags = { $in: tagsFilter };
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortParam === "popular") sort = { downloads: -1, rating: -1 };
    else if (sortParam === "trending") sort = { downloads: -1, rating: -1, createdAt: -1 };
    else if (sortParam === "new") sort = { createdAt: -1 };

    const rows = await col.find(filter).sort(sort).limit(limit).toArray();

    const usersCol = db.collection<{ _id: ObjectId; name?: string; email: string }>("users");
    const creatorsCol = db.collection<{ userId: ObjectId; username: string }>("creators");
    const authorIds = [...new Set(rows.map((r) => r.authorUserId.toString()))];
    const [authors, creators] = await Promise.all([
      usersCol.find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } }).toArray(),
      creatorsCol.find({ userId: { $in: rows.map((r) => r.authorUserId) } }).toArray(),
    ]);
    const authorMap = new Map(authors.map((u) => [u._id.toString(), u.name?.trim() || u.email?.split("@")[0] || "Anonymous"]));
    const usernameMap = new Map(creators.map((c) => [c.userId.toString(), c.username]));

    const items = rows.map((doc) =>
      toPublicItem({
        ...doc,
        author: authorMap.get(doc.authorUserId.toString()),
        authorUsername: usernameMap.get(doc.authorUserId.toString()),
      })
    );

    return res.json({ ok: true, items });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] list error");
    return next(error);
  }
});

// GET /api/agent-marketplace/sections - Trending, Popular, New
router.get("/agent-marketplace/sections", async (req, res, next) => {
  try {
    await ensureIndexes();
    const limit = Math.min(parseInt(String(req.query.limit || "6"), 10) || 6, 20);

    const db = await getDb();
    const col = db.collection<AgentMarketplaceDoc>("agent_marketplace");
    const filter = { visibility: "public" as AgentMarketplaceVisibility };

    const [trending, popular, newest] = await Promise.all([
      col.find(filter).sort({ downloads: -1, rating: -1, createdAt: -1 }).limit(limit).toArray(),
      col.find(filter).sort({ downloads: -1 }).limit(limit).toArray(),
      col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    const allDocs = [...trending, ...popular, ...newest];
    const authorIds = [...new Set(allDocs.map((r) => r.authorUserId.toString()))];
    const usersCol = db.collection<{ _id: ObjectId; name?: string; email: string }>("users");
    const creatorsCol = db.collection<{ userId: ObjectId; username: string }>("creators");
    const [authors, creators] = await Promise.all([
      usersCol.find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } }).toArray(),
      creatorsCol.find({ userId: { $in: allDocs.map((d) => d.authorUserId) } }).toArray(),
    ]);
    const authorMap = new Map(authors.map((u) => [u._id.toString(), u.name?.trim() || u.email?.split("@")[0] || "Anonymous"]));
    const usernameMap = new Map(creators.map((c) => [c.userId.toString(), c.username]));

    const withAuthor = (docs: AgentMarketplaceDoc[]) =>
      docs.map((doc) =>
        toPublicItem({
          ...doc,
          author: authorMap.get(doc.authorUserId.toString()),
          authorUsername: usernameMap.get(doc.authorUserId.toString()),
        })
      );

    return res.json({
      ok: true,
      sections: {
        trending: withAuthor(trending),
        popular: withAuthor(popular),
        new: withAuthor(newest),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] sections error");
    return next(error);
  }
});

// GET /api/agent-marketplace/categories - distinct categories
router.get("/agent-marketplace/categories", async (req, res, next) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const col = db.collection<AgentMarketplaceDoc>("agent_marketplace");
    const categories = await col.distinct("category", { visibility: "public" });
    const list = (categories as string[]).filter(Boolean).sort();
    return res.json({ ok: true, categories: list });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] categories error");
    return next(error);
  }
});

// GET /api/agent-marketplace/:id - detail
router.get("/agent-marketplace/:id", async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<AgentMarketplaceDoc>("agent_marketplace").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (doc.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const usersCol = db.collection<{ _id: ObjectId; name?: string; email: string }>("users");
    const creatorsCol = db.collection<{ userId: ObjectId; username: string }>("creators");
    const [author, creator] = await Promise.all([
      usersCol.findOne({ _id: doc.authorUserId }),
      creatorsCol.findOne({ userId: doc.authorUserId }),
    ]);
    const authorName = author?.name?.trim() || author?.email?.split("@")[0] || "Anonymous";

    return res.json({
      ok: true,
      item: toPublicItem({ ...doc, author: authorName, authorUsername: creator?.username }),
    });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] detail error");
    return next(error);
  }
});

// POST /api/agent-marketplace/:id/install - install agent into workspace
router.post("/agent-marketplace/:id/install", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const marketplaceId = parseObjectId(req.params.id ?? "");
    if (!marketplaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { workspaceId?: string };
    const workspaceId = parseObjectId(String(body.workspaceId ?? ""));
    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "workspaceId is required" });
    }

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "You do not have access to this workspace" });
    }

    const db = await getDb();
    const marketplace = await db
      .collection<AgentMarketplaceDoc>("agent_marketplace")
      .findOne({ _id: marketplaceId });
    if (!marketplace) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Marketplace item not found" });
    if (marketplace.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if ((marketplace.price ?? 0) > 0) {
      const purchase = await db.collection("marketplace_purchases").findOne({
        buyerUserId: req.user._id,
        itemType: "agent",
        itemId: marketplaceId,
        status: "paid",
      });
      if (!purchase) {
        return res.status(402).json({ ok: false, error: "PAYMENT_REQUIRED", message: "Purchase required to install this agent" });
      }
    }

    const sourceAgent = await db.collection<AgentDoc>("agents").findOne({ _id: marketplace.agentId });
    if (!sourceAgent) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Source agent not found" });

    const now = new Date();
    const newAgent: Omit<AgentDoc, "_id"> = {
      name: sourceAgent.name,
      description: sourceAgent.description,
      workspaceId,
      ownerUserId: req.user._id,
      tools: sourceAgent.tools,
      memoryEnabled: sourceAgent.memoryEnabled,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.collection<AgentDoc>("agents").insertOne(newAgent as AgentDoc);
    const installedAgentId = insertResult.insertedId;

    await db.collection<AgentMarketplaceDoc>("agent_marketplace").updateOne(
      { _id: marketplaceId },
      { $inc: { downloads: 1 }, $set: { updatedAt: now } }
    );

    await db.collection("agent_installs").insertOne({
      marketplaceItemId: marketplaceId,
      workspaceId,
      userId: req.user._id,
      installedAgentId,
      installedAt: now,
    });

    logger.info(
      {
        marketplaceId: marketplaceId.toString(),
        workspaceId: workspaceId.toString(),
        installedAgentId: installedAgentId.toString(),
        userId: req.user._id.toString(),
      },
      "[AgentMarketplace] installed"
    );

    return res.status(201).json({
      ok: true,
      agent: {
        id: installedAgentId.toString(),
        name: newAgent.name,
        workspaceId: workspaceId.toString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] install error");
    return next(error);
  }
});

// POST /api/agent-marketplace/:id/rate - star rating and optional review
router.post("/agent-marketplace/:id/rate", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const marketplaceId = parseObjectId(req.params.id ?? "");
    if (!marketplaceId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { rating?: number; reviewText?: string };
    const rating = typeof body.rating === "number" ? Math.round(body.rating) : 0;
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: "VALIDATION_ERROR", message: "rating must be 1-5" });
    }
    const reviewText = typeof body.reviewText === "string" ? body.reviewText.trim().slice(0, 2000) : undefined;

    const db = await getDb();
    const marketplace = await db
      .collection<AgentMarketplaceDoc>("agent_marketplace")
      .findOne({ _id: marketplaceId });
    if (!marketplace) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (marketplace.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const ratingsCol = db.collection("agent_ratings");
    const now = new Date();
    await ratingsCol.updateOne(
      { marketplaceItemId: marketplaceId, userId: req.user._id },
      { $set: { rating, reviewText, updatedAt: now, createdAt: now } },
      { upsert: true }
    );

    const allRatings = await ratingsCol.find({ marketplaceItemId: marketplaceId }).toArray();
    const ratingCount = allRatings.length;
    const avgRating =
      ratingCount > 0
        ? allRatings.reduce((s, r) => s + (r as unknown as { rating: number }).rating, 0) / ratingCount
        : 0;

    await db.collection<AgentMarketplaceDoc>("agent_marketplace").updateOne(
      { _id: marketplaceId },
      { $set: { rating: Math.round(avgRating * 10) / 10, ratingCount, updatedAt: now } }
    );

    return res.json({
      ok: true,
      rating: Math.round(avgRating * 10) / 10,
      ratingCount,
    });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] rate error");
    return next(error);
  }
});

// PATCH /api/agent-marketplace/:id - update (owner only: visibility, name, description, category, tags)
router.patch("/agent-marketplace/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<AgentMarketplaceDoc>("agent_marketplace").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (!doc.authorUserId.equals(req.user._id)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Only the publisher can update" });
    }

    const body = req.body as { name?: string; description?: string; category?: string; tags?: string[]; visibility?: string };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
    if (typeof body.description === "string") update.description = body.description;
    if (typeof body.category === "string") update.category = body.category.trim() || undefined;
    if (Array.isArray(body.tags)) update.tags = body.tags.filter((t): t is string => typeof t === "string");
    if (VISIBILITIES.includes(body.visibility as AgentMarketplaceVisibility)) update.visibility = body.visibility;

    await db.collection<AgentMarketplaceDoc>("agent_marketplace").updateOne({ _id: id }, { $set: update });
    const updated = await db.collection<AgentMarketplaceDoc>("agent_marketplace").findOne({ _id: id });
    return res.json({ ok: true, item: updated ? toPublicItem(updated) : null });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] patch error");
    return next(error);
  }
});

// DELETE /api/agent-marketplace/:id - unpublish (owner only)
router.delete("/agent-marketplace/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<AgentMarketplaceDoc>("agent_marketplace").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (!doc.authorUserId.equals(req.user._id)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Only the publisher can unpublish" });
    }

    await db.collection<AgentMarketplaceDoc>("agent_marketplace").deleteOne({ _id: id });
    await db.collection("agent_ratings").deleteMany({ marketplaceItemId: id });
    logger.info({ marketplaceId: id.toString(), userId: req.user._id.toString() }, "[AgentMarketplace] unpublished");
    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "[AgentMarketplace] delete error");
    return next(error);
  }
});

export { router as agentMarketplaceRouter };
