/**
 * AI Model Router configuration.
 *
 * - Maps logical task types to preferred models.
 * - Admins can override via MODEL_ROUTER_OVERRIDES env var (JSON).
 *
 * Example env:
 * MODEL_ROUTER_OVERRIDES='{
 *   "summarization": { "primary": "gpt-4o-mini", "fallbacks": ["gpt-4o"] },
 *   "reasoning": { "primary": "gpt-4.1", "fallbacks": ["gpt-4o"] }
 * }'
 */

export type TaskType =
  | "summarization"
  | "translation"
  | "reasoning"
  | "extraction"
  | "creative_writing";

export interface TaskModelConfig {
  primary: string;
  fallbacks: string[];
}

export type TaskModelMapping = Record<TaskType, TaskModelConfig>;

export const DEFAULT_TASK_MODEL_MAPPING: TaskModelMapping = {
  summarization: {
    primary: "gpt-4o-mini",
    fallbacks: ["gpt-4o"],
  },
  translation: {
    primary: "gpt-4o-mini",
    fallbacks: ["gpt-4o"],
  },
  reasoning: {
    primary: "gpt-4.1",
    fallbacks: ["gpt-4o"],
  },
  extraction: {
    primary: "gpt-4o-mini",
    fallbacks: ["gpt-4o"],
  },
  creative_writing: {
    primary: "gpt-4.1",
    fallbacks: ["gpt-4o"],
  },
};

let ADMIN_TASK_MODEL_MAPPING: Partial<TaskModelMapping> | null = null;

function loadAdminOverridesFromEnv(): Partial<TaskModelMapping> | null {
  const raw = process.env.MODEL_ROUTER_OVERRIDES;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, { primary?: string; fallbacks?: string[] }>;
    const out: Partial<TaskModelMapping> = {};
    (Object.keys(parsed) as Array<keyof typeof parsed>).forEach((k) => {
      const key = k as TaskType;
      const cfg = parsed[key];
      if (!cfg || !cfg.primary) return;
      out[key] = {
        primary: cfg.primary,
        fallbacks: Array.isArray(cfg.fallbacks) ? cfg.fallbacks.filter((m) => typeof m === "string") : [],
      };
    });
    return out;
  } catch {
    return null;
  }
}

export function getTaskModelConfig(taskType: TaskType): TaskModelConfig {
  if (!ADMIN_TASK_MODEL_MAPPING) {
    ADMIN_TASK_MODEL_MAPPING = loadAdminOverridesFromEnv();
  }

  const adminCfg = ADMIN_TASK_MODEL_MAPPING?.[taskType];
  if (adminCfg?.primary) {
    return {
      primary: adminCfg.primary,
      fallbacks: adminCfg.fallbacks && adminCfg.fallbacks.length > 0 ? adminCfg.fallbacks : DEFAULT_TASK_MODEL_MAPPING[taskType].fallbacks,
    };
  }

  return DEFAULT_TASK_MODEL_MAPPING[taskType];
}

