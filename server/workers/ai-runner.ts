/**
 * AI Run worker - processes ai_runs queue jobs.
 * Runs AI actions in background, updates job result, handles credits.
 */

import { Worker } from "bullmq";
import { ObjectId } from "mongodb";
import { queueConfig } from "../queue/config";
import { AI_RUNS_QUEUE } from "../queue/queues";
import type { AiRunJobData } from "../queue/queues";
import { getDb } from "../db";
import {
  InsufficientBalanceError,
  reserveCredits,
  refundCredits,
  deductAdditionalCredits,
  creditsFromTokens,
} from "../wallet";
import { runWithFallback } from "../providers";
import { logUsage } from "../usage";
import { logRun } from "../runLogs";
import { logApiRequest } from "../apiRequests";
import { MAX_CREDITS_PER_REQUEST } from "../config";
import type { ProjectActionDoc } from "../models/types";
import type { ProviderType } from "../models/types";
import type { RoutingMode } from "../modelRegistry";
import { logger } from "../utils/logger";
import { estimateTokensFromInput } from "../utils/tokenEstimator";
import { selectModelsForAction } from "../ai/model-router";
import { checkCostGuard } from "../ai/cost-guard";

function getExecutionProvider(): ProviderType {
  const key = process.env.OPENROUTER_API_KEY;
  if (key && key.trim().length > 0) return "openrouter";
  return "openai";
}

function substituteVariables(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(String(value ?? ""));
  }
  return result;
}

async function processAiRunJob(jobData: AiRunJobData): Promise<{ output: string; creditsCharged: number; totalTokens?: number }> {
  const {
    requestId,
    projectId,
    actionName,
    input,
    ownerUserId,
    apiKeyId,
    estimatedCredits,
    routingMode = "quality",
  } = jobData;

  const projectIdObj = new ObjectId(projectId);
  const ownerUserIdObj = new ObjectId(ownerUserId);
  const apiKeyIdObj = new ObjectId(apiKeyId);

  const db = await getDb();
  const [project, action] = await Promise.all([
    db.collection<{ routingMode?: RoutingMode; workspaceId?: ObjectId }>("projects").findOne(
      { _id: projectIdObj },
      { projection: { routingMode: 1, workspaceId: 1 } }
    ),
    db.collection<ProjectActionDoc>("project_actions").findOne({ projectId: projectIdObj, actionName }),
  ]);

  if (!action) throw new Error("Action not found");

  const mode: RoutingMode = project?.routingMode && ["cheap", "balanced", "quality"].includes(project.routingMode)
    ? project.routingMode
    : "quality";

  const variables = typeof input === "object" && input ? input : {};
  const prompt = substituteVariables(action.promptTemplate, variables);

  const executionProvider = getExecutionProvider();
  const decision = selectModelsForAction({ action, routingMode: mode, provider: executionProvider });
  let modelList = decision.models;

  const estimatedTokens = estimateTokensFromInput(prompt);
  const estimatedCredits = Math.max(1, creditsFromTokens(estimatedTokens));

  // Cost guard for worker (async) runs
  try {
    const cgDecision = await checkCostGuard({
      workspaceId: project?.workspaceId ?? null,
      projectId: projectIdObj,
      actionId: (action as ProjectActionDoc & { _id: ObjectId })._id,
      model: decision.primaryModel,
      estimatedCredits,
    });

    if (cgDecision.decision === "block") {
      logger.warn(
        {
          projectId,
          actionName,
          jobRequestId: requestId,
          reason: cgDecision.reason,
        },
        "[CostGuard] Blocked async AI run"
      );
      throw new Error(cgDecision.reason ?? "Blocked by cost guard");
    }

    if (cgDecision.decision === "fallback" && cgDecision.fallbackModel) {
      modelList = [cgDecision.fallbackModel, ...modelList.filter((m) => m !== cgDecision.fallbackModel)];
    }
  } catch (err) {
    // If cost guard fails unexpectedly, log and continue with original models
    logger.warn({ err: String(err), projectId, actionName }, "[CostGuard] Worker guard check failed");
  }

  let reserved = false;
  try {
    await reserveCredits({
      userId: ownerUserIdObj,
      estimatedCredits,
      requestId,
    });
    reserved = true;
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      throw err;
    }
    throw err;
  }

  let result;
  try {
    result = await runWithFallback({
      provider: executionProvider,
      models: modelList,
      prompt,
      temperature: action.temperature,
      maxTokens: action.maxTokens,
    });
  } catch (providerErr) {
    if (reserved) {
      await refundCredits({
        userId: ownerUserIdObj,
        refundCredits: estimatedCredits,
        requestId,
        meta: { reason: "Provider failed", actionName },
      });
    }
    throw providerErr;
  }

  const resolvedModel = result._resolvedModel ?? action.model ?? decision.primaryModel;

  if (resolvedModel && resolvedModel !== decision.primaryModel) {
    logger.info(
      {
        requestId,
        actionName,
        projectId,
        primaryModel: decision.primaryModel,
        resolvedModel,
      },
      "[ModelRouter] Fallback model used (worker)"
    );
  }
  const totalTokens = result.usage?.total_tokens ?? null;
  const actualCredits =
    typeof totalTokens === "number"
      ? Math.max(1, creditsFromTokens(totalTokens))
      : estimatedCredits;
  const cappedCredits = Math.min(actualCredits, MAX_CREDITS_PER_REQUEST);

  if (cappedCredits < estimatedCredits) {
    await refundCredits({
      userId: ownerUserIdObj,
      refundCredits: estimatedCredits - cappedCredits,
      requestId,
      meta: { actionName, actualCredits: cappedCredits },
    });
  } else if (cappedCredits > estimatedCredits) {
    const additional = cappedCredits - estimatedCredits;
    try {
      await deductAdditionalCredits({
        userId: ownerUserIdObj,
        additionalCredits: additional,
        requestId,
        meta: { actionName, totalTokens },
      });
    } catch (extraErr) {
      if (extraErr instanceof InsufficientBalanceError) {
        await refundCredits({
          userId: ownerUserIdObj,
          refundCredits: estimatedCredits,
          requestId,
          meta: { reason: "Insufficient for actual usage", actionName },
        });
        throw extraErr;
      }
      throw extraErr;
    }
  }

  const latencyMs = 0; // Worker doesn't track request start
  await logUsage({
    projectId: projectIdObj,
    ownerUserId: ownerUserIdObj,
    apiKeyId: apiKeyIdObj,
    endpoint: `/v1/projects/${projectId}/run/${actionName}`,
    statusCode: 200,
    status: "success",
    provider: executionProvider,
    model: resolvedModel ?? "default",
    inputTokens: result.usage?.prompt_tokens ?? null,
    outputTokens: result.usage?.completion_tokens ?? null,
    totalTokens,
    latencyMs,
  });

  await logRun({
    requestId,
    projectId: projectIdObj,
    ownerUserId: ownerUserIdObj,
    apiKeyId: apiKeyIdObj,
    actionName,
    status: "success",
    statusCode: 200,
    latencyMs,
    upstreamProvider: executionProvider,
    upstreamModel: resolvedModel ?? undefined,
  });

  await logApiRequest({
    id: requestId,
    ownerUserId: ownerUserIdObj,
    projectId: projectIdObj,
    actionName,
    status: "success",
    tokensUsed: totalTokens ?? 0,
    latencyMs,
    input: variables,
  });

  const { recordBillingLedger } = await import("../billing/ledger");
  await recordBillingLedger({
    requestId,
    userId: ownerUserIdObj,
    projectId: projectIdObj,
    apiKeyId: apiKeyIdObj,
    actionName,
    provider: executionProvider,
    model: resolvedModel ?? "unknown",
    inputTokens: result.usage?.prompt_tokens ?? 0,
    outputTokens: result.usage?.completion_tokens ?? 0,
    totalTokens: totalTokens ?? 0,
    creditsCharged: cappedCredits,
  }).catch(() => {});

  // AI Evaluation - background runs
  try {
    const { recordAiEvaluation } = await import("../ai/evaluator");
    await recordAiEvaluation({
      action: action as ProjectActionDoc & { _id: ObjectId },
      model: resolvedModel ?? "unknown",
      latencyMs,
      totalTokens: totalTokens ?? 0,
      inputTokens: result.usage?.prompt_tokens ?? 0,
      outputTokens: result.usage?.completion_tokens ?? 0,
      succeeded: true,
      output: result.output ?? "",
    });
  } catch {
    // ignore evaluation errors
  }

  return {
    output: result.output ?? "",
    creditsCharged: cappedCredits,
    totalTokens: totalTokens ?? undefined,
  };
}

