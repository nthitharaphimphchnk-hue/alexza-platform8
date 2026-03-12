/**
 * Agent engine - receive input, decide tool, execute, return response
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { runProvider } from "../providers";
import { runWorkflowAction } from "../workflows/runAction";
import { executeWorkflow } from "../workflows/engine";
import { logger } from "../utils/logger";
import { runInputSafetyCheck, runOutputSafetyCheck, recordSafetyEvent } from "../ai/safety-guard";
import { QUALITY_MODELS, QUALITY_MODELS_OPENAI } from "../modelRegistry";
import type { AgentDoc, AgentTool } from "../models/agent";

const MAX_MEMORY_MESSAGES = 10;
const TOOL_CALL_PREFIX = "TOOL_CALL:";
const RESPOND_PREFIX = "RESPOND:";

function getProvider(): "openrouter" | "openai" {
  return process.env.OPENROUTER_API_KEY?.trim() ? "openrouter" : "openai";
}

function getModels(): string[] {
  const provider = getProvider();
  return provider === "openrouter" ? QUALITY_MODELS : QUALITY_MODELS_OPENAI;
}

function buildToolsDescription(tools: AgentTool[]): string {
  return tools
    .map((t, i) => {
      if (t.type === "action") {
        return `${i + 1}. action "${t.label ?? t.actionName}" (project ${t.projectId}, action ${t.actionName}) - run AI action`;
      }
      if (t.type === "workflow") {
        return `${i + 1}. workflow "${t.label ?? t.workflowId}" (id ${t.workflowId}) - run workflow`;
      }
      if (t.type === "webhook") {
        return `${i + 1}. webhook "${t.label ?? t.url}" (${t.method ?? "POST"} ${t.url}) - call HTTP endpoint`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildToolCallFormat(tools: AgentTool[]): string {
  const examples: string[] = [];
  if (tools.some((t) => t.type === "action")) {
    examples.push('TOOL_CALL: action <projectId> <actionName> <json input>');
  }
  if (tools.some((t) => t.type === "workflow")) {
    examples.push('TOOL_CALL: workflow <workflowId> <json input>');
  }
  if (tools.some((t) => t.type === "webhook")) {
    examples.push('TOOL_CALL: webhook <url> <method> <json body>');
  }
  return examples.join("\nOr ");
}

export interface RunAgentParams {
  agentId: ObjectId;
  input: string;
  sessionId?: string;
  ownerUserId: ObjectId;
}

export interface RunAgentResult {
  output: string;
  toolUsed?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const { agentId, input, sessionId, ownerUserId } = params;
  const db = await getDb();

  const agent = await db.collection<AgentDoc>("agents").findOne({ _id: agentId });
  if (!agent) throw new Error("Agent not found");

  let memoryMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (agent.memoryEnabled && sessionId) {
    const mem = await db
      .collection<{ agentId: ObjectId; sessionId: string; role: string; content: string; createdAt: Date }>("agent_memory")
      .find({ agentId, sessionId })
      .sort({ createdAt: -1 })
      .limit(MAX_MEMORY_MESSAGES * 2)
      .toArray();
    memoryMessages = mem
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      .slice(-MAX_MEMORY_MESSAGES);
  }

  // Safety guard on agent input
  try {
    const inputCheck = await runInputSafetyCheck({
      text: input,
      direction: "input",
      userId: ownerUserId,
      projectId: null,
      actionId: null,
    });
    if (inputCheck.ruleTriggered) {
      await recordSafetyEvent({
        ctx: { text: input, direction: "input", userId: ownerUserId, projectId: null, actionId: null },
        ruleTriggered: inputCheck.ruleTriggered,
        decision: inputCheck.decision,
      });
    }
    if (inputCheck.decision === "block") {
      throw new Error("Agent input blocked by safety guard");
    }
  } catch {
    // If safety guard fails, continue; agents should still run.
  }

  const toolsDesc = agent.tools.length > 0 ? buildToolsDescription(agent.tools) : "No tools available.";
  const toolCallFormat = agent.tools.length > 0 ? buildToolCallFormat(agent.tools) : "";

  const systemPrompt = `You are an AI agent named "${agent.name}". ${agent.description || ""}

Available tools:
${toolsDesc}

To use a tool, output exactly one line starting with TOOL_CALL: followed by the tool type and parameters.
${toolCallFormat ? `Format: ${toolCallFormat}` : ""}

To respond directly without using a tool, output a line starting with RESPOND: followed by your response.

Always output either TOOL_CALL: or RESPOND: as the first line.`;

  const prompt =
    memoryMessages.length > 0
      ? memoryMessages
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n") +
        "\n\nUser: " +
        input
      : input;

  const provider = getProvider();
  const models = getModels();

  const result = await runProvider({
    provider,
    model: models[0] ?? "openai/gpt-4o-mini",
    prompt,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 2048,
  });

  const lines = result.output.trim().split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  let output = result.output.trim();
  let toolUsed: string | undefined;

  if (firstLine.startsWith(TOOL_CALL_PREFIX)) {
    const rest = firstLine.slice(TOOL_CALL_PREFIX.length).trim();
    const parts = rest.split(/\s+/);
    const toolType = parts[0]?.toLowerCase();
    toolUsed = toolType;

    try {
      const toolResult = await executeTool(agent.tools, toolType, parts.slice(1), ownerUserId);
      output = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2);
    } catch (err) {
      output = `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`;
      logger.warn({ err, agentId: agentId.toString(), toolType }, "[Agent] Tool execution failed");
    }
  } else if (firstLine.startsWith(RESPOND_PREFIX)) {
    output = firstLine.slice(RESPOND_PREFIX.length).trim();
    if (lines.length > 1) output += "\n" + lines.slice(1).join("\n").trim();
  }

  if (agent.memoryEnabled && sessionId) {
    await db.collection("agent_memory").insertMany([
      { agentId, sessionId, role: "user", content: input, createdAt: new Date() },
      { agentId, sessionId, role: "assistant", content: output, createdAt: new Date() },
    ]);
  }

  // Safety guard on agent output
  try {
    const outputCheck = await runOutputSafetyCheck({
      text: output,
      direction: "output",
      userId: ownerUserId,
      projectId: null,
      actionId: null,
    });
    if (outputCheck.ruleTriggered) {
      await recordSafetyEvent({
        ctx: { text: output, direction: "output", userId: ownerUserId, projectId: null, actionId: null },
        ruleTriggered: outputCheck.ruleTriggered,
        decision: outputCheck.decision,
      });
    }
    if (outputCheck.decision === "block") {
      throw new Error("Agent output blocked by safety guard");
    }
    if (outputCheck.decision === "sanitize" && outputCheck.sanitizedText) {
      output = outputCheck.sanitizedText;
    }
  } catch {
    // Ignore safety guard failures for agents.
  }

  return {
    output,
    toolUsed,
    usage: result.usage,
  };
}

async function executeTool(
  tools: AgentTool[],
  toolType: string,
  args: string[],
  ownerUserId: ObjectId
): Promise<unknown> {
  if (toolType === "action") {
    const projectId = args[0];
    const actionName = args[1];
    const inputJson = args.slice(2).join(" ") || "{}";
    let input: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(inputJson) as Record<string, unknown>;
      input = parsed && typeof parsed === "object" ? parsed : { text: inputJson };
    } catch {
      input = { text: inputJson };
    }
    if (!projectId || !actionName) throw new Error("action requires projectId and actionName");
    const r = await runWorkflowAction({
      projectId,
      actionName,
      input,
      ownerUserId,
    });
    return { output: r.output, usage: r.usage };
  }

  if (toolType === "workflow") {
    const workflowId = args[0];
    const inputJson = args.slice(1).join(" ") || "{}";
    let triggerPayload: Record<string, unknown> = {};
    try {
      triggerPayload = JSON.parse(inputJson) as Record<string, unknown>;
    } catch {
      triggerPayload = { input: inputJson };
    }
    if (!workflowId) throw new Error("workflow requires workflowId");
    const ctx = await executeWorkflow(new ObjectId(workflowId), triggerPayload);
    return ctx.data;
  }

  if (toolType === "webhook") {
    const url = args[0];
    const method = (args[1] ?? "POST").toUpperCase();
    const bodyJson = args.slice(2).join(" ") || "{}";
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(bodyJson) as Record<string, unknown>;
    } catch {
      body = { body: bodyJson };
    }
    if (!url) throw new Error("webhook requires url");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: ["POST", "PUT", "PATCH"].includes(method) ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, data: json };
  }

  throw new Error(`Unknown tool type: ${toolType}`);
}
