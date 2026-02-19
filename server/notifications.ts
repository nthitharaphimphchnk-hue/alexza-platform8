import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { getDb } from "./db";
import { getSessionCookieName, hashSessionToken } from "./utils/crypto";

interface UserNotificationDoc {
  email?: string;
  walletBalanceCredits?: number;
  lowCreditsEmailLastSentAt?: Date;
  lowCreditsEmailSuppressed?: boolean;
  lowCreditsEmailLastBalance?: number;
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.client = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.client.emails.send({
      from: this.fromEmail,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}

const router = Router();

const LOW_CREDITS_EMAIL_THRESHOLD = (() => {
  const parsed = Number.parseInt(process.env.LOW_CREDITS_THRESHOLD_EMAIL ?? "100", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
})();
const BASE_URL = (process.env.BASE_URL || "https://alexza-platform8.onrender.com").replace(/\/+$/, "");
const LOW_CREDITS_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface SessionDoc {
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

function canUseAdminEndpoint(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  if (!configuredAdminKey || configuredAdminKey.trim().length === 0) return false;
  const rawHeader = req.headers["x-admin-key"];
  const providedAdminKey = typeof rawHeader === "string" ? rawHeader.trim() : "";
  return providedAdminKey.length > 0 && providedAdminKey === configuredAdminKey;
}

function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const fromEmail = process.env.EMAIL_FROM?.trim() || "";
  if (!apiKey || !fromEmail) {
    throw new Error("Email provider is not configured. Missing RESEND_API_KEY or EMAIL_FROM");
  }
  return new ResendEmailProvider(apiKey, fromEmail);
}

function buildLowCreditsEmail(balanceCredits: number) {
  const walletUrl = `${BASE_URL}/app/billing/credits`;
  const settingsUrl = `${BASE_URL}/app/settings`;
  const subject = `Low credits alert: ${balanceCredits.toLocaleString()} left`;
  const text = [
    "Your credits are running low.",
    "",
    `Current balance: ${balanceCredits.toLocaleString()} credits`,
    `Low-credit threshold: ${LOW_CREDITS_EMAIL_THRESHOLD.toLocaleString()} credits`,
    "",
    `Top up now: ${walletUrl}`,
    `Notification settings: ${settingsUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">Credits running low</h2>
      <p style="margin-top: 0;">You currently have <strong>${balanceCredits.toLocaleString()}</strong> credits left.</p>
      <p>Top up now to avoid service interruption.</p>
      <p><a href="${walletUrl}">Open Wallet</a></p>
      <p style="font-size: 12px; color: #6b7280;">Manage notifications in <a href="${settingsUrl}">Settings</a>.</p>
    </div>
  `;
  return { subject, text, html };
}

function shouldSendLowCreditsEmail(user: UserNotificationDoc, now: Date): boolean {
  const balance = typeof user.walletBalanceCredits === "number" ? user.walletBalanceCredits : 0;
  if (balance <= 0 || balance >= LOW_CREDITS_EMAIL_THRESHOLD) return false;
  if (user.lowCreditsEmailSuppressed === true) return false;

  const lastSentAt =
    user.lowCreditsEmailLastSentAt instanceof Date && !Number.isNaN(user.lowCreditsEmailLastSentAt.getTime())
      ? user.lowCreditsEmailLastSentAt
      : null;
  const lastBalance =
    typeof user.lowCreditsEmailLastBalance === "number" ? user.lowCreditsEmailLastBalance : null;

  const fellFromHealthy = lastBalance !== null && lastBalance >= LOW_CREDITS_EMAIL_THRESHOLD;
  const noPreviousSend = lastSentAt === null;
  const isNewLowCreditsEpisode = noPreviousSend || fellFromHealthy;
  if (!isNewLowCreditsEpisode) return false;

  const withinCooldown = lastSentAt !== null && now.getTime() - lastSentAt.getTime() < LOW_CREDITS_EMAIL_COOLDOWN_MS;
  if (withinCooldown) return false;
  return true;
}

async function sendLowCreditsEmailForUser(
  userId: ObjectId,
  options?: { toOverride?: string }
): Promise<{ sent: boolean; skippedReason?: string; balance?: number }> {
  const db = await getDb();
  const users = db.collection<UserNotificationDoc>("users");
  const now = new Date();
  const user = await users.findOne({ _id: userId });
  if (!user) return { sent: false, skippedReason: "USER_NOT_FOUND" };

  const balance = typeof user.walletBalanceCredits === "number" ? user.walletBalanceCredits : 0;
  const to = options?.toOverride?.trim() || user.email?.trim() || "";
  if (!to) return { sent: false, skippedReason: "MISSING_RECIPIENT", balance };
  if (user.lowCreditsEmailSuppressed === true) return { sent: false, skippedReason: "SUPPRESSED", balance };

  const shouldSend = shouldSendLowCreditsEmail(user, now);
  if (!shouldSend) {
    await users.updateOne({ _id: userId }, { $set: { lowCreditsEmailLastBalance: balance } });
    return { sent: false, skippedReason: "RULES_NOT_MET", balance };
  }

  const emailProvider = getEmailProvider();
  const email = buildLowCreditsEmail(balance);
  await emailProvider.send({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        lowCreditsEmailLastSentAt: now,
        lowCreditsEmailLastBalance: balance,
      },
    }
  );
  console.log(`[NotifyLowCredits] userId=${userId.toString()} balance=${balance} sentAt=${now.toISOString()}`);
  return { sent: true, balance };
}

async function resolveAuthenticatedUserId(req: Request): Promise<ObjectId | null> {
  const token = req.cookies?.[getSessionCookieName()];
  if (!token || typeof token !== "string") return null;
  const db = await getDb();
  const sessions = db.collection<SessionDoc>("sessions");
  const session = await sessions.findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  });
  return session?.userId ?? null;
}

export async function runLowCreditsEmailMigration() {
  const db = await getDb();
  const users = db.collection<UserNotificationDoc>("users");
  await users.updateMany(
    { lowCreditsEmailSuppressed: { $exists: false } },
    { $set: { lowCreditsEmailSuppressed: false } }
  );
}

router.post("/admin/notifications/test-low-credits", async (req, res, next) => {
  try {
    if (!canUseAdminEndpoint(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const body = req.body as { userId?: unknown; to?: unknown };
    const rawUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const toOverride = typeof body.to === "string" ? body.to.trim() : "";
    const sessionUserId = await resolveAuthenticatedUserId(req);
    const userId =
      rawUserId && ObjectId.isValid(rawUserId)
        ? new ObjectId(rawUserId)
        : sessionUserId;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "userId is required when no authenticated session user is available",
      });
    }

    const result = await sendLowCreditsEmailForUser(userId, { toOverride: toOverride || undefined });
    return res.json({
      ok: true,
      userId: userId.toString(),
      ...result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/notifications/cron/low-credits-scan", async (req, res, next) => {
  try {
    if (!canUseAdminEndpoint(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }
    const db = await getDb();
    const users = db.collection<UserNotificationDoc>("users");
    const candidates = await users
      .find({
        email: { $exists: true, $ne: "" },
        walletBalanceCredits: { $lt: LOW_CREDITS_EMAIL_THRESHOLD, $gt: 0 },
      })
      .project({ _id: 1 })
      .toArray();

    let sent = 0;
    let skipped = 0;
    for (const candidate of candidates) {
      try {
        const result = await sendLowCreditsEmailForUser(candidate._id);
        if (result.sent) sent += 1;
        else skipped += 1;
      } catch {
        skipped += 1;
      }
    }

    return res.json({
      ok: true,
      scanned: candidates.length,
      sent,
      skipped,
    });
  } catch (error) {
    return next(error);
  }
});

export { router as notificationsRouter };
