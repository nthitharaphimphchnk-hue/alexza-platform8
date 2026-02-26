import { Router, type Response } from "express";
import { MongoServerError, ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { FREE_CREDITS, grantFreeCreditsIfEligible, writeWalletTransaction } from "./wallet";
import { PLAN_MONTHLY_ALLOWANCE } from "./billing";
import {
  generateSessionToken,
  getSessionClearCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
  getSessionTtlMs,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "./utils/crypto";
import { getDbLogContext, maskEmail } from "./utils/sanitize";
import { logger } from "./utils/logger";

function getRequestId(req: { requestId?: string }): string {
  return req.requestId ?? "unknown";
}

interface UserDoc {
  email: string;
  passwordHash: string;
  name: string;
  oauthProviders?: { provider: string; providerUserId: string }[];
  walletBalanceCredits?: number;
  walletGrantedFreeCredits?: boolean;
  walletUpdatedAt?: Date;
  plan: "free" | "pro";
  monthlyCreditsAllowance: number;
  monthlyCreditsUsed: number;
  billingCycleAnchor: Date;
  lowCreditsEmailLastSentAt?: Date;
  lowCreditsEmailSuppressed?: boolean;
  lowCreditsEmailLastBalance?: number;
  createdAt: Date;
}

interface SessionDoc {
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

interface AuthBody {
  email?: unknown;
  password?: unknown;
  name?: unknown;
}

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let authCollectionsReady: Promise<void> | null = null;

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message } as const;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateSignup(body: AuthBody) {
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!emailRegex.test(email)) {
    return { valid: false as const, message: "Invalid email format" };
  }

  if (password.length < 8) {
    return { valid: false as const, message: "Password must be at least 8 characters" };
  }

  if (name.length < 2) {
    return { valid: false as const, message: "Name must be at least 2 characters" };
  }

  return { valid: true as const, email, password, name };
}

function validateLogin(body: AuthBody) {
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!emailRegex.test(email)) {
    return { valid: false as const, message: "Invalid email format" };
  }

  if (password.length < 8) {
    return { valid: false as const, message: "Password must be at least 8 characters" };
  }

  return { valid: true as const, email, password };
}

export async function ensureAuthCollections() {
  if (!authCollectionsReady) {
    authCollectionsReady = (async () => {
      const db = await getDb();
      const users = db.collection<UserDoc>("users");
      const sessions = db.collection<SessionDoc>("sessions");

      await users.createIndex({ email: 1 }, { unique: true });
      await sessions.createIndex({ tokenHash: 1 }, { unique: true });
      await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await sessions.createIndex({ userId: 1 });
    })();
  }
  return authCollectionsReady;
}

function buildUserResponse(user: WithId<UserDoc>) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    lowCreditsEmailSuppressed: user.lowCreditsEmailSuppressed ?? false,
  };
}

export async function createSessionAndSetCookie(userId: ObjectId, res: Response) {
  const db = await getDb();
  const sessions = db.collection<SessionDoc>("sessions");

  const cookieOpts = getSessionCookieOptions();
  logger.info(
    `[createSessionAndSetCookie] cookie options secure=${cookieOpts.secure} sameSite=${cookieOpts.sameSite} path=${cookieOpts.path}`
  );

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getSessionTtlMs());

  await sessions.insertOne({
    userId,
    tokenHash,
    createdAt: now,
    expiresAt,
  });

  res.cookie(getSessionCookieName(), token, cookieOpts);
}

