/**
 * Database Backup Script
 *
 * Exports key MongoDB collections to JSON files in a timestamped directory.
 *
 * Usage:
 *   # Local backup (default ./backups)
 *   pnpm exec tsx scripts/backup-db.ts
 *
 *   # Custom backup root directory
 *   BACKUP_DIR=./my-backups pnpm exec tsx scripts/backup-db.ts
 *
 *   # Optional: trigger cloud upload using a custom command
 *   DB_BACKUP_UPLOAD_COMMAND="aws s3 sync {dir} s3://my-bucket/alexza-backups" pnpm exec tsx scripts/backup-db.ts
 */

import fs from "fs";
import path from "path";
import { getDb } from "../server/db";
import { logger } from "../server/utils/logger";
import { exec } from "child_process";

interface CollectionConfig {
  id: string;
  mongoName: string;
}

const COLLECTIONS: CollectionConfig[] = [
  { id: "users", mongoName: "users" },
  { id: "projects", mongoName: "projects" },
  // Project actions (API specs)
  { id: "actions", mongoName: "project_actions" },
  { id: "workflows", mongoName: "workflows" },
  { id: "agents", mongoName: "agents" },
  // Wallet transactions and balance state (wallet fields also live on users)
  { id: "wallet_transactions", mongoName: "wallet_transactions" },
  // Marketplace-related collections
  { id: "marketplace_templates", mongoName: "marketplace_templates" },
  { id: "agent_marketplace", mongoName: "agent_marketplace" },
  { id: "workflow_marketplace", mongoName: "workflow_marketplace" },
  { id: "apps", mongoName: "apps" },
  // Webhook deliveries (history + retry state)
  { id: "webhook_deliveries", mongoName: "webhook_deliveries" },
  // Usage and audit logs
  { id: "usage_logs", mongoName: "usage_logs" },
  { id: "audit_logs", mongoName: "audit_logs" },
];

function getBackupRootDir(): string {
  const dir =
    process.env.BACKUP_DIR?.trim() ||
    process.env.DB_BACKUP_DIR?.trim() ||
    path.resolve(process.cwd(), "backups");
  return dir;
}

function getTimestampDirName(): string {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, "-");
  return iso;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function backupCollections(backupDir: string): Promise<void> {
  const db = await getDb();

  for (const cfg of COLLECTIONS) {
    try {
      const col = db.collection(cfg.mongoName);
      const docs = await col.find({}).toArray();
      const filePath = path.join(backupDir, `${cfg.id}.json`);

      // ObjectId and Date have sensible toJSON implementations in the MongoDB driver.
      const json = JSON.stringify(docs, null, 2);
      await fs.promises.writeFile(filePath, json, "utf8");

      logger.info(
        { collection: cfg.mongoName, id: cfg.id, count: docs.length, filePath },
        "[Backup] Collection exported"
      );
    } catch (err) {
      logger.error(
        { collection: cfg.mongoName, id: cfg.id, err },
        "[Backup] Failed to export collection"
      );
      // Continue with other collections instead of aborting whole backup
    }
  }
}

function runUploadCommand(backupDir: string): Promise<void> {
  const cmd =
    process.env.DB_BACKUP_UPLOAD_COMMAND?.trim() ||
    process.env.BACKUP_UPLOAD_COMMAND?.trim();

  if (!cmd) {
    return Promise.resolve();
  }

  const rendered = cmd.replace("{dir}", backupDir);
  logger.info({ cmd: rendered }, "[Backup] Running upload command");

  return new Promise((resolve) => {
    exec(rendered, (error, stdout, stderr) => {
      if (stdout) {
        logger.info({ stdout }, "[Backup] Upload stdout");
      }
      if (stderr) {
        logger.warn({ stderr }, "[Backup] Upload stderr");
      }
      if (error) {
        logger.error({ err: error }, "[Backup] Upload command failed");
      } else {
        logger.info("[Backup] Upload command completed");
      }
      resolve();
    });
  });
}

async function main() {
  const rootDir = getBackupRootDir();
  const timestamp = getTimestampDirName();
  const backupDir = path.join(rootDir, timestamp);

  logger.info({ rootDir, backupDir }, "[Backup] Starting database backup");

  await ensureDir(backupDir);
  await backupCollections(backupDir);
  await runUploadCommand(backupDir);

  logger.info({ backupDir }, "[Backup] Backup completed");
}

main().catch((err) => {
  logger.error({ err }, "[Backup] Backup failed");
  process.exit(1);
});

