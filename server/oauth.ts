/**
 * OAuth (Google, GitHub) - login/signup via provider.
 * Routes: GET /auth/google, /auth/google/callback, /auth/github, /auth/github/callback
 */

import { Router, type Response } from "express";
import crypto from "crypto";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { createSessionAndSetCookie, ensureAuthCollections } from "./auth";
import { hashPassword } from "./utils/crypto";
import { FREE_CREDITS, grantFreeCreditsIfEligible, writeWalletTransaction } from "./wallet";
import { PLAN_MONTHLY_ALLOWANCE } from "./billing";
import { logger } from "./utils/logger";

const router = Router();

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_REDIRECT_COOKIE = "oauth_redirect";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 min

interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  emailVerified?: boolean;
  oauthProviders?: { provider: string; providerUserId: string }[];
  walletBalanceCredits?: number;
  walletGrantedFreeCredits?: boolean;
  walletUpdatedAt?: Date;
  plan?: "free" | "pro";
  monthlyCreditsAllowance?: number;
  monthlyCreditsUsed?: number;
  billingCycleAnchor?: Date;
  lowCreditsEmailSuppressed?: boolean;
  createdAt: Date;
}

function getSecret(): string {
  const s = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!s?.trim()) throw new Error("SESSION_SECRET or JWT_SECRET required for OAuth state");
  return s;
}

function getRedirectBase(): string {
  const { base: raw } = getRedirectBaseWithSource();
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.origin;
  } catch {
    return raw;
  }
}

/** Returns base URL and which env var provided it (for diagnostics). */
function getRedirectBaseWithSource(): { base: string; source: string } {
  const oauth = (process.env.OAUTH_REDIRECT_BASE_URL || "").trim().replace(/\/+$/, "");
  if (oauth) return { base: oauth, source: "OAUTH_REDIRECT_BASE_URL" };
  const fe = (process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (fe) {
    const src = process.env.FRONTEND_APP_URL ? "FRONTEND_APP_URL" : process.env.CLIENT_URL ? "CLIENT_URL" : "APP_BASE_URL";
    return { base: fe, source: src };
  }
  throw new Error("OAUTH_REDIRECT_BASE_URL or FRONTEND_APP_URL/CLIENT_URL/APP_BASE_URL required for OAuth callbacks");
}

function getFrontendUrl(): string {
  const url = (process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!url) throw new Error("FRONTEND_APP_URL, CLIENT_URL, or APP_BASE_URL required");
  return url;
}

function getAllowedRedirects(): string[] {
  const url = getFrontendUrl();
  const extra = (process.env.OAUTH_ALLOWED_REDIRECTS || "").trim();
  const list = [url];
  if (extra) list.push(...extra.split(",").map((u) => u.trim()).filter(Boolean));
  return [...new Set(list)];
}

function generateState(): string {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const ts = Date.now().toString();
  const secret = getSecret();
  const sig = crypto.createHmac("sha256", secret).update(`${nonce}.${ts}`).digest("hex");
  return `${nonce}.${ts}.${sig}`;
}

function verifyState(state: string): boolean {
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const secret = getSecret();
  const expected = crypto.createHmac("sha256", secret).update(`${nonce}.${ts}`).digest("hex");
  if (sig !== expected) return false;
  const age = Date.now() - parseInt(ts, 10);
  return age >= 0 && age < OAUTH_STATE_TTL_MS;
}

function safeRedirect(res: Response, url: string): void {
  const allowed = getAllowedRedirects();
  const u = new URL(url, "http://localhost");
  const targetOrigin = u.origin + u.pathname;
  const ok = allowed.some((a) => {
    const base = a.replace(/\/+$/, "");
    return targetOrigin === base || targetOrigin.startsWith(base + "/");
  });
  if (!ok) {
    logger.warn({ url, allowed }, "[OAuth] Redirect URL not in allowlist");
    res.redirect(getFrontendUrl() + "/login?error=invalid_redirect");
    return;
  }
  res.redirect(url);
}

function errorRedirect(res: Response, code: string, message?: string): void {
  const base = getFrontendUrl();
  const params = new URLSearchParams({ error: code });
  if (message) params.set("message", message);
  res.redirect(`${base}/login?${params.toString()}`);
}

async function findOrCreateOAuthUser(params: {
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}): Promise<WithId<UserDoc>> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");

  const byProvider = await users.findOne({
    oauthProviders: { $elemMatch: { provider: params.provider, providerUserId: params.providerUserId } },
  }) as WithId<UserDoc> | null;

  if (byProvider) {
    await grantFreeCreditsIfEligible(byProvider._id);
    return byProvider;
  }

  const emailNorm = params.email.trim().toLowerCase();
  const byEmail = await users.findOne({ email: emailNorm }) as WithId<UserDoc> | null;

  if (byEmail) {
    await users.updateOne(
      { _id: byEmail._id },
      {
        $set: {
          emailVerified: params.emailVerified || byEmail.emailVerified,
          "oauthProviders": [
            ...(byEmail.oauthProviders || []),
            { provider: params.provider, providerUserId: params.providerUserId },
          ],
        },
      }
    );
    const updated = await users.findOne({ _id: byEmail._id }) as WithId<UserDoc> | null;
    if (!updated) throw new Error("User not found after link");
    await grantFreeCreditsIfEligible(updated._id);
    return updated;
  }

  const createdAt = new Date();
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const insertResult = await users.insertOne({
    email: emailNorm,
    passwordHash,
    name: params.name.trim() || emailNorm.split("@")[0] || "User",
    emailVerified: params.emailVerified,
    oauthProviders: [{ provider: params.provider, providerUserId: params.providerUserId }],
    walletBalanceCredits: FREE_CREDITS,
    walletGrantedFreeCredits: true,
    walletUpdatedAt: createdAt,
    plan: "free",
    monthlyCreditsAllowance: PLAN_MONTHLY_ALLOWANCE.free,
    monthlyCreditsUsed: 0,
    billingCycleAnchor: createdAt,
    lowCreditsEmailSuppressed: false,
    createdAt,
  } as UserDoc);

  await writeWalletTransaction({
    userId: insertResult.insertedId,
    type: "grant",
    credits: FREE_CREDITS,
    meta: { reason: "New user signup bonus (OAuth)" },
  });

  const user = await users.findOne({ _id: insertResult.insertedId }) as WithId<UserDoc> | null;
  if (!user) throw new Error("Failed to load newly created user");
  return user;
}

