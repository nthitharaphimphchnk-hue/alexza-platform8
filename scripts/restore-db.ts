/**
 * Database Restore Script
 *
 * Restores MongoDB collections from JSON backup files created by scripts/backup-db.ts.
 *
 * WARNING: This script will overwrite data in the target collections (delete + insert).
 *
 * Usage:
 *   # Restore from the most recent backup in BACKUP_DIR (manual selection recommended)
 *   pnpm exec tsx scripts/restore-db.ts --dir ./backups/2025-01-01T00-00-00-000Z
 *
 *   # With explicit backup root (if using a custom path)
 *   BACKUP_DIR=./backups pnpm exec tsx scripts/restore-db.ts --dir ./backups/2025-01-01T00-00-00-000Z
 */

import fs from "fs";
import path from "path";
import { getDb } from "../server/db";
import { logger } from "../server/utils/logger";

interface CollectionConfig {
  id: string;
  mongoName: string;
}

const COLLECTIONS: CollectionConfig[] = [
  { id: "users", mongoName: "users" },
  { id: "projects", mongoName: "projects" },
  { id: "actions", mongoName: "project_actions" },
  { id: "workflows", mongoName: "workflows" },
  { id: "agents", mongoName: "agents" },
  { id: "wallet_transactions", mongoName: "wallet_transactions" },
  { id: "marketplace_templates", mongoName: "marketplace_templates" },
  { id: "agent_marketplace", mongoName: "agent_marketplace" },
  { id: "workflow_marketplace", mongoName: "workflow_marketplace" },
  { id: "apps", mongoName: "apps" },
  { id: "webhook_deliveries", mongoName: "webhook_deliveries" },
  { id: "usage_logs", mongoName: "usage_logs" },
  { id: "audit_logs", mongoName: "audit_logs" },
];

function parseArgs(): { dir: string } {
  const argv = process.argv.slice(2);
  let dir = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" && i + 1 < argv.length) {
      dir = argv[i + 1];
      i++;
    }
  }

  if (!dir) {
    throw new Error(
      "Missing --dir argument. Example: pnpm exec tsx scripts/restore-db.ts --dir ./backups/2025-01-01T00-00-00-000Z"
    );
  }

  const resolved = path.resolve(process.cwd(), dir);
  return { dir: resolved };
}

async function restoreCollection(
  backupDir: string,
  cfg: CollectionConfig
): Promise<void> {
  const filePath = path.join(backupDir, `${cfg.id}.json`);

  if (!fs.existsSync(filePath)) {
    logger.warn(
      { collection: cfg.mongoName, id: cfg.id, filePath },
      "[Restore] Backup file missing, skipping collection"
    );
    return;
  }

  const raw = await fs.promises.readFile(filePath, "utf8");
  let docs: unknown;
  try {
    docs = JSON.parse(raw);
  } catch (err) {
    logger.error(
      { collection: cfg.mongoName, id: cfg.id, filePath, err },
      "[Restore] Failed to parse JSON"
    );
    return;
  }

  if (!Array.isArray(docs)) {
    logger.error(
      { collection: cfg.mongoName, id: cfg.id, filePath },
      "[Restore] Backup file does not contain an array"
    );
    return;
  }

  const db = await getDb();
  const col = db.collection(cfg.mongoName);

  logger.info(
    { collection: cfg.mongoName, id: cfg.id, filePath, count: docs.length },
    "[Restore] Restoring collection (delete + insert)"
  );

  await col.deleteMany({});

  if (docs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await col.insertMany(docs as any[]);
  }

  logger.info(
    { collection: cfg.mongoName, id: cfg.id, count: docs.length },
    "[Restore] Collection restored"
  );
}

async function main() {
  const { dir } = parseArgs();

  logger.info({ dir }, "[Restore] Starting database restore");

  for (const cfg of COLLECTIONS) {
    try {
      await restoreCollection(dir, cfg);
    } catch (err) {
      logger.error(
        { collection: cfg.mongoName, id: cfg.id, err },
        "[Restore] Failed to restore collection"
      );
      // Continue with other collections
    }
  }

  logger.info({ dir }, "[Restore] Restore completed");
}

main().catch((err) => {
  logger.error({ err }, "[Restore] Restore failed");
  process.exit(1);
});

