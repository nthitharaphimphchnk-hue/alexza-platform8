/**
 * Project Export/Import - schema and validation
 */

export const EXPORT_VERSION = "1";

export interface ExportProject {
  name: string;
  description?: string;
  model?: string;
  status: "active" | "paused";
  routingMode: "cheap" | "balanced" | "quality";
}

export interface ExportAction {
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  promptTemplate: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExportAgentTool {
  type: "action" | "workflow" | "webhook";
  projectId?: string;
  actionName?: string;
  workflowId?: string;
  url?: string;
  method?: string;
  label?: string;
}

export interface ExportAgent {
  name: string;
  description: string;
  tools: ExportAgentTool[];
  memoryEnabled: boolean;
}

export interface ExportWorkflowStep {
  type: "trigger" | "action" | "output";
  order: number;
  config: Record<string, unknown>;
}

export interface ExportWorkflow {
  /** Original workflow ID for mapping on import */
  id: string;
  name: string;
  enabled: boolean;
  steps: ExportWorkflowStep[];
}

export interface ProjectExportPayload {
  version: string;
  exportedAt: string;
  project: ExportProject;
  actions: ExportAction[];
  agents: ExportAgent[];
  workflows: ExportWorkflow[];
}

const PLACEHOLDER_PROJECT = "__PROJECT__";

export function replaceProjectPlaceholder(obj: unknown, newProjectId: string): unknown {
  return replacePlaceholders(obj, { [PLACEHOLDER_PROJECT]: newProjectId });
}

/** Replace string placeholders (e.g. __PROJECT__, old workflow IDs) with new values */
export function replacePlaceholders(
  obj: unknown,
  replacements: Record<string, string>
): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return replacements[obj] ?? obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replacePlaceholders(item, replacements));
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = replacePlaceholders(v, replacements);
    }
    return result;
  }
  return obj;
}

export function toPlaceholderProjectId(projectId: string): string {
  return PLACEHOLDER_PROJECT;
}

export function validateExportPayload(data: unknown): data is ProjectExportPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.version !== EXPORT_VERSION) return false;
  if (!d.project || typeof d.project !== "object") return false;
  const p = d.project as Record<string, unknown>;
  if (typeof p.name !== "string" || p.name.length < 2) return false;
  if (p.status !== "active" && p.status !== "paused") return false;
  if (!["cheap", "balanced", "quality"].includes(p.routingMode as string)) return false;
  if (!Array.isArray(d.actions)) return false;
  if (!Array.isArray(d.agents)) return false;
  if (!Array.isArray(d.workflows)) return false;
  for (const w of d.workflows as ExportWorkflow[]) {
    if (typeof w.id !== "string" || typeof w.name !== "string" || !Array.isArray(w.steps)) return false;
  }
  return true;
}
