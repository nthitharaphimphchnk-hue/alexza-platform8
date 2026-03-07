import { Router } from "express";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { hashApiKey } from "./utils/apiKey";
import { ensureProjectAccess } from "./workspaces/projectAccess";
import { getMemberRole } from "./workspaces/workspaces.routes";
import { hasPermission } from "./workspaces/permissions";
import { API_KEY_SCOPES, isValidScope, type ApiKeyScope } from "./config/scopes";
import { ensureUsageIndexes } from "./usage";

interface ProjectDoc {
  ownerUserId: ObjectId;
  workspaceId?: ObjectId;
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
  scopes?: string[];
}

interface CreateKeyBody {
  name?: unknown;
  scopes?: unknown;
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

async function verifyProjectAccess(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  return ensureProjectAccess(projectId, userId);
}

async function canManageKeys(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const hasAccess = await ensureProjectAccess(projectId, userId);
  if (!hasAccess) return false;
  const db = await getDb();
  const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId });
  if (!project) return false;
  if (!project.workspaceId) return true;
  const role = await getMemberRole(project.workspaceId, userId);
  return !!role && hasPermission(role, "keys:manage");
}

function generateRawApiKey() {
  return `axza_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Create a temporary API key for replay. Caller must revoke it after use.
 * Used internally by request replay - not exposed via HTTP.
 */
export async function createTemporaryKeyForReplay(
  projectId: ObjectId,
  ownerUserId: ObjectId
): Promise<{ rawKey: string; keyId: ObjectId }> {
  await ensureKeyIndexes();
  const rawKey = generateRawApiKey();
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = hashApiKey(rawKey);
  const db = await getDb();
  const keys = db.collection<ApiKeyDoc>("api_keys");
  const insertResult = await keys.insertOne({
    projectId,
    ownerUserId,
    keyPrefix,
    keyHash,
    createdAt: new Date(),
    revokedAt: null,
  });
  return { rawKey, keyId: insertResult.insertedId };
}

/**
 * Revoke a key by ID. Used internally after replay.
 */
export async function revokeKeyById(keyId: ObjectId): Promise<void> {
  const db = await getDb();
  const keys = db.collection<ApiKeyDoc>("api_keys");
  await keys.updateOne({ _id: keyId }, { $set: { revokedAt: new Date() } });
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

    const canManage = await canManageKeys(projectId, req.user._id);
    if (!canManage) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const body = req.body as CreateKeyBody;
    const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
    if (nameRaw.length > 100) {
      return res.status(400).json(validationError("Key name must not exceed 100 characters"));
    }

    let scopes: ApiKeyScope[] | undefined;
    if (body.scopes !== undefined && body.scopes !== null) {
      const raw = Array.isArray(body.scopes) ? body.scopes : [body.scopes];
      const parsed = raw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean);
      const invalid = parsed.filter((s) => !isValidScope(s));
      if (invalid.length > 0) {
        return res.status(400).json(
          validationError(`Invalid scopes: ${invalid.join(", ")}. Valid: ${API_KEY_SCOPES.join(", ")}`)
        );
      }
      scopes = parsed.length > 0 ? (parsed as ApiKeyScope[]) : undefined;
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
      ...(scopes && scopes.length > 0 && { scopes }),
    });

    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId });
    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project?.workspaceId ?? null,
      projectId,
      actionType: "api_key.created",
      resourceType: "api_key",
      resourceId: insertResult.insertedId.toString(),
      metadata: { keyPrefix, name: nameRaw || undefined },
      ip,
      userAgent,
      status: "success",
    });

    return res.status(201).json({
      ok: true,
      key: {
        id: insertResult.insertedId.toString(),
        prefix: keyPrefix,
        name: nameRaw || "",
        scopes: scopes ?? [],
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

    const hasAccess = await verifyProjectAccess(projectId, req.user._id);
    if (!hasAccess) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const keys = db.collection<ApiKeyDoc>("api_keys");
    const rows = await keys.find({ projectId }).sort({ createdAt: -1 }).toArray();

    return res.json({
      ok: true,
      keys: rows.map((row) => ({
        id: row._id.toString(),
        projectId: row.projectId.toString(),
        ownerUserId: row.ownerUserId.toString(),
        name: row.name ?? "",
        prefix: row.keyPrefix,
        scopes: row.scopes ?? [],
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

    const canManage = await canManageKeys(projectId, req.user._id);
    if (!canManage) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const keys = db.collection<ApiKeyDoc>("api_keys");
    const now = new Date();
    const updateResult = await keys.findOneAndUpdate(
      {
        _id: keyId,
        projectId,
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

    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId });
    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(req);
    logAuditEvent({
      ownerUserId: req.user._id,
      actorUserId: req.user._id,
      actorEmail: (req.user as { email?: string }).email ?? "",
      workspaceId: project?.workspaceId ?? null,
      projectId,
      actionType: "api_key.revoked",
      resourceType: "api_key",
      resourceId: updateResult._id.toString(),
      metadata: { keyPrefix: updateResult.keyPrefix },
      ip,
      userAgent,
      status: "success",
    });

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

function parseDays(raw: unknown): 7 | 30 | 90 {
  const n = Number.parseInt(String(raw ?? "30"), 10);
  if (n === 7) return 7;
  if (n === 90) return 90;
  return 30;
}

router.get("/api-keys/:id/usage", requireAuth, async (req, res, next) => {
  try {
    await ensureKeyIndexes();
    await ensureUsageIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const keyIdRaw = req.params.id;
    if (!ObjectId.isValid(keyIdRaw)) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const keyId = new ObjectId(keyIdRaw);
    const days = parseDays(req.query.days);

    const db = await getDb();
    const keys = db.collection<ApiKeyDoc>("api_keys");
    const keyDoc = await keys.findOne({ _id: keyId });
    if (!keyDoc) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const hasAccess = await verifyProjectAccess(keyDoc.projectId, req.user._id);
    if (!hasAccess) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const logs = db.collection<{
      apiKeyId: ObjectId;
      status: string;
      totalTokens: number | null;
      createdAt: Date;
    }>("usage_logs");

    const [totals, dailyRaw] = await Promise.all([
      logs
        .aggregate<{
          totalRequests: number;
          success: number;
          failed: number;
          creditsUsed: number;
        }>([
          { $match: { apiKeyId: keyId, createdAt: { $gte: from, $lte: to } } },
          {
            $addFields: {
              credits: {
                $max: [
                  1,
                  { $ceil: { $divide: [{ $ifNull: ["$totalTokens", 0] }, 1000] } },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
              creditsUsed: { $sum: "$credits" },
            },
          },
          { $project: { _id: 0 } },
        ])
        .toArray(),
      logs
        .aggregate<{ date: string; requests: number; totalTokens: number }>([
          { $match: { apiKeyId: keyId, createdAt: { $gte: from, $lte: to } } },
          {
            $addFields: {
              credits: {
                $max: [
                  1,
                  { $ceil: { $divide: [{ $ifNull: ["$totalTokens", 0] }, 1000] } },
                ],
              },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              requests: { $sum: 1 },
              credits: { $sum: "$credits" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", requests: 1, credits: 1, _id: 0 } },
        ])
        .toArray(),
    ]);

    const t = totals[0];
    const totalRequests = t?.totalRequests ?? 0;
    const success = t?.success ?? 0;
    const failed = t?.failed ?? 0;
    const creditsUsed = t?.creditsUsed ?? 0;

    const dailyUsage = dailyRaw.map((row) => ({
      date: row.date,
      requests: row.requests,
      credits: row.credits ?? 0,
    }));

    return res.json({
      ok: true,
      totalRequests,
      creditsUsed,
      success,
      failed,
      dailyUsage,
      range: { days, from: from.toISOString(), to: to.toISOString() },
      key: {
        name: keyDoc.name ?? "",
        prefix: keyDoc.keyPrefix,
        projectId: keyDoc.projectId.toString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export { router as keysRouter };
