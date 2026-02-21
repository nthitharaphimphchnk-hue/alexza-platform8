import bcrypt from "bcrypt";
import crypto from "crypto";
import type { CookieOptions } from "express";

const DEFAULT_COOKIE_NAME = "alexza_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET (or legacy JWT_SECRET)");
  }
  return secret;
}

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || process.env.COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

export function getSessionTtlMs(): number {
  return SESSION_TTL_MS;
}

export function getSessionCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const isCrossOrigin =
    Boolean(process.env.CLIENT_URL?.trim()) || Boolean(process.env.CORS_ORIGIN?.trim());

  return {
    httpOnly: true,
    sameSite: isCrossOrigin ? "none" : "lax",
    secure: isProduction || isCrossOrigin,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

export function getSessionClearCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...clearOptions } = getSessionCookieOptions();
  return clearOptions;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(token).digest("hex");
  return crypto.createHash("sha256").update(hmac).digest("hex");
}
