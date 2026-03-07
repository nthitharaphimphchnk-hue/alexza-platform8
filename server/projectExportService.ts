/**
 * Project Export/Import - service logic
 */

import { ObjectId } from "mongodb";
import { getDb } from "./db";
import type { ProjectActionDoc } from "./models/types";
import type { AgentDoc, AgentTool } from "./models/agent";
import type { WorkflowDoc, WorkflowStepDoc } from "./workflows/types";
import {
  EXPORT_VERSION,
  replacePlaceholders,
  validateExportPayload,
  type ProjectExportPayload,
  type ExportAction,
  type ExportAgent,
  type ExportWorkflow,
  type ExportWorkflowStep,
} from "./projectExport";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "./modelRegistry";
import { refreshScheduleTriggers } from "./workflows/triggers";

function hasOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function getDefaultModel(): string {
  const hasOR = hasOpenRouter();
  const defaultModel = hasOR ? QUALITY_MODELS[0] : QUALITY_MODELS_OPENAI[0];
  return process.env.EXECUTION_DEFAULT_MODEL || defaultModel;
}

function getDefaultProvider(): "openrouter" | "openai" {
  return hasOpenRouter() ? "openrouter" : "openai";
}

/** Replace projectId with __PROJECT__ in config for run_ai_action steps */
function anonymizeConfig(config: Record<string, unknown>, projectId: string): Record<string, unknown> {
  const out = { ...config };
  if (out.kind === "run_ai_action" && out.projectId === projectId) {
    out.projectId = "__PROJECT__";
  }
  return out;
}

/** Replace __PROJECT__ with new projectId in config */
function resolveConfig(config: Record<string, unknown>, newProjectId: string): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(config));
  if (out.kind === "run_ai_action" && out.projectId === "__PROJECT__") {
    out.projectId = newProjectId;
  }
  return out;
}

export async function exportProject(projectId: ObjectId): Promise<ProjectExportPayload | null> {
  const db = await getDb();
  const project = await db.collection<{ workspaceId?: ObjectId } & Record<string, unknown>>("projects").findOne({ _id: projectId });
  if (!project) return null;

  const pid = projectId.toString();
  const routingMode = (project.routingMode as string) ?? "quality";

  const actions = await db
    .collection<ProjectActionDoc>("project_actions")
    .find({ projectId })
    .sort({ createdAt: 1 })
    .toArray();

  const exportActions: ExportAction[] = actions.map((a) => ({
    actionName: a.actionName,
    description: a.description ?? "",
    inputSchema: a.inputSchema ?? { type: "object", properties: {}, required: [] },
    outputSchema: a.outputSchema,
    promptTemplate: a.promptTemplate,
    model: a.model ?? getDefaultModel(),
    temperature: a.temperature ?? 0.7,
    maxTokens: a.maxTokens ?? 2048,
  }));

  const workspaceId = project.workspaceId;
  let exportAgents: ExportAgent[] = [];
  let exportWorkflows: ExportWorkflow[] = [];

  if (workspaceId) {
    const agents = await db.collection<AgentDoc>("agents").find({ workspaceId }).toArray();
    const agentsReferencingProject = agents.filter((a) =>
      a.tools.some((t) => t.type === "action" && t.projectId === pid)
    );

    exportAgents = agentsReferencingProject.map((a) => {
      const tools = a.tools.map((t) => {
        if (t.type === "action" && t.projectId === pid) {
          return { type: "action" as const, projectId: "__PROJECT__", actionName: t.actionName, label: t.label };
        }
        if (t.type === "workflow") {
          return { type: "workflow" as const, workflowId: t.workflowId, label: t.label };
        }
        if (t.type === "webhook") {
          return { type: "webhook" as const, url: t.url, method: t.method ?? "POST", label: t.label };
        }
        return t;
      });
      return {
        name: a.name,
        description: a.description ?? "",
        tools,
        memoryEnabled: a.memoryEnabled ?? false,
      };
    });

    const workflows = await db.collection<WorkflowDoc>("workflows").find({ workspaceId }).toArray();
    const workflowIdsReferencingProject: ObjectId[] = [];

    for (const w of workflows) {
      const steps = await db
        .collection<WorkflowStepDoc>("workflow_steps")
        .find({ workflowId: w._id })
        .sort({ order: 1 })
        .toArray();
      const hasRef = steps.some(
        (s) => s.config?.kind === "run_ai_action" && s.config.projectId === pid
      );
      if (hasRef) workflowIdsReferencingProject.push(w._id);
    }

    for (const wid of workflowIdsReferencingProject) {
      const w = await db.collection<WorkflowDoc>("workflows").findOne({ _id: wid });
      if (!w) continue;
      const steps = await db
        .collection<WorkflowStepDoc>("workflow_steps")
        .find({ workflowId: wid })
        .sort({ order: 1 })
        .toArray();

      const exportSteps: ExportWorkflowStep[] = steps.map((s) => ({
        type: s.type as "trigger" | "action" | "output",
        order: s.order,
        config: anonymizeConfig((s.config ?? {}) as Record<string, unknown>, pid),
      }));

      exportWorkflows.push({
        id: wid.toString(),
        name: w.name,
        enabled: w.enabled ?? false,
        steps: exportSteps,
      });
    }
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name as string,
      description: project.description as string | undefined,
      model: project.model as string | undefined,
      status: (project.status as "active" | "paused") ?? "active",
      routingMode: routingMode as "cheap" | "balanced" | "quality",
    },
    actions: exportActions,
    agents: exportAgents,
    workflows: exportWorkflows,
  };
}

