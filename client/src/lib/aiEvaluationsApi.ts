import { apiRequest } from "./api";

export interface AiEvaluation {
  actionId: string;
  promptVersion: number;
  model: string;
  qualityScore: number;
  latency: number;
  tokens: number;
  cost: number;
  createdAt: string;
  actionName?: string;
}

export async function listAiEvaluations(): Promise<AiEvaluation[]> {
  const res = await apiRequest<{ ok: true; evaluations: AiEvaluation[] }>("/api/ai-evaluations");
  return res.evaluations || [];
}