router.post("/auth/signup", async (req, res, next) => {
  try {
    await ensureAuthCollections();
    const payload = validateSignup(req.body as AuthBody);

    if (!payload.valid) {
      return res.status(400).json(validationError(payload.message));
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");

    const existing = await users.findOne({ email: payload.email });
    if (existing) {
      return res.status(409).json({ ok: false, error: "EMAIL_EXISTS" });
    }

    const passwordHash = await hashPassword(payload.password);
    const createdAt = new Date();
    const insertResult = await users.insertOne({
      email: payload.email,
      passwordHash,
      name: payload.name,
      walletBalanceCredits: FREE_CREDITS,
      walletGrantedFreeCredits: true,
      walletUpdatedAt: createdAt,
      plan: "free",
      monthlyCreditsAllowance: PLAN_MONTHLY_ALLOWANCE.free,
      monthlyCreditsUsed: 0,
      billingCycleAnchor: createdAt,
      lowCreditsEmailSuppressed: false,
      createdAt,
    });

    try {
      await writeWalletTransaction({
        userId: insertResult.insertedId,
        type: "grant",
        credits: FREE_CREDITS,
        meta: { reason: "New user signup bonus" },
      });
    } catch (txErr) {
      await users.deleteOne({ _id: insertResult.insertedId });
      throw txErr;
    }

    const user = (await users.findOne({ _id: insertResult.insertedId })) as WithId<UserDoc> | null;
    if (!user) {
      throw new Error("Failed to load newly created user");
    }

    await createSessionAndSetCookie(insertResult.insertedId, res);
    return res.status(201).json({ ok: true, user: buildUserResponse(user) });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return res.status(409).json({ ok: false, error: "EMAIL_EXISTS" });
    }
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  const requestId = getRequestId(req as { requestId?: string });
  const hasBody = Boolean(req.body && typeof req.body === "object");
  const hasEmail = hasBody && typeof (req.body as AuthBody).email === "string";
  logger.info(
    `[Login] route hit requestId=${requestId} hasBody=${hasBody} hasEmail=${hasEmail}`
  );

  const payload = validateLogin(req.body as AuthBody);

  if (!payload.valid) {
    return res.status(400).json(validationError(payload.message));
  }

  try {
    logger.info(`[Login Step] ensureAuthCollections ${requestId}`);
    await ensureAuthCollections();
  } catch (err) {
    const errName = err instanceof Error ? err.name : "Error";
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.warn(
      { requestId, stepName: "ensureAuthCollections", errStack },
      `[Login Fail] ensureAuthCollections ${requestId} ${errName} ${errMessage}`
    );
    return next(err);
  }

  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    logger.info(`[Login Step] getDb ${requestId}`);
    db = await getDb();
  } catch (err) {
    const errName = err instanceof Error ? err.name : "Error";
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.warn(
      { requestId, stepName: "getDb", errStack },
      `[Login Fail] getDb ${requestId} ${errName} ${errMessage}`
    );
    return next(err);
  }

  let user: WithId<UserDoc> | null;
  try {
    logger.info(`[Login Step] findUser ${requestId}`);
    const users = db.collection<UserDoc>("users");
    user = (await users.findOne({ email: payload.email })) as WithId<UserDoc> | null;
  } catch (err) {
    const errName = err instanceof Error ? err.name : "Error";
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.warn(
      { requestId, stepName: "findUser", errStack },
      `[Login Fail] findUser ${requestId} ${errName} ${errMessage}`
    );
    return next(err);
  }

  const ctx = getDbLogContext();
  const masked = maskEmail(payload.email);
  if (!user) {
    logger.info(
      `[Auth] login failed result=USER_NOT_FOUND email=${masked} db=${ctx.dbName} hostHash=${ctx.uriHostHash}`
    );
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Invalid credentials." });
  }

  const oauthProviders = user.oauthProviders ?? [];
  const hasOAuth = oauthProviders.length > 0;
  const hasPasswordHash = Boolean(user.passwordHash && String(user.passwordHash).trim());
  if (hasOAuth || !hasPasswordHash) {
    const providers = [...new Set(oauthProviders.map((p) => p.provider))];
    const msg =
      providers.length === 0
        ? "Account uses OAuth. Please login with Google."
        : providers.length === 1
          ? `Account uses OAuth. Please login with ${providers[0] === "google" ? "Google" : "GitHub"}.`
          : "Account uses OAuth. Please login with Google or GitHub.";
    logger.info(
      `[Auth] login failed result=OAUTH_ACCOUNT email=${masked} providers=${providers.join(",")}`
    );
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: msg });
  }

  try {
    logger.info(`[Login Step] verifyPassword ${requestId}`);
    const isValidPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!isValidPassword) {
      logger.info(
        `[Auth] login failed result=PASSWORD_MISMATCH email=${masked} db=${ctx.dbName} hostHash=${ctx.uriHostHash}`
      );
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Invalid credentials." });
    }
  } catch (err) {
    const errName = err instanceof Error ? err.name : "Error";
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.warn(
      { requestId, stepName: "verifyPassword", errStack },
      `[Login Fail] verifyPassword ${requestId} ${errName} ${errMessage}`
    );
    return next(err);
  }

  try {
    logger.info(`[Login Step] grantFreeCreditsIfEligible ${requestId}`);
    await grantFreeCreditsIfEligible(user._id);
  } catch (err) {
    const errName = err instanceof Error ? err.name : "Error";
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.warn(
      { requestId, stepName: "grantFreeCreditsIfEligible", errStack },
      `[Login Fail] grantFreeCreditsIfEligible ${requestId} ${errName} ${errMessage}`
    );
    return next(err);
  }

  try {
    logger.info(`[Login Step] createSessionAndSetCookie ${requestId}`);
    await createSessionAndSetCookie(user._id, res);
  } catch (err) {
    const errName = err instanceof Error ? err.name : "Error";
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.warn(
      { requestId, stepName: "createSessionAndSetCookie", errStack },
      `[Login Fail] createSessionAndSetCookie ${requestId} ${errName} ${errMessage}`
    );
    return next(err);
  }

  logger.info(`[Login] success requestId=${requestId} email=${masked} userId=${user._id.toString()}`);
  return res.json({ ok: true, user: buildUserResponse(user) });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const user = (await users.findOne({ _id: req.user._id })) as WithId<UserDoc> | null;
    if (!user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    return res.json({ ok: true, user: buildUserResponse(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const body = req.body as { lowCreditsEmailSuppressed?: unknown };
    if (typeof body.lowCreditsEmailSuppressed !== "boolean") {
      return res.status(400).json(
        validationError("lowCreditsEmailSuppressed must be a boolean")
      );
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    await users.updateOne(
      { _id: req.user._id },
      { $set: { lowCreditsEmailSuppressed: body.lowCreditsEmailSuppressed } }
    );

    const updatedUser = (await users.findOne({ _id: req.user._id })) as WithId<UserDoc> | null;
    if (!updatedUser) {
      return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    }
    return res.json({ ok: true, user: buildUserResponse(updatedUser) });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    await ensureAuthCollections();
    const token = req.cookies?.[getSessionCookieName()];

    if (token && typeof token === "string") {
      const db = await getDb();
      const sessions = db.collection<SessionDoc>("sessions");
      await sessions.deleteOne({ tokenHash: hashSessionToken(token) });
    }

    res.clearCookie(getSessionCookieName(), getSessionClearCookieOptions());
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export { router as authRouter };
