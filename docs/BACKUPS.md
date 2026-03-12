# Database Backups & Recovery

This document describes how to back up and restore the ALEXZA AI MongoDB database using the provided scripts.

## Overview

Production data is stored in MongoDB. To protect against data loss, you should take regular backups of key collections and store them in durable storage (local disk + cloud).

Two scripts are provided:

- `scripts/backup-db.ts` – exports important collections to JSON files.
- `scripts/restore-db.ts` – restores collections from those JSON files.

Both scripts use the existing MongoDB configuration (`MONGODB_URI`, `MONGODB_DB`) and the shared `pino` logger.

## Backed-up collections

The backup script exports the following collections:

- `users`
- `projects`
- `project_actions` (saved as `actions.json`)
- `workflows`
- `agents`
- `wallet_transactions`
- `marketplace_templates`
- `agent_marketplace`
- `workflow_marketplace`
- `apps`
- `webhook_deliveries`
- `usage_logs`
- `audit_logs`

This covers core entities (users, projects, actions, workflows, agents), marketplace data, wallet transactions, webhooks, and operational logs.

## Running a backup

### Prerequisites

- `MONGODB_URI` and `MONGODB_DB` set in the environment (or `.env/.env.local`).
- Node + pnpm available in the environment.

### Basic backup (local directory)

From the repository root:

```bash
pnpm exec tsx scripts/backup-db.ts
```

By default this will:

- Create a `backups/` directory in the project root (if it does not exist).
- Create a timestamped subdirectory, e.g. `backups/2026-03-11T12-00-00-000Z/`.
- Write one JSON file per collection, e.g.:
  - `users.json`
  - `projects.json`
  - `actions.json`
  - `workflows.json`
  - …

You can override the backup root directory:

```bash
BACKUP_DIR=/var/backups/alexza pnpm exec tsx scripts/backup-db.ts
```

### Optional: cloud backup

The backup script supports an optional upload step via a shell command so you can integrate with any cloud storage provider (S3, GCS, Azure, etc.).

Set one of:

- `DB_BACKUP_UPLOAD_COMMAND`
- `BACKUP_UPLOAD_COMMAND`

The command may include a `{dir}` placeholder, which will be replaced with the absolute path of the generated backup directory.

Examples:

```bash
# Upload to S3 using AWS CLI
DB_BACKUP_UPLOAD_COMMAND='aws s3 sync {dir} s3://my-bucket/alexza-backups' \
  pnpm exec tsx scripts/backup-db.ts

# Use rclone to push to a remote
BACKUP_UPLOAD_COMMAND='rclone sync {dir} remote:alexza-backups' \
  pnpm exec tsx scripts/backup-db.ts
```

If the upload command fails, the local backup still completes and the error is logged via `pino`.

## Running a restore

> **Warning:** Restoring will delete all documents in the target collections and then insert the backed-up documents. Only run this against the correct environment and typically when the application is stopped or in maintenance mode.

### Choosing a backup

Identify the backup directory you want to restore from, e.g.:

- `./backups/2026-03-11T12-00-00-000Z`

### Restore command

From the repository root:

```bash
pnpm exec tsx scripts/restore-db.ts --dir ./backups/2026-03-11T12-00-00-000Z
```

The restore script will:

- Read `<collection-id>.json` files from the specified directory (e.g. `users.json`, `projects.json`, etc.).
- For each existing file:
  - Delete all documents from the corresponding MongoDB collection.
  - Insert all documents from the JSON file.
- Log progress and any errors via `pino`.

If a particular JSON file is missing, that collection is skipped and a warning is logged.

## Cron / automation

The backup script is designed to be run from a daily cron job or scheduled task.

Example (Linux `crontab`):

```cron
0 2 * * * cd /opt/alexza-ai && \
  /usr/bin/env BACKUP_DIR=/var/backups/alexza \
  /usr/bin/pnpm exec tsx scripts/backup-db.ts >> /var/log/alexza-backups.log 2>&1
```

Recommendations:

- Run the backup once per day during a low-traffic window (e.g. 02:00).
- Store backups on a separate disk or network-mounted volume.
- Configure a cloud upload command to push backups offsite.

## Recommended backup schedule & retention

Suggested baseline for production:

- **Full backup**: Once per day using `scripts/backup-db.ts`.
- **Retention**:
  - Keep daily backups for the last 7–14 days.
  - Keep weekly backups for the last 4–8 weeks.
  - Optionally keep monthly snapshots for long-term archives.
- **Offsite copies**:
  - Use `DB_BACKUP_UPLOAD_COMMAND` / `BACKUP_UPLOAD_COMMAND` to sync backups to cloud storage.

For critical environments, you may also:

- Run an additional backup before major schema migrations or deployments.
- Periodically test the restore procedure in a staging environment to verify that backups are valid and complete.

## Safety guidelines

- Always confirm you are pointing at the correct MongoDB instance (production vs staging) before running restore.
- Prefer performing restores in a staging environment first to validate.
- During a production restore, place the app in maintenance mode or stop traffic to avoid race conditions between live writes and the restore.
- Monitor logs for `"[Backup]"` and `"[Restore]"` entries to verify success or diagnose issues.

