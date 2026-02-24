/**
 * Backfill wallet fields for existing users.
 * - Sets walletBalanceCredits to 0 if missing
 * - Sets walletGrantedFreeCredits to true if missing (DO NOT grant 500 retroactively)
 * Run: pnpm tsx server/scripts/backfillWallet.ts
 */

import "dotenv/config";
import { getDb } from "../db";

async function main() {
  const db = await getDb();
  const users = db.collection("users");

  const resultBalance = await users.updateMany(
    { walletBalanceCredits: { $exists: false } },
    { $set: { walletBalanceCredits: 0, walletUpdatedAt: new Date() } }
  );

  const resultGranted = await users.updateMany(
    { walletGrantedFreeCredits: { $exists: false } },
    { $set: { walletGrantedFreeCredits: true } }
  );

  console.log(
    `[BackfillWallet] walletBalanceCredits: ${resultBalance.modifiedCount} updated, walletGrantedFreeCredits: ${resultGranted.modifiedCount} updated`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
