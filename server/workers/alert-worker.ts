/**
 * Alert worker - periodic checks for production alerting.
 * Runs as part of the workers process (BullMQ-based) and evaluates alert rules.
 */

import { Queue, Worker } from "bullmq";
import { queueConfig, isQueueEnabled } from "../queue/config";
import { getDb } from "../db";
import { logger } from "../utils/logger";

const ALERT_QUEUE_NAME = "alerts";

export interface AlertJobData {
  type: "evaluate_alerts";
}

export function getAlertQueue(): Queue<AlertJobData> {
  return new Queue<AlertJobData>(ALERT_QUEUE_NAME, {
    connection: queueConfig.connection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
      attempts: 1,
    },
  });
}

async function sendAlert(message: string): Promise<void> {
  const slackUrl = process.env.ALERT_SLACK_WEBHOOK_URL?.trim() || "";
  const discordUrl = process.env.ALERT_DISCORD_WEBHOOK_URL?.trim() || "";
  const emailTo = process.env.ALERT_EMAIL_TO?.trim() || "";

  const tasks: Promise<void>[] = [];

  if (slackUrl) {
    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      }).then(
        () => {},
        (err) => {
          logger.error({ err: String(err) }, "[Alerts] Slack webhook failed");
        }
      )
    );
  }

  if (discordUrl) {
    tasks.push(
      fetch(discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      }).then(
        () => {},
        (err) => {
          logger.error({ err: String(err) }, "[Alerts] Discord webhook failed");
        }
      )
    );
  }

  if (emailTo) {
    tasks.push(
      (async () => {
        try {
          const { getEmailProvider } = await import("../notifications");
          const emailProvider = getEmailProvider();
          await emailProvider.send({
            to: emailTo,
            subject: "[ALEXZA] Production alert",
            text: message,
            html: `<pre>${message}</pre>`,
          });
        } catch (err) {
          logger.error({ err: String(err) }, "[Alerts] Email alert failed");
        }
      })()
    );
  }

  if (tasks.length === 0) {
    logger.warn("[Alerts] No alert destinations configured");
    return;
  }

  await Promise.all(tasks);
}

async function evaluateAlerts(): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const [
    requestsLastMin,
    errorsLast5m,
    webhookFailuresLast15m,
    slowRequestsLast5m,
    aiRunErrorsLast5m,
    healthOk,
  ] = await Promise.all([
    db
      .collection("usage_logs")
      .countDocuments({ createdAt: { $gte: oneMinuteAgo, $lte: now } })
      .catch(() => 0),
    db
      .collection("errors")
      .countDocuments({ createdAt: { $gte: fiveMinutesAgo, $lte: now } })
      .catch(() => 0),
    db
      .collection("webhook_deliveries")
      .countDocuments({
        status: "failed",
        updatedAt: { $gte: fifteenMinutesAgo, $lte: now },
      })
      .catch(() => 0),
    db
      .collection("usage_logs")
      .countDocuments({
        createdAt: { $gte: fiveMinutesAgo, $lte: now },
        latencyMs: { $gte: 2000 },
      })
      .catch(() => 0),
    db
      .collection("run_logs")
      .countDocuments({
        createdAt: { $gte: fiveMinutesAgo, $lte: now },
        status: { $in: ["error", "failed_insufficient_credits"] },
      })
      .catch(() => 0),
    (async () => {
      try {
        const base =
          process.env.READINESS_BASE_URL?.trim() ||
          process.env.CLIENT_URL?.trim() ||
          "";
        if (!base) return false;
        const res = await fetch(`${base}/api/health`);
        return res.ok;
      } catch {
        return false;
      }
    })(),
  ]);

  const messages: string[] = [];

  // High error rate (relative to traffic, basic heuristic).
  if (errorsLast5m >= 20) {
    messages.push(
      `High error volume detected: ${errorsLast5m} errors in last 5 minutes.`
    );
  }

  // Webhook failures.
  if (webhookFailuresLast15m >= 10) {
    messages.push(
      `Webhook failures detected: ${webhookFailuresLast15m} failed deliveries in last 15 minutes.`
    );
  }

  // Slow request spikes.
  if (slowRequestsLast5m >= 50) {
    messages.push(
      `Slow request spike: ${slowRequestsLast5m} requests > 2000ms in last 5 minutes.`
    );
  }

  // AI run failures.
  if (aiRunErrorsLast5m >= 10) {
    messages.push(
      `AI run failures: ${aiRunErrorsLast5m} failed or insufficient-credit runs in last 5 minutes.`
    );
  }

  // System health endpoint failures.
  if (!healthOk) {
    messages.push("System health check failed: /api/health is not returning ok.");
  }

  if (messages.length === 0) {
    return;
  }

  const header = `[ALEXZA Alerts] ${now.toISOString()}`;
  const body = messages.join("\n");
  const full = `${header}\n${body}`;

  logger.warn({ alerts: messages }, "[Alerts] Triggering production alerts");
  await sendAlert(full);
}

export function startAlertWorker(): Worker<AlertJobData> | null {
  if (!isQueueEnabled()) {
    logger.warn("[Alerts] Queue not enabled; alert worker disabled");
    return null;
  }

  const queue = getAlertQueue();

  // Seed a repeating job every minute.
  queue
    .add(
      "evaluate_alerts",
      { type: "evaluate_alerts" },
      {
        repeat: { every: 60_000 },
        jobId: "evaluate_alerts",
      }
    )
    .catch((err) => {
      logger.error({ err: String(err) }, "[Alerts] Failed to schedule repeating job");
    });

  const worker = new Worker<AlertJobData>(
    ALERT_QUEUE_NAME,
    async (job) => {
      if (job.data.type === "evaluate_alerts") {
        await evaluateAlerts();
      }
    },
    {
      connection: queueConfig.connection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(
      { jobId: job.id, type: job.data.type },
      "[Alerts] Evaluation job completed"
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, type: job?.data?.type, err: String(err) },
      "[Alerts] Evaluation job failed"
    );
  });

  logger.info("[Alerts] Alert worker started");
  return worker;
}

