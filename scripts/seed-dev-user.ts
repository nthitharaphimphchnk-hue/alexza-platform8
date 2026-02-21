/**
 * Dev-only: seed a user from DEV_SEED_EMAIL / DEV_SEED_PASSWORD.
 * Only runs when NODE_ENV !== "production".
 * Usage: pnpm exec tsx scripts/seed-dev-user.ts
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("[seed-dev-user] Skipped: NODE_ENV=production");
    process.exit(1);
  }

  const email = (process.env.DEV_SEED_EMAIL || "").trim().toLowerCase();
  const password = (process.env.DEV_SEED_PASSWORD || "").trim();

  if (!email || !password) {
    console.error("[seed-dev-user] Set DEV_SEED_EMAIL and DEV_SEED_PASSWORD in .env.local");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("[seed-dev-user] DEV_SEED_PASSWORD must be at least 8 characters");
    process.exit(1);
  }

  const { getDb } = await import("../server/db");
  const { hashPassword } = await import("../server/utils/crypto");
  const { maskEmail } = await import("../server/utils/sanitize");
  const { createCreditTransaction, FREE_TRIAL_CREDITS } = await import("../server/credits");
  const { PLAN_MONTHLY_ALLOWANCE } = await import("../server/billing");

  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne({ email });
  if (existing) {
    console.log(`[seed-dev-user] User already exists: ${maskEmail(email)}`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  const createdAt = new Date();
  const insertResult = await users.insertOne({
    email,
    passwordHash,
    name: "Dev User",
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
      reason: "Dev seed signup credits",
    });
  } catch (e) {
    await users.deleteOne({ _id: insertResult.insertedId });
    throw e;
  }

  console.log(`[seed-dev-user] Created: ${maskEmail(email)}`);
}

main().catch((err) => {
  console.error("[seed-dev-user]", err);
  process.exit(1);
});
