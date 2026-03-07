/**
 * Enterprise SSO (SAML 2.0) - login via IdP (Okta, Azure AD, Google Workspace).
 * Routes: GET /auth/saml/login, POST /auth/saml/callback
 */

import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { createSessionAndSetCookie, ensureAuthCollections } from "./auth";
import { hashPassword } from "./utils/crypto";
import { FREE_CREDITS, grantFreeCreditsIfEligible, writeWalletTransaction } from "./wallet";
import { PLAN_MONTHLY_ALLOWANCE } from "./billing";
import { logger } from "./utils/logger";
import { normalizeEnvUrl, normalizeEnvUrlOrigin } from "./utils/envUrls";
import type { WorkspaceDoc } from "./workspaces/types";
import type { WorkspaceMemberDoc } from "./workspaces/types";

const router = Router();

const SAML_STATE_COOKIE = "saml_state";
const SAML_REDIRECT_COOKIE = "saml_redirect";
const SAML_STATE_TTL_MS = 10 * 60 * 1000;

interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  emailVerified?: boolean;
  oauthProviders?: { provider: string; providerUserId: string }[];
  samlProviders?: { provider: string; providerUserId: string }[];
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

function getRedirectBase(): string {
  const base = normalizeEnvUrlOrigin(process.env.OAUTH_REDIRECT_BASE_URL);
  if (base) return base;
  const frontend = normalizeEnvUrlOrigin(process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || process.env.APP_BASE_URL);
  if (frontend) return frontend;
  throw new Error("OAUTH_REDIRECT_BASE_URL or FRONTEND_APP_URL/CLIENT_URL/APP_BASE_URL required for SAML callbacks");
}

function getFrontendUrl(): string {
  const url = normalizeEnvUrl(process.env.FRONTEND_APP_URL || process.env.CLIENT_URL || process.env.APP_BASE_URL);
  if (!url) throw new Error("FRONTEND_APP_URL, CLIENT_URL, or APP_BASE_URL required");
  return url;
}

function getAllowedRedirects(): string[] {
  const url = getFrontendUrl();
  const extra = (process.env.OAUTH_ALLOWED_REDIRECTS || "").trim();
  const list = [url];
  if (extra) list.push(...extra.split(",").map((u) => normalizeEnvUrl(u)).filter(Boolean));
  return Array.from(new Set(list));
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
    logger.warn({ url, allowed }, "[SAML] Redirect URL not in allowlist");
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

async function findOrCreateSamlUser(
  params: {
    provider: string;
    providerUserId: string;
    email: string;
    name: string;
    emailVerified: boolean;
  },
  workspaceId: ObjectId,
  auditReq?: Request
): Promise<WithId<UserDoc>> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");

  const byProvider = await users.findOne({
    $or: [
      { oauthProviders: { $elemMatch: { provider: params.provider, providerUserId: params.providerUserId } } },
      { samlProviders: { $elemMatch: { provider: params.provider, providerUserId: params.providerUserId } } },
    ],
  }) as WithId<UserDoc> | null;

  if (byProvider) {
    await grantFreeCreditsIfEligible(byProvider._id);
    return byProvider;
  }

  const emailNorm = params.email.trim().toLowerCase();
  const byEmail = (await users.findOne({ email: emailNorm })) as WithId<UserDoc> | null;

  if (byEmail) {
    const samlProviders = [...(byEmail.samlProviders || []), { provider: params.provider, providerUserId: params.providerUserId }];
    await users.updateOne(
      { _id: byEmail._id },
      {
        $set: {
          emailVerified: params.emailVerified || byEmail.emailVerified,
          samlProviders,
        },
      }
    );
    const updated = (await users.findOne({ _id: byEmail._id })) as WithId<UserDoc> | null;
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
    samlProviders: [{ provider: params.provider, providerUserId: params.providerUserId }],
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
    meta: { reason: "New user signup bonus (SAML SSO)" },
  });

  const user = (await users.findOne({ _id: insertResult.insertedId })) as WithId<UserDoc> | null;
  if (!user) throw new Error("Failed to load newly created user");

  if (auditReq) {
    const { getAuditContext } = await import("./audit/auditContext");
    const { logAuditEvent } = await import("./audit/logAuditEvent");
    const { ip, userAgent } = getAuditContext(auditReq);
    logAuditEvent({
      ownerUserId: insertResult.insertedId,
      actorUserId: insertResult.insertedId,
      actorEmail: emailNorm,
      actionType: "auth.user.created",
      resourceType: "user",
      resourceId: insertResult.insertedId.toString(),
      metadata: { name: user.name, provider: params.provider },
      ip,
      userAgent,
      status: "success",
    });
  }

  return user;
}

