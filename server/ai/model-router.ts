import type { ProjectActionDoc, ProviderType } from "../models/types";
import type { RoutingMode } from "../modelRegistry";
import {
  QUALITY_MODELS,
  QUALITY_MODELS_OPENAI,
  BALANCED_MODELS,
  BALANCED_MODELS_OPENAI,
  CHEAP_MODELS,
  CHEAP_MODELS_OPENAI,
} from "../modelRegistry";
import { getModelCost } from "../config/modelPricing";
import { getTaskModelConfig, type TaskType } from "../config/modelRouter";
import { logger } from "../utils/logger";

export interface ModelRouterDecision {
  taskType: TaskType | "unknown";
  primaryModel: string;
  fallbackModels: string[];
  models: string[];
  routingMode: RoutingMode;
  provider: ProviderType;
}

function getModelsForMode(mode: RoutingMode, provider: ProviderType): string[] {
  const m = mode ?? "quality";
  if (m === "cheap") return provider === "openrouter" ? CHEAP_MODELS : CHEAP_MODELS_OPENAI;
  if (m === "balanced") return provider === "openrouter" ? BALANCED_MODELS : BALANCED_MODELS_OPENAI;
  return provider === "openrouter" ? QUALITY_MODELS : QUALITY_MODELS_OPENAI;
}

function toOpenAIModelId(model: string): string {
  if (model.startsWith("openai/")) return model.slice(7);
  return model;
}

export function detectTaskType(action: ProjectActionDoc): TaskType | "unknown" {
  const policy = action.routingPolicy?.toLowerCase().trim();
  if (policy === "summarization") return "summarization";
  if (policy === "translation") return "translation";
  if (policy === "reasoning") return "reasoning";
  if (policy === "extraction") return "extraction";
  if (policy === "creative_writing") return "creative_writing";

  const name = action.actionName.toLowerCase();
  const desc = action.description.toLowerCase();
  const text = `${name} ${desc}`;

  if (text.includes("summarize") || text.includes("summary") || text.includes("summarisation")) {
    return "summarization";
  }
  if (text.includes("translate")) {
    return "translation";
  }
  if (text.includes("extract") || text.includes("parser") || text.includes("parse")) {
    return "extraction";
  }
  if (text.includes("blog") || text.includes("story") || text.includes("creative") || text.includes("write")) {
    return "creative_writing";
  }
  if (text.includes("reason") || text.includes("analysis") || text.includes("plan") || text.includes("strategy")) {
    return "reasoning";
  }

  return "unknown";
}

function normalizeForProvider(model: string, provider: ProviderType): string {
  if (provider === "openai") {
    return toOpenAIModelId(model);
  }
  // For OpenRouter, ensure models are provider-prefixed for OpenAI where needed
  if (!model.includes("/")) {
    return `openai/${model}`;
  }
  return model;
}

export function selectModelsForAction(params: {
  action: ProjectActionDoc;
  routingMode: RoutingMode;
  provider: ProviderType;
}): ModelRouterDecision {
  const { action, routingMode, provider } = params;

  const taskType = detectTaskType(action);
  const modeModels = getModelsForMode(routingMode, provider);

  // 1) Admin / default mapping by task type
  let configuredPrimary: string | null = null;
  let configuredFallbacks: string[] = [];

  if (taskType !== "unknown") {
    const cfg = getTaskModelConfig(taskType);
    configuredPrimary = cfg.primary;
    configuredFallbacks = cfg.fallbacks ?? [];
  }

  // 2) Action-level overrides
  const explicitPrimary = action.model?.trim();
  const explicitFallbacks =
    action.fallbackModels && Array.isArray(action.fallbackModels)
      ? action.fallbackModels.filter((m): m is string => typeof m === "string")
      : [];

  let primary = explicitPrimary || configuredPrimary || modeModels[0];

  // 3) Build fallbacks: action-specific, then task mapping, then mode defaults
  const combinedFallbacks: string[] = [];
  const pushUnique = (m: string | undefined | null) => {
    if (!m) return;
    if (!combinedFallbacks.includes(m)) combinedFallbacks.push(m);
  };

  explicitFallbacks.forEach((m) => pushUnique(m));
  configuredFallbacks.forEach((m) => pushUnique(m));
  modeModels.slice(1).forEach((m) => pushUnique(m));

  // 4) Rank by cost (cheapest first) but keep chosen primary at front
  const allCandidates = [primary, ...combinedFallbacks];
  const unique = Array.from(new Set(allCandidates));

  const scored = unique.map((modelId) => ({
    modelId,
    cost: getModelCost(modelId),
  }));

  scored.sort((a, b) => {
    const aTotal = a.cost.input + a.cost.output;
    const bTotal = b.cost.input + b.cost.output;
    return aTotal - bTotal;
  });

  // Ensure primary stays primary, but we prefer cheaper primary if explicit not set
  if (!explicitPrimary && taskType !== "unknown" && scored.length > 0) {
    primary = scored[0]!.modelId;
  }

  const orderedModels = [primary, ...unique.filter((m) => m !== primary)];

  const normalizedPrimary = normalizeForProvider(primary, provider);
  const normalizedFallbacks = orderedModels
    .slice(1)
    .map((m) => normalizeForProvider(m, provider));

  const models = [normalizedPrimary, ...normalizedFallbacks];

  logger.info(
    {
      actionName: action.actionName,
      projectId: action.projectId?.toString?.() ?? undefined,
      routingMode,
      provider,
      taskType,
      primaryModel: normalizedPrimary,
      fallbackModels: normalizedFallbacks,
    },
    "[ModelRouter] Selected models for action"
  );

  return {
    taskType,
    primaryModel: normalizedPrimary,
    fallbackModels: normalizedFallbacks,
    models,
    routingMode,
    provider,
  };
}

