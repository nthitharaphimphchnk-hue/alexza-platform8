import { Router } from "express";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { hashApiKey } from "./utils/apiKey";

interface ProjectDoc {
  ownerUserId: ObjectId;
  name: string;
}

interface ApiKeyDoc {
  projectId: ObjectId;
  ownerUserId: ObjectId;
  name?: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: Date;
  revokedAt: Date | null;
}

interface CreateKeyBody {
  name?: unknown;
}

const router = Router();
let keyIndexesReady: Promise<void> | null = null;

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message } as const;
}

function parseProjectId(rawId: string): ObjectId | null {
  if (!ObjectId.isValid(rawId)) return null;
  return new ObjectId(rawId);
}

async function ensureKeyIndexes() {
  if (!keyIndexesReady) {
    keyIndexesReady = (async () => {
      const db = await getDb();
      const keys = db.collection<ApiKeyDoc>("api_keys");
      await keys.createIndex({ projectId: 1, createdAt: -1 });
      await keys.createIndex({ ownerUserId: 1, createdAt: -1 });
      await keys.createIndex({ keyPrefix: 1 });
      await keys.createIndex({ keyHash: 1 }, { unique: true });
    })();
  }
  return keyIndexesReady;
}

async function verifyProjectOwnership(projectId: ObjectId, ownerUserId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const projects = db.collection<ProjectDoc>("projects");
  const project = await projects.findOne({ _id: projectId, ownerUserId });
  return Boolean(project);
}

function generateRawApiKey() {
  return `axza_${crypto.randomBytes(24).toString("hex")}`;
}

router.post("/projects/:id/keys", requireAuth, async (req, res, next) => {
  try {
    await ensureKeyIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const projectId = parseProjectId(req.params.id);
    if (!projectId) {
      return res.status(400).json(validationError("Invalid project id"));
    }

    const isOwner = await verifyProjectOwnership(projectId, req.user._id);
    if (!isOwner) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const body = req.body as CreateKeyBody;
    const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
    if (nameRaw.length > 100) {
      return res.status(400).json(validationError("Key name must not exceed 100 characters"));
    }

    const rawKey = generateRawApiKey();
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = hashApiKey(rawKey);
    const now = new Date();

    const db = await getDb();
    const keys = db.collection<ApiKeyDoc>("api_keys");
    const insertResult = await keys.insertOne({
      projectId,
      ownerUserId: req.user._id,
      name: nameRaw || undefined,
      keyPrefix,
      keyHash,
      createdAt: now,
      revokedAt: null,
    });

    return res.status(201).json({
      ok: true,
      key: {
        id: insertResult.insertedId.toString(),
        prefix: keyPrefix,
        name: nameRaw || "",
        createdAt: now,
        revokedAt: null,
      },
      rawKey,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/projects/:id/keys", requireAuth, async (req, res, next) => {
  try {
    await ensureKeyIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const projectId = parseProjectId(req.params.id);
    if (!projectId) {
      return res.status(400).json(validationError("Invalid project id"));
    }

    const isOwner = await verifyProjectOwnership(projectId, req.user._id);
    if (!isOwner) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const keys = db.collection<ApiKeyDoc>("api_keys");
    const rows = await keys.find({ projectId, ownerUserId: req.user._id }).sort({ createdAt: -1 }).toArray();

    return res.json({
      ok: true,
      keys: rows.map((row) => ({
        id: row._id.toString(),
        projectId: row.projectId.toString(),
        ownerUserId: row.ownerUserId.toString(),
        name: row.name ?? "",
        prefix: row.keyPrefix,
        createdAt: row.createdAt,
        revokedAt: row.revokedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/projects/:id/keys/:keyId/revoke", requireAuth, async (req, res, next) => {
  try {
    await ensureKeyIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const projectId = parseProjectId(req.params.id);
    const keyIdRaw = req.params.keyId;
    if (!projectId || !ObjectId.isValid(keyIdRaw)) {
      return res.status(400).json(validationError("Invalid project id or key id"));
    }
    const keyId = new ObjectId(keyIdRaw);

    const isOwner = await verifyProjectOwnership(projectId, req.user._id);
    if (!isOwner) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const keys = db.collection<ApiKeyDoc>("api_keys");
    const now = new Date();
    const updateResult = await keys.findOneAndUpdate(
      {
        _id: keyId,
        projectId,
        ownerUserId: req.user._id,
      },
      {
        $set: { revokedAt: now },
      },
      {
        returnDocument: "after",
      }
    );

    if (!updateResult) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    return res.json({
      ok: true,
      key: {
        id: updateResult._id.toString(),
        revokedAt: updateResult.revokedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export { router as keysRouter };
