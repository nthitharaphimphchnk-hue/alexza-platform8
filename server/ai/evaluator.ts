import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { calculateCostUsd } from "../config/modelPricing";
import type { ProjectActionDoc } from "../models/types";

export interface AiEvaluationDoc {
  _id: ObjectId;
  actionId: ObjectId;
  promptVersion: number;
  model: string;
  qualityScore: number;
  latency: number;
  tokens: number;
  cost: number;
  createdAt: Date;
}

export interface RecordEvaluationParams {
  action: ProjectActionDoc & { _id: ObjectId };
  model: string;
  latencyMs: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  succeeded: boolean;
}

async function getLatestPromptVersion(actionId: ObjectId): Promise<number> {
  const db = await getDb();
  const col = db.collection<{ actionId: ObjectId; version: number }>("prompt_versions");
  const latest = await col.find({ actionId }).sort({ version: -1 }).limit(1).toArray();
  return latest[0]?.version ?? 0;
}

export function computeQualityScore(params: {
  output: string;
  latencyMs: number;
  succeeded: boolean;
}): number {
  const { output, latencyMs, succeeded } = params;

  if (!succeeded) return 0;

  const len = output.trim().length;
  let score = 80;

  // Penalize extremely short or empty responses
  if (len < 20) score -= 25;
  else if (len < 60) score -= 10;

  // Penalize very long responses slightly (possible rambling)
  if (len > 4000) score -= 10;

  // Latency penalty (soft)
  if (latencyMs > 5000) score -= 15;
  else if (latencyMs > 2500) score -= 5;

  // Clamp between 0 and 100
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

export async function recordAiEvaluation(params: RecordEvaluationParams & { output: string }): Promise<void> {
  const { action, model, latencyMs, totalTokens, inputTokens, outputTokens, succeeded, output } = params;
  const db = await getDb();
  const col = db.collection<AiEvaluationDoc>("ai_evaluations");

  const promptVersion = await getLatestPromptVersion(action._id);
  const cost = calculateCostUsd(model, inputTokens, outputTokens);
  const qualityScore = computeQualityScore({ output, latencyMs, succeeded });

  const doc: Omit<AiEvaluationDoc, "_id"> = {
    actionId: action._id,
    promptVersion,
    model,
    qualityScore,
    latency: latencyMs,
    tokens: totalTokens,
    cost,
    createdAt: new Date(),
  };

  await col.insertOne(doc as AiEvaluationDoc);
}