router.get("/auth/google", (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      errorRedirect(res, "OAUTH_CONFIG", "Google OAuth not configured");
      return;
    }
    const state = generateState();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: OAUTH_STATE_TTL_MS / 1000,
      path: "/",
    });
    const redirect = (req.query.redirect as string | undefined)?.trim();
    const nextPath = (req.query.next as string | undefined)?.trim();
    let targetRedirect = redirect;
    if (!targetRedirect && nextPath) {
      const frontend = getFrontendUrl();
      const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
      targetRedirect = `${frontend}${path}`;
    }
    if (targetRedirect && getAllowedRedirects().some((a) => targetRedirect!.startsWith(a) || targetRedirect === a)) {
      res.cookie(OAUTH_REDIRECT_COOKIE, targetRedirect, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" && (process.env.CLIENT_URL || process.env.CORS_ORIGIN) ? "none" : "lax",
        maxAge: OAUTH_STATE_TTL_MS / 1000,
        path: "/",
      });
    }
    const { base: rawBase, source: baseSource } = getRedirectBaseWithSource();
    const base = getRedirectBase(); // normalized to origin only (fixes 400 malformed if base had path)
    const callbackUrl = `${base}/auth/google/callback`;
    const clientIdPrefix = clientId.length >= 10 ? clientId.slice(0, 10) + "..." : clientId ? "[set]" : "[empty]";
    logger.info(
      {
        redirectUrl: callbackUrl,
        base,
        baseSource,
        baseHadPath: rawBase !== base,
        clientIdPrefix,
        hasClientId: Boolean(clientId),
      },
      "[OAuth] GET /auth/google redirecting to Google"
    );
    const scope = "openid email profile";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  } catch (err) {
    logger.error({ err }, "[OAuth] Google init failed");
    errorRedirect(res, "OAUTH_ERROR");
  }
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];
    const redirectUrl = req.cookies?.[OAUTH_REDIRECT_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", httpOnly: true });
    res.clearCookie(OAUTH_REDIRECT_COOKIE, { path: "/", httpOnly: true });

    const hasCode = typeof code === "string";
    const hasState = typeof state === "string";
    const hasStoredState = Boolean(storedState);
    const defaultTarget = getFrontendUrl() + "/app/dashboard";
    const target = redirectUrl && getAllowedRedirects().some((a) => redirectUrl.startsWith(a)) ? redirectUrl : defaultTarget;
    logger.info(
      { hasCode, hasState, hasStoredState, error: error ?? null, redirectTarget: target },
      "[OAuth] GET /auth/google/callback received"
    );

    if (error) {
      logger.warn({ error }, "[OAuth] Google returned error");
      errorRedirect(res, "OAUTH_DENIED", String(error));
      return;
    }
    if (!storedState || !verifyState(storedState)) {
      errorRedirect(res, "OAUTH_STATE_INVALID");
      return;
    }
    if (state !== storedState) {
      errorRedirect(res, "OAUTH_STATE_MISMATCH");
      return;
    }
    if (typeof code !== "string") {
      errorRedirect(res, "OAUTH_NO_CODE");
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      errorRedirect(res, "OAUTH_CONFIG");
      return;
    }

    const base = getRedirectBase();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${base}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.warn({ status: tokenRes.status, err: errText }, "[OAuth] Google token exchange failed");
      errorRedirect(res, "OAUTH_TOKEN_FAILED");
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      errorRedirect(res, "OAUTH_NO_TOKEN");
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      errorRedirect(res, "OAUTH_USERINFO_FAILED");
      return;
    }

    const profile = (await userRes.json()) as { id?: string; email?: string; name?: string; verified_email?: boolean };
    const providerUserId = profile.id;
    const email = profile.email;
    const name = profile.name || "";
    const emailVerified = profile.verified_email === true;

    if (!providerUserId || !email) {
      errorRedirect(res, "OAUTH_INCOMPLETE_PROFILE");
      return;
    }

    const user = await findOrCreateOAuthUser({
      provider: "google",
      providerUserId,
      email,
      name,
      emailVerified,
    });

    await ensureAuthCollections();
    await createSessionAndSetCookie(user._id, res);

    logger.info({ redirectTarget: target }, "[OAuth] GET /auth/google/callback success, redirecting to frontend");
    safeRedirect(res, target);
  } catch (err) {
    logger.error({ err }, "[OAuth] Google callback failed");
    errorRedirect(res, "OAUTH_ERROR");
  }
});

