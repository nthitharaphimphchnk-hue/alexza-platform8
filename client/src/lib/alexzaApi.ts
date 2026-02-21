/**
 * ALEXZA API client - typed wrappers for Builder, Actions, Runtime.
 * Hidden Gateway: no provider/model exposed.
 */

import { API_BASE_URL, ApiError, apiRequest } from "./api";

export type RoutingMode = "cheap" | "balanced" | "quality";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  routingMode?: RoutingMode;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface PublicAction {
  id: string;
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  instruction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProposedAction {
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  instruction?: string;
}

export interface RunResponse {
  ok: true;
  requestId: string;
  output: string;
  usage?: { tokens?: number; creditsCharged?: number };
  latencyMs?: number;
}

export function getFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "FREE_PLAN_LIMIT") {
      return "Free plan allows up to 3 actions per project. Upgrade to Pro for more. / แพลนฟรีจำกัด 3 actions ต่อโปรเจกต์ อัปเกรด Pro เพื่อเพิ่ม";
    }
    if (error.status === 401) return "Please sign in to continue. / กรุณาเข้าสู่ระบบ";
    if (error.status === 402) return "Insufficient ALEXZA Credits. / เครดิตไม่เพียงพอ";
    if (error.status === 404) return "Resource not found. / ไม่พบข้อมูล";
    if (error.status === 429) return "Too many requests. Try again later. / เรียกใช้บ่อยเกินไป ลองใหม่อีกครั้ง";
    return error.message || "Request failed.";
  }
  return error instanceof Error ? error.message : "An error occurred.";
}

export interface OnboardingStatus {
  hasProject: boolean;
  hasApiKey: boolean;
  hasAction: boolean;
  complete: boolean;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await apiRequest<{ ok: true; onboarding: OnboardingStatus }>("/api/onboarding/status");
  return res.onboarding;
}

export async function getCreditsBalance(): Promise<number> {
  const res = await apiRequest<{ ok: true; balanceCredits: number }>("/api/credits/balance");
  return res.balanceCredits;
}

export interface EstimateResult {
  estimatedTokens: number;
  estimatedCredits: number;
  routingMode: RoutingMode;
}

export async function estimateCost(params: {
  projectId: string;
  actionName: string;
  input: unknown;
}): Promise<EstimateResult> {
  const res = await apiRequest<{
    ok: true;
    estimatedTokens: number;
    estimatedCredits: number;
    routingMode: RoutingMode;
  }>("/api/estimate", {
    method: "POST",
    body: {
      projectId: params.projectId,
      actionName: params.actionName,
      input: params.input,
    },
  });
  return {
    estimatedTokens: res.estimatedTokens,
    estimatedCredits: res.estimatedCredits,
    routingMode: res.routingMode,
  };
}

export async function getProjects(): Promise<Project[]> {
  const res = await apiRequest<{ ok: true; projects: Project[] }>("/api/projects");
  return res.projects || [];
}

export async function createThread(projectId: string, title = "New Thread"): Promise<Thread> {
  const res = await apiRequest<{ ok: true; thread: Thread }>(`/api/projects/${projectId}/threads`, {
    method: "POST",
    body: { title },
  });
  return res.thread;
}

export async function listThreads(projectId: string): Promise<Thread[]> {
  const res = await apiRequest<{ ok: true; threads: Thread[] }>(
    `/api/projects/${projectId}/threads`
  );
  return res.threads || [];
}

export async function listMessages(threadId: string): Promise<Message[]> {
  const res = await apiRequest<{ ok: true; messages: Message[] }>(
    `/api/threads/${threadId}/messages`
  );
  return res.messages || [];
}

export async function sendMessage(
  threadId: string,
  content: string
): Promise<{ message: Message; proposedActions?: PublicProposedAction[] }> {
  const res = await apiRequest<{
    ok: true;
    message: Message;
    proposedActions?: PublicProposedAction[];
  }>(`/api/threads/${threadId}/messages`, {
    method: "POST",
    body: { content },
  });
  return {
    message: res.message,
    proposedActions: res.proposedActions || [],
  };
}

export async function listActions(projectId: string): Promise<PublicAction[]> {
  const res = await apiRequest<{ ok: true; actions: PublicAction[] }>(
    `/api/projects/${projectId}/actions`
  );
  return res.actions || [];
}

export interface ActionDraft {
  actionName: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  promptTemplate?: string;
}

export async function applyAction(
  projectId: string,
  draft: ActionDraft
): Promise<PublicAction> {
  const res = await apiRequest<{ ok: true; action: PublicAction }>(
    `/api/projects/${projectId}/actions`,
    {
      method: "POST",
      body: {
        actionName: draft.actionName,
        description: draft.description || "",
        inputSchema: draft.inputSchema || { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
        outputSchema: draft.outputSchema,
        promptTemplate: draft.promptTemplate || `User: {{input}}`,
      },
    }
  );
  return res.action;
}

export async function deleteAction(
  projectId: string,
  actionName: string
): Promise<void> {
  await apiRequest<{ ok: true }>(`/api/projects/${projectId}/actions/${encodeURIComponent(actionName)}`, {
    method: "DELETE",
  });
}

export async function runAction(
  projectId: string,
  actionName: string,
  payload: Record<string, unknown>,
  apiKey: string
): Promise<RunResponse> {
  const res = await fetch(`${API_BASE_URL}/v1/projects/${projectId}/run/${encodeURIComponent(actionName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data?.error;
    const message =
      typeof err === "object" && typeof err?.message === "string"
        ? err.message
        : typeof data?.message === "string"
          ? data.message
          : `Request failed with status ${res.status}`;
    const code = typeof err === "object" && typeof err?.code === "string" ? err.code : undefined;
    throw new ApiError(message, res.status, code);
  }

  return data as RunResponse;
}
