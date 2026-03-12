import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { logger } from "../utils/logger";

export type SafetyDecisionMode = "allow" | "warn" | "block" | "sanitize";

export interface SafetyCheckContext {
  text: string;
  direction: "input" | "output";
  userId?: ObjectId | null;
  projectId?: ObjectId | null;
  actionId?: ObjectId | null;
}

export interface SafetyCheckResult {
  decision: SafetyDecisionMode;
  ruleTriggered?: string;
  sanitizedText?: string;
  reasons?: string[];
}

export interface AiSafetyEventDoc {
  _id: ObjectId;
  userId?: ObjectId | null;
  projectId?: ObjectId | null;
  actionId?: ObjectId | null;
  ruleTriggered: string;
  decision: SafetyDecisionMode;
  direction: "input" | "output";
  createdAt: Date;
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/gi,
  /disregard (the )?(above|previous) rules/gi,
  /you are chatgpt/gi,
  /you are now (the )?system/gi,
  /act as (an?|the) system/gi,
  /pretend the previous instructions do not exist/gi,
];

const HATE_SPEECH_PATTERNS = [
  /\bgenocide\b/gi,
  /\bkill (all|every)\b/gi,
  /\bhate\s+(speech|crime)\b/gi,
];

const MALWARE_PATTERNS = [
  /\breverse shell\b/gi,
  /\bransomware\b/gi,
  /\bmalware\b/gi,
  /\bkeylogger\b/gi,
  /\bddos\b/gi,
  /\bsql injection\b/gi,
  /\bexploit\b/gi,
];

const EXFILTRATION_PATTERNS = [
  /\bapi key\b/gi,
  /\baccess token\b/gi,
  /\bprivate key\b/gi,
  /\bpassword dump\b/gi,
  /\bdatabase dump\b/gi,
  /\bcredit card numbers?\b/gi,
];

function runHeuristics(text: string): { rules: string[] } {
  const rules: string[] = [];
  if (PROMPT_INJECTION_PATTERNS.some((r) => r.test(text))) {
    rules.push("prompt_injection");
  }
  if (HATE_SPEECH_PATTERNS.some((r) => r.test(text))) {
    rules.push("hate_speech");
  }
  if (MALWARE_PATTERNS.some((r) => r.test(text))) {
    rules.push("malware");
  }
  if (EXFILTRATION_PATTERNS.some((r) => r.test(text))) {
    rules.push("data_exfiltration");
  }
  return { rules };
}

export async function recordSafetyEvent(params: {
  ctx: SafetyCheckContext;
  ruleTriggered: string;
  decision: SafetyDecisionMode;
}): Promise<void> {
  const db = await getDb();
  const col = db.collection<AiSafetyEventDoc>("ai_safety_events");
  const doc: Omit<AiSafetyEventDoc, "_id"> = {
    userId: params.ctx.userId ?? null,
    projectId: params.ctx.projectId ?? null,
    actionId: params.ctx.actionId ?? null,
    ruleTriggered: params.ruleTriggered,
    decision: params.decision,
    direction: params.ctx.direction,
    createdAt: new Date(),
  };
  await col.insertOne(doc as AiSafetyEventDoc);

  logger.info(
    {
      userId: params.ctx.userId?.toString(),
      projectId: params.ctx.projectId?.toString(),
      actionId: params.ctx.actionId?.toString(),
      rule: params.ruleTriggered,
      decision: params.decision,
      direction: params.ctx.direction,
    },
    "[SafetyGuard] Event recorded"
  );
}

export async function runInputSafetyCheck(ctx: SafetyCheckContext): Promise<SafetyCheckResult> {
  const text = ctx.text || "";
  if (!text.trim()) {
    return { decision: "allow" };
  }
  const { rules } = runHeuristics(text.toLowerCase());
  if (rules.length === 0) {
    return { decision: "allow" };
  }

  // Simple rule engine for input:
  // - malware, hate_speech => block
  // - data_exfiltration, prompt_injection => warn (log + allow)
  if (rules.includes("malware") || rules.includes("hate_speech")) {
    return {
      decision: "block",
      ruleTriggered: rules[0],
      reasons: rules,
    };
  }

  return {
    decision: "warn",
    ruleTriggered: rules[0],
    reasons: rules,
  };
}

export async function runOutputSafetyCheck(ctx: SafetyCheckContext): Promise<SafetyCheckResult> {
  const text = ctx.text || "";
  if (!text.trim()) {
    return { decision: "allow" };
  }
  const { rules } = runHeuristics(text.toLowerCase());
  if (rules.length === 0) {
    return { decision: "allow" };
  }

  // For output, prefer sanitize for hate_speech/malware, warn for injection/exfil.
  if (rules.includes("malware") || rules.includes("hate_speech")) {
    const sanitized = "[REDACTED: unsafe content removed by safety guard]";
    return {
      decision: "sanitize",
      ruleTriggered: rules[0],
      reasons: rules,
      sanitizedText: sanitized,
    };
  }

  return {
    decision: "warn",
    ruleTriggered: rules[0],
    reasons: rules,
  };
}