router.get("/auth/github", (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    if (!clientId) {
      errorRedirect(res, "OAUTH_CONFIG", "GitHub OAuth not configured");
      return;
    }
    const state = generateState();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: OAUTH_STATE_TTL_MS / 1000,
      path: "/",
    });
    const redirect = (req.query.redirect as string | undefined)?.trim();
    const nextPath = (req.query.next as string | undefined)?.trim();
    let targetRedirect = redirect;
    if (!targetRedirect && nextPath) {
      const frontend = getFrontendUrl();
      const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
      targetRedirect = `${frontend}${path}`;
    }
    if (targetRedirect && getAllowedRedirects().some((a) => targetRedirect!.startsWith(a) || targetRedirect === a)) {
      res.cookie(OAUTH_REDIRECT_COOKIE, targetRedirect, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" && (process.env.CLIENT_URL || process.env.CORS_ORIGIN) ? "none" : "lax",
        maxAge: OAUTH_STATE_TTL_MS / 1000,
        path: "/",
      });
    }
    const base = getRedirectBase();
    const callbackUrl = `${base}/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  } catch (err) {
    logger.error({ err }, "[OAuth] GitHub init failed");
    errorRedirect(res, "OAUTH_ERROR");
  }
});

router.get("/auth/github/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];
    const redirectUrl = req.cookies?.[OAUTH_REDIRECT_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", httpOnly: true });
    res.clearCookie(OAUTH_REDIRECT_COOKIE, { path: "/", httpOnly: true });

    if (error) {
      logger.warn({ error }, "[OAuth] GitHub returned error");
      errorRedirect(res, "OAUTH_DENIED", String(error));
      return;
    }
    if (!storedState || !verifyState(storedState)) {
      errorRedirect(res, "OAUTH_STATE_INVALID");
      return;
    }
    if (state !== storedState) {
      errorRedirect(res, "OAUTH_STATE_MISMATCH");
      return;
    }
    if (typeof code !== "string") {
      errorRedirect(res, "OAUTH_NO_CODE");
      return;
    }

    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      errorRedirect(res, "OAUTH_CONFIG");
      return;
    }

    const base = getRedirectBase();
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${base}/auth/github/callback`,
      }),
    });

    if (!tokenRes.ok) {
      errorRedirect(res, "OAUTH_TOKEN_FAILED");
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      errorRedirect(res, "OAUTH_NO_TOKEN");
      return;
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      errorRedirect(res, "OAUTH_USERINFO_FAILED");
      return;
    }

    const profile = (await userRes.json()) as { id?: number; login?: string; name?: string; email?: string; avatar_url?: string };

    let email = profile.email;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (emailRes.ok) {
        const emails = (await emailRes.json()) as { email?: string; primary?: boolean; verified?: boolean }[];
        const primary = emails.find((e) => e.primary || e.verified);
        email = primary?.email || emails[0]?.email;
      }
    }

    const providerUserId = String(profile.id ?? profile.login ?? "");
    const name = profile.name || profile.login || "";

    if (!providerUserId || !email) {
      errorRedirect(res, "OAUTH_INCOMPLETE_PROFILE");
      return;
    }

    const user = await findOrCreateOAuthUser({
      provider: "github",
      providerUserId,
      email,
      name,
      emailVerified: true,
    });

    await ensureAuthCollections();
    await createSessionAndSetCookie(user._id, res);

    const target =
      redirectUrl && getAllowedRedirects().some((a) => redirectUrl.startsWith(a))
        ? redirectUrl
        : getFrontendUrl() + "/app/dashboard";
    safeRedirect(res, target);
  } catch (err) {
    logger.error({ err }, "[OAuth] GitHub callback failed");
    errorRedirect(res, "OAUTH_ERROR");
  }
});

export { router as oauthRouter };
