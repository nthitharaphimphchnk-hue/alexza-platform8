/**
 * Email worker - processes email_jobs queue jobs.
 * Sends low-credits alerts and other transactional emails in background.
 */

import { Worker } from "bullmq";
import { ObjectId } from "mongodb";
import { queueConfig } from "../queue/config";
import { EMAIL_JOBS_QUEUE } from "../queue/queues";
import type { EmailJobData } from "../queue/queues";
import { sendLowCreditsEmailForUser } from "../notifications";
import { logger } from "../utils/logger";

async function processEmailJob(jobData: EmailJobData): Promise<{ sent: boolean; skippedReason?: string }> {
  const { type, userId, toOverride } = jobData;

  if (type === "low_credits") {
    const result = await sendLowCreditsEmailForUser(new ObjectId(userId), {
      toOverride: toOverride || undefined,
    });
    return { sent: result.sent, skippedReason: result.skippedReason };
  }

  throw new Error(`Unknown email job type: ${type}`);
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_JOBS_QUEUE,
    async (job) => {
      const data = job.data;
      logger.info({ type: data.type, userId: data.userId }, "[Email Worker] Processing job");
      return await processEmailJob(data);
    },
    {
      connection: queueConfig.connection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, type: (job.data as EmailJobData).type }, "[Email Worker] Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, type: job?.data?.type, err: String(err) },
      "[Email Worker] Job failed"
    );
  });

  return worker;
}