export interface ImportOptions {
  workspaceId: ObjectId;
  userId: ObjectId;
  data: ProjectExportPayload;
}

export interface ImportResult {
  projectId: string;
  actionCount: number;
  agentCount: number;
  workflowCount: number;
}

export async function importProject(opts: ImportOptions): Promise<ImportResult> {
  const { workspaceId, userId, data } = opts;
  if (!validateExportPayload(data)) {
    throw new Error("Invalid export payload or unsupported version");
  }

  const db = await getDb();
  const now = new Date();

  const projectResult = await db.collection("projects").insertOne({
    ownerUserId: userId,
    workspaceId,
    name: data.project.name,
    description: data.project.description ?? "",
    model: data.project.model ?? "",
    status: data.project.status,
    routingMode: data.project.routingMode ?? "quality",
    createdAt: now,
    updatedAt: now,
  });
  const newProjectId = projectResult.insertedId;
  const newProjectIdStr = newProjectId.toString();

  const hasOR = hasOpenRouter();
  const defaultProvider = hasOR ? "openrouter" : "openai";
  const defaultModel = getDefaultModel();

  let actionCount = 0;
  for (const a of data.actions) {
    await db.collection<ProjectActionDoc>("project_actions").insertOne({
      userId,
      projectId: newProjectId,
      actionName: a.actionName,
      description: a.description,
      inputSchema: a.inputSchema ?? { type: "object", properties: {}, required: [] },
      outputSchema: a.outputSchema,
      promptTemplate: a.promptTemplate,
      provider: defaultProvider,
      model: a.model ?? defaultModel,
      routingPolicy: "quality",
      temperature: a.temperature ?? 0.7,
      maxTokens: a.maxTokens ?? 2048,
      createdAt: now,
      updatedAt: now,
    });
    actionCount++;
  }

  const workflowIdMap: Record<string, string> = {};
  for (const w of data.workflows) {
    const wResult = await db.collection<WorkflowDoc>("workflows").insertOne({
      name: w.name,
      workspaceId,
      ownerUserId: userId,
      enabled: w.enabled,
      createdAt: now,
      updatedAt: now,
    } as WorkflowDoc);
    const newWid = wResult.insertedId.toString();
    workflowIdMap[w.id] = newWid;

    for (const s of w.steps) {
      const config = resolveConfig(s.config as Record<string, unknown>, newProjectIdStr);
      await db.collection<WorkflowStepDoc>("workflow_steps").insertOne({
        workflowId: wResult.insertedId,
        type: s.type,
        order: s.order,
        config,
        createdAt: now,
        updatedAt: now,
      } as WorkflowStepDoc & { workflowId: ObjectId });
    }
  }

  const replacements: Record<string, string> = {
    __PROJECT__: newProjectIdStr,
    ...workflowIdMap,
  };

  let agentCount = 0;
  for (const a of data.agents) {
    const tools = replacePlaceholders(a.tools, replacements) as AgentTool[];
    await db.collection<AgentDoc>("agents").insertOne({
      name: a.name,
      description: a.description,
      workspaceId,
      ownerUserId: userId,
      tools,
      memoryEnabled: a.memoryEnabled,
      createdAt: now,
      updatedAt: now,
    } as AgentDoc);
    agentCount++;
  }

  refreshScheduleTriggers().catch(() => {});

  return {
    projectId: newProjectIdStr,
    actionCount,
    agentCount,
    workflowCount: data.workflows.length,
  };
}