async function addUserToWorkspace(userId: ObjectId, workspaceId: ObjectId, role: "viewer" | "developer" | "admin" = "viewer"): Promise<void> {
  const db = await getDb();
  const members = db.collection<WorkspaceMemberDoc>("workspace_members");
  const existing = await members.findOne({ workspaceId, userId });
  if (existing) return;
  await members.insertOne({
    workspaceId,
    userId,
    role,
    status: "active",
    createdAt: new Date(),
  });
}

/** Extract email and name from SAML profile. Common IdP attribute names. */
function extractSamlProfile(profile: Record<string, unknown>): { email: string; name: string } {
  const email =
    (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string) ||
    (profile["email"] as string) ||
    (profile["mail"] as string) ||
    (profile["urn:oid:0.9.2342.19200300.100.1.3"] as string) ||
    (Array.isArray(profile["email"]) ? profile["email"][0] : undefined) ||
    "";
  const name =
    (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string) ||
    (profile["displayName"] as string) ||
    (profile["name"] as string) ||
    (profile["cn"] as string) ||
    (profile["urn:oid:2.16.840.1.113730.3.1.241"] as string) ||
    (Array.isArray(profile["name"]) ? profile["name"][0] : undefined) ||
    (Array.isArray(profile["displayName"]) ? profile["displayName"][0] : undefined) ||
    email.split("@")[0] ||
    "User";
  return { email: String(email || "").trim(), name: String(name || "User").trim() };
}

router.get("/auth/saml/login", async (req, res) => {
  try {
    const workspaceIdRaw = (req.query.workspaceId as string)?.trim();
    if (!workspaceIdRaw || !ObjectId.isValid(workspaceIdRaw)) {
      errorRedirect(res, "SAML_CONFIG", "Workspace ID required. Use the SSO login link from your organization.");
      return;
    }

    const workspaceId = new ObjectId(workspaceIdRaw);
    const db = await getDb();
    const workspace = (await db.collection<WorkspaceDoc>("workspaces").findOne({ _id: workspaceId })) as WorkspaceDoc & { _id: ObjectId } | null;

    if (!workspace) {
      errorRedirect(res, "SAML_CONFIG", "Workspace not found");
      return;
    }

    const entryPoint = workspace.samlEntryPoint?.trim();
    const issuer = workspace.samlIssuer?.trim();
    const certificate = workspace.samlCertificate?.trim();

    if (!entryPoint || !issuer || !certificate) {
      errorRedirect(res, "SAML_CONFIG", "SAML is not configured for this workspace");
      return;
    }

    const base = getRedirectBase();
    const callbackUrl = `${base}/auth/saml/callback`;

    const redirect = (req.query.redirect as string)?.trim();
    const nextPath = (req.query.next as string)?.trim();
    let targetRedirect = redirect;
    if (!targetRedirect && nextPath) {
      const frontend = getFrontendUrl();
      const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
      targetRedirect = `${frontend}${path}`;
    }
    if (targetRedirect && getAllowedRedirects().some((a) => targetRedirect!.startsWith(a))) {
      res.cookie(SAML_REDIRECT_COOKIE, targetRedirect, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" && (process.env.CLIENT_URL || process.env.CORS_ORIGIN) ? "none" : "lax",
        maxAge: SAML_STATE_TTL_MS / 1000,
        path: "/",
      });
    }

    res.cookie(SAML_STATE_COOKIE, workspaceId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" && (process.env.CLIENT_URL || process.env.CORS_ORIGIN) ? "none" : "lax",
      maxAge: SAML_STATE_TTL_MS / 1000,
      path: "/",
    });

    const { SAML } = await import("passport-saml");
    const saml = new SAML({
      entryPoint,
      issuer,
      cert: certificate,
      callbackUrl,
    });

    const host = req.headers?.host ?? "localhost";
    const relayState = (req.query.relayState as string) ?? "";
    const authUrl = await saml.getAuthorizeUrlAsync(relayState, host, {});

    logger.info({ workspaceId: workspaceIdRaw }, "[SAML] Redirecting to IdP");
    res.redirect(authUrl);
  } catch (err) {
    logger.error({ err }, "[SAML] Login init failed");
    errorRedirect(res, "SAML_ERROR", "SAML login failed");
  }
});

