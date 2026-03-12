/**
 * Workflow worker - processes workflow_jobs queue jobs.
 * Executes workflow steps (AI actions, webhooks, etc.) in background.
 */

import { Worker } from "bullmq";
import { ObjectId } from "mongodb";
import { queueConfig } from "../queue/config";
import { WORKFLOW_JOBS_QUEUE } from "../queue/queues";
import type { WorkflowJobData } from "../queue/queues";
import { executeWorkflow } from "../workflows/engine";
import { logger } from "../utils/logger";

async function processWorkflowJob(jobData: WorkflowJobData): Promise<void> {
  const { workflowId, triggerPayload } = jobData;
  const workflowIdObj = new ObjectId(workflowId);
  await executeWorkflow(workflowIdObj, triggerPayload);
}

export function startWorkflowWorker(): Worker<WorkflowJobData> {
  const worker = new Worker<WorkflowJobData>(
    WORKFLOW_JOBS_QUEUE,
    async (job) => {
      const data = job.data;
      logger.info({ workflowId: data.workflowId }, "[Workflow Worker] Processing job");
      await processWorkflowJob(data);
    },
    {
      connection: queueConfig.connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, workflowId: (job.data as WorkflowJobData).workflowId }, "[Workflow Worker] Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, workflowId: job?.data?.workflowId, err: String(err) },
      "[Workflow Worker] Job failed"
    );
  });

  return worker;
}
