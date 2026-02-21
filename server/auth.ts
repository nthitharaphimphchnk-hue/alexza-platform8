import { Router, type Response } from "express";
import { MongoServerError, ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { createCreditTransaction, FREE_TRIAL_CREDITS } from "./credits";
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

interface UserDoc {
  email: string;
  passwordHash: string;
  name: string;
  walletBalanceCredits: number;
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

async function ensureAuthCollections() {
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

async function createSessionAndSetCookie(userId: ObjectId, res: Response) {
  const db = await getDb();
  const sessions = db.collection<SessionDoc>("sessions");

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

  res.cookie(getSessionCookieName(), token, getSessionCookieOptions());
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
      walletBalanceCredits: FREE_TRIAL_CREDITS,
      plan: "free",
      monthlyCreditsAllowance: PLAN_MONTHLY_ALLOWANCE.free,
      monthlyCreditsUsed: 0,
      billingCycleAnchor: createdAt,
      lowCreditsEmailSuppressed: false,
      createdAt,
    });

    try {
      await createCreditTransaction({
        userId: insertResult.insertedId,
        type: "bonus",
        amountCredits: FREE_TRIAL_CREDITS,
        reason: "Signup free trial credits",
      });
    } catch (transactionError) {
      await users.deleteOne({ _id: insertResult.insertedId });
      throw transactionError;
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
  try {
    await ensureAuthCollections();
    const payload = validateLogin(req.body as AuthBody);

    if (!payload.valid) {
      return res.status(400).json(validationError(payload.message));
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const user = (await users.findOne({ email: payload.email })) as WithId<UserDoc> | null;

    const ctx = getDbLogContext();
    const masked = maskEmail(payload.email);

    if (!user) {
      console.log(
        `[Auth] login failed result=USER_NOT_FOUND email=${masked} db=${ctx.dbName} hostHash=${ctx.uriHostHash}`
      );
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Invalid credentials." });
    }

    const isValidPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!isValidPassword) {
      console.log(
        `[Auth] login failed result=PASSWORD_MISMATCH email=${masked} db=${ctx.dbName} hostHash=${ctx.uriHostHash}`
      );
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Invalid credentials." });
    }

    await createSessionAndSetCookie(user._id, res);
    return res.json({ ok: true, user: buildUserResponse(user) });
  } catch (error) {
    return next(error);
  }
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
