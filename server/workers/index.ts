/**
 * Worker processes - start all BullMQ workers.
 * Run with: pnpm run workers
 * Requires REDIS_URL to be set.
 */

import "../sentry";
import { startAiRunnerWorker } from "./ai-runner";
import { startWebhookWorker } from "./webhook-worker";
import { startWorkflowWorker } from "./workflow-worker";
import { startEmailWorker } from "./email-worker";
import { startAlertWorker } from "./alert-worker";
import { isQueueEnabled } from "../queue/config";
import { logger } from "../utils/logger";

async function main() {
  if (!isQueueEnabled()) {
    logger.error("REDIS_URL is not set. Workers require Redis. Exiting.");
    process.exit(1);
  }

  logger.info("[Workers] Starting all workers...");

  const workers = [
    startAiRunnerWorker(),
    startWebhookWorker(),
    startWorkflowWorker(),
    startEmailWorker(),
  ].filter(Boolean);

  const alertWorker = startAlertWorker();
  if (alertWorker) {
    workers.push(alertWorker);
  }

  const shutdown = async () => {
    logger.info("[Workers] Shutting down...");
    await Promise.all(workers.map((w) => w!.close()));
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  logger.info("[Workers] All workers started");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "[Workers] Fatal error");
  process.exit(1);
});