router.post("/auth/saml/callback", async (req, res) => {
  try {
    const workspaceIdRaw = req.cookies?.[SAML_STATE_COOKIE];
    const redirectUrl = req.cookies?.[SAML_REDIRECT_COOKIE];
    res.clearCookie(SAML_STATE_COOKIE, { path: "/", httpOnly: true });
    res.clearCookie(SAML_REDIRECT_COOKIE, { path: "/", httpOnly: true });

    if (!workspaceIdRaw || !ObjectId.isValid(workspaceIdRaw)) {
      errorRedirect(res, "SAML_STATE_INVALID", "Session expired. Please try again.");
      return;
    }

    const workspaceId = new ObjectId(workspaceIdRaw);
    const db = await getDb();
    const workspace = (await db.collection<WorkspaceDoc>("workspaces").findOne({ _id: workspaceId })) as (WorkspaceDoc & { _id: ObjectId }) | null;

    if (!workspace) {
      errorRedirect(res, "SAML_CONFIG", "Workspace not found");
      return;
    }

    const entryPoint = workspace.samlEntryPoint?.trim();
    const issuer = workspace.samlIssuer?.trim();
    const certificate = workspace.samlCertificate?.trim();

    if (!entryPoint || !issuer || !certificate) {
      errorRedirect(res, "SAML_CONFIG", "SAML is not configured");
      return;
    }

    const base = getRedirectBase();
    const callbackUrl = `${base}/auth/saml/callback`;

    const samlResponse = (req.body as { SAMLResponse?: string }).SAMLResponse;
    if (!samlResponse || typeof samlResponse !== "string") {
      errorRedirect(res, "SAML_NO_RESPONSE", "No SAML response received");
      return;
    }

    const { SAML } = await import("passport-saml");
    const saml = new SAML({
      entryPoint,
      issuer,
      cert: certificate,
      callbackUrl,
    });

    const result = await saml.validatePostResponseAsync(req.body as { SAMLResponse: string; RelayState?: string });
    const profile = (result?.profile || {}) as Record<string, unknown>;

    const nameId = (profile.nameID || profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || profile.nameId) as string;
    const providerUserId = typeof nameId === "string" ? nameId : String(nameId || "");

    if (!providerUserId) {
      errorRedirect(res, "SAML_INCOMPLETE_PROFILE", "IdP did not provide user identifier");
      return;
    }

    const { email, name } = extractSamlProfile(profile);
    if (!email) {
      errorRedirect(res, "SAML_INCOMPLETE_PROFILE", "IdP did not provide email");
      return;
    }

    const user = await findOrCreateSamlUser(
      {
        provider: `saml:${workspaceId.toString()}`,
        providerUserId,
        email,
        name,
        emailVerified: true,
      },
      workspaceId,
      req
    );

    await addUserToWorkspace(user._id, workspaceId);
    await ensureAuthCollections();
    await createSessionAndSetCookie(user._id, res);

    const target = redirectUrl && getAllowedRedirects().some((a) => redirectUrl.startsWith(a)) ? redirectUrl : getFrontendUrl() + "/app/dashboard";
    logger.info({ workspaceId: workspaceIdRaw, userId: user._id.toString() }, "[SAML] Login success");
    safeRedirect(res, target);
  } catch (err) {
    logger.error({ err }, "[SAML] Callback failed");
    errorRedirect(res, "SAML_ERROR", "SAML authentication failed");
  }
});

export { router as samlRouter };