export function startAiRunnerWorker(): Worker<AiRunJobData> {
  const worker = new Worker<AiRunJobData>(
    AI_RUNS_QUEUE,
    async (job) => {
      const data = job.data;
      logger.info({ requestId: data.requestId, actionName: data.actionName }, "[AI Runner] Processing job");

      const db = await getDb();
      const col = db.collection("ai_job_results");

      try {
        await col.updateOne(
          { requestId: data.requestId },
          { $set: { status: "processing", updatedAt: new Date() } }
        );

        const result = await processAiRunJob(data);

        await col.updateOne(
          { requestId: data.requestId },
          {
            $set: {
              status: "completed",
              output: result.output,
              creditsCharged: result.creditsCharged,
              totalTokens: result.totalTokens,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        const { enqueueWebhookDelivery } = await import("../queue/enqueue");
        enqueueWebhookDelivery({
          event: "action.run.succeeded",
          payload: {
            requestId: data.requestId,
            projectId: data.projectId,
            actionName: data.actionName,
            creditsCharged: result.creditsCharged,
            output: result.output,
          },
          ownerUserId: new ObjectId(data.ownerUserId),
          projectId: new ObjectId(data.projectId),
        });

        return result;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await col.updateOne(
          { requestId: data.requestId },
          {
            $set: {
              status: "failed",
              error: errMsg,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        const { enqueueWebhookDelivery } = await import("../queue/enqueue");
        enqueueWebhookDelivery({
          event: "action.run.failed",
          payload: {
            requestId: data.requestId,
            projectId: data.projectId,
            actionName: data.actionName,
            error: errMsg,
          },
          ownerUserId: new ObjectId(data.ownerUserId),
          projectId: new ObjectId(data.projectId),
        });

        throw err;
      }
    },
    {
      connection: queueConfig.connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, requestId: (job.data as AiRunJobData).requestId }, "[AI Runner] Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, requestId: job?.data?.requestId, err: String(err) },
      "[AI Runner] Job failed"
    );
  });

  return worker;
}
