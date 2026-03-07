/**
 * App Store - publish, browse, install apps (plugins/extensions)
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { logger } from "./utils/logger";
import type { AppDoc, AppVersionDoc, AppInstallDoc, AppPermission } from "./models/app";
import { APP_PERMISSIONS } from "./models/app";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";

const router = Router();

const CATEGORIES = ["productivity", "automation", "analytics", "integrations", "other"] as const;
const VISIBILITIES = ["public", "private"] as const;

function parseObjectId(raw: string): ObjectId | null {
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function validatePermissions(perms: unknown): AppPermission[] {
  if (!Array.isArray(perms)) return [];
  return perms.filter((p): p is AppPermission =>
    typeof p === "string" && APP_PERMISSIONS.includes(p as AppPermission)
  );
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      const apps = db.collection<AppDoc>("apps");
      await apps.createIndex({ visibility: 1, createdAt: -1 });
      await apps.createIndex({ visibility: 1, downloads: -1 });
      await apps.createIndex({ visibility: 1, rating: -1 });
      await apps.createIndex({ category: 1 });
      await apps.createIndex({ tags: 1 });
      await apps.createIndex({ name: "text", description: "text", tags: "text" });
      const versions = db.collection<AppVersionDoc>("app_versions");
      await versions.createIndex({ appId: 1, createdAt: -1 });
      const installs = db.collection<AppInstallDoc>("app_installs");
      await installs.createIndex({ workspaceId: 1, appId: 1 }, { unique: true });
      await installs.createIndex({ appId: 1 });
    })();
  }
  return indexesReady;
}

function toPublicApp(doc: AppDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    author: doc.author,
    permissions: doc.permissions ?? [],
    category: doc.category,
    tags: doc.tags ?? [],
    version: (doc as AppDoc & { version?: string }).version ?? "1.0.0",
    downloads: doc.downloads ?? 0,
    rating: doc.rating ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    visibility: doc.visibility,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// POST /api/apps/publish - publish app
router.post("/apps/publish", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const body = req.body as {
      name?: string;
      description?: string;
      permissions?: unknown;
      category?: string;
      tags?: string[];
      visibility?: string;
      version?: string;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "name must be at least 2 characters",
      });
    }

    const description = typeof body.description === "string" ? body.description : "";
    const permissions = validatePermissions(body.permissions);
    const category = CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])
      ? body.category
      : undefined;
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 20)
      : [];
    const visibility = VISIBILITIES.includes(body.visibility as (typeof VISIBILITIES)[number])
      ? body.visibility
      : "public";
    const version = typeof body.version === "string" ? body.version.trim() || "1.0.0" : "1.0.0";

    const db = await getDb();
    const usersCol = db.collection<{ _id: ObjectId; name?: string; email: string }>("users");
    const user = await usersCol.findOne({ _id: req.user._id });
    const author = user?.name?.trim() || user?.email?.split("@")[0] || "Anonymous";

    const now = new Date();
    const appDoc: Omit<AppDoc, "_id"> = {
      name,
      description,
      author,
      authorUserId: req.user._id,
      permissions,
      category,
      tags,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      visibility,
      createdAt: now,
      updatedAt: now,
    };

    const appResult = await db.collection<AppDoc>("apps").insertOne(appDoc as AppDoc);
    const appId = appResult.insertedId;

    const versionDoc: Omit<AppVersionDoc, "_id"> = {
      appId,
      version,
      createdAt: now,
    };
    await db.collection<AppVersionDoc>("app_versions").insertOne(versionDoc as AppVersionDoc);

    const app = await db.collection<AppDoc>("apps").findOne({ _id: appId });
    if (!app) throw new Error("Failed to load app");

    const publicApp = toPublicApp(app);
    (publicApp as { version: string }).version = version;

    logger.info({ appId: appId.toString(), userId: req.user._id.toString() }, "[AppStore] published");

    return res.status(201).json({
      ok: true,
      app: publicApp,
    });
  } catch (error) {
    logger.error({ err: error }, "[AppStore] publish error");
    return next(error);
  }
});

// GET /api/apps - browse (search, category)
router.get("/apps", async (req, res, next) => {
  try {
    await ensureIndexes();

    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 100);
    const section = typeof req.query.section === "string" ? req.query.section : "";

    const db = await getDb();
    const col = db.collection<AppDoc>("apps");

    const filter: Record<string, unknown> = { visibility: "public" };
    if (category) filter.category = category;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [q] } },
      ];
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (section === "popular") sort = { downloads: -1, rating: -1 };
    else if (section === "trending") sort = { downloads: -1, rating: -1, createdAt: -1 };
    else if (section === "new") sort = { createdAt: -1 };

    const rows = await col.find(filter).sort(sort).limit(limit).toArray();

    const versionsCol = db.collection<AppVersionDoc>("app_versions");
    const withVersions = await Promise.all(
      rows.map(async (app) => {
        const latest = await versionsCol.findOne(
          { appId: app._id },
          { sort: { createdAt: -1 } }
        );
        const pub = toPublicApp(app);
        (pub as { version: string }).version = latest?.version ?? "1.0.0";
        return pub;
      })
    );

    return res.json({
      ok: true,
      apps: withVersions,
    });
  } catch (error) {
    logger.error({ err: error }, "[AppStore] list error");
    return next(error);
  }
});

// GET /api/apps/sections - Trending, Popular, New
router.get("/apps/sections", async (req, res, next) => {
  try {
    await ensureIndexes();
    const limit = Math.min(parseInt(String(req.query.limit || "6"), 10) || 6, 20);

    const db = await getDb();
    const col = db.collection<AppDoc>("apps");
    const versionsCol = db.collection<AppVersionDoc>("app_versions");
    const filter = { visibility: "public" };

    const fetchWithVersions = async (apps: AppDoc[]) => {
      return Promise.all(
        apps.map(async (app) => {
          const latest = await versionsCol.findOne(
            { appId: app._id },
            { sort: { createdAt: -1 } }
          );
          const pub = toPublicApp(app);
          (pub as { version: string }).version = latest?.version ?? "1.0.0";
          return pub;
        })
      );
    };

    const [trending, popular, newest] = await Promise.all([
      col.find(filter).sort({ downloads: -1, rating: -1, createdAt: -1 }).limit(limit).toArray(),
      col.find(filter).sort({ downloads: -1 }).limit(limit).toArray(),
      col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    return res.json({
      ok: true,
      sections: {
        trending: await fetchWithVersions(trending),
        popular: await fetchWithVersions(popular),
        new: await fetchWithVersions(newest),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AppStore] sections error");
    return next(error);
  }
});

// GET /api/apps/:id - detail
router.get("/apps/:id", async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id ?? "");
    if (!id) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const db = await getDb();
    const doc = await db.collection<AppDoc>("apps").findOne({ _id: id });
    if (!doc) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (doc.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const latest = await db
      .collection<AppVersionDoc>("app_versions")
      .findOne({ appId: id }, { sort: { createdAt: -1 } });

    const detail = toPublicApp(doc);
    (detail as { version: string }).version = latest?.version ?? "1.0.0";

    return res.json({
      ok: true,
      app: detail,
    });
  } catch (error) {
    logger.error({ err: error }, "[AppStore] detail error");
    return next(error);
  }
});

// POST /api/apps/:id/install - install app into workspace
router.post("/apps/:id/install", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const appId = parseObjectId(req.params.id ?? "");
    if (!appId) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const body = req.body as { workspaceId?: string };
    const workspaceId = parseObjectId(String(body.workspaceId ?? ""));
    if (!workspaceId) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "workspaceId is required",
      });
    }

    const role = await getMemberRole(workspaceId, req.user._id);
    if (!role || !hasPermission(role, "workspace:manage")) {
      return res.status(403).json({
        ok: false,
        error: "FORBIDDEN",
        message: "You need workspace manage permission to install apps",
      });
    }

    const db = await getDb();
    const app = await db.collection<AppDoc>("apps").findOne({ _id: appId });
    if (!app) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "App not found" });
    if (app.visibility !== "public") return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const installsCol = db.collection<AppInstallDoc>("app_installs");
    const existing = await installsCol.findOne({ workspaceId, appId });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "CONFLICT",
        message: "App is already installed in this workspace",
      });
    }

    const now = new Date();
    await installsCol.insertOne({
      appId,
      workspaceId,
      installedByUserId: req.user._id,
      installedAt: now,
    } as AppInstallDoc);

    await db.collection<AppDoc>("apps").updateOne(
      { _id: appId },
      { $inc: { downloads: 1 }, $set: { updatedAt: now } }
    );

    logger.info(
      { appId: appId.toString(), workspaceId: workspaceId.toString(), userId: req.user._id.toString() },
      "[AppStore] installed"
    );

    return res.status(201).json({
      ok: true,
      install: {
        appId: appId.toString(),
        workspaceId: workspaceId.toString(),
        installedAt: now,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AppStore] install error");
    return next(error);
  }
});

// GET /api/apps/permissions - list available permissions
router.get("/apps/permissions", (_req, res) => {
  res.json({
    ok: true,
    permissions: APP_PERMISSIONS.map((p) => ({
      id: p,
      label: p.replace(":", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  });
});

export default router;
