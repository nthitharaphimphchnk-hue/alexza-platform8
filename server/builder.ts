/**
 * Builder AI - Chat threads, messages, Builder AI
 * Uses ALEXZA Managed Runtime internally.
 */

import { Router, type Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import type { ChatThreadDoc, ChatMessageDoc, ProposedAction } from "./models/types";
import { toPublicProposedAction } from "./models/actionDto";
import { runOpenAI } from "./providers/openai";

const router = Router();

const BUILDER_MODEL = process.env.BUILDER_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

const BUILDER_SYSTEM_PROMPT = `You are the ALEXZA Builder AI. Your job is to help users define API Actions for their AI project.

RULES:
1. Respond in Thai (friendly, direct).
2. Ask clarifying questions to understand the user's requirements.
3. When you have enough info, propose API Actions in a JSON block.
4. Use this exact format for proposed actions (NO provider, model, or gateway info):
\`\`\`json
{"proposedActions":[{"actionName":"snake_case_name","description":"...","inputSchema":{"type":"object","properties":{"input":{"type":"string","description":"..."}},"required":["input"]},"outputSchema":{"type":"object","properties":{"output":{"type":"string"}}},"promptTemplate":"You are a... User input: {{input}}"}]}
\`\`\`

5. actionName: URL-safe snake_case only (a-z, 0-9, underscore) e.g. summarize_text, chat_support
6. inputSchema: JSON Schema for the action's input (use {{variable}} in promptTemplate to reference)
7. outputSchema: optional JSON Schema for output
8. promptTemplate: system + user prompt, use {{input}} or {{fieldName}} for variables
9. Only output proposedActions when you have a complete, usable spec. Never include provider, model, or gateway fields.`;

function parseProjectId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function parseThreadId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

function err(res: Response, status: number, error: string, message: string) {
  return res.status(status).json({ ok: false, error, message });
}

function extractProposedActions(text: string): ProposedAction[] {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as { proposedActions?: ProposedAction[] };
    return Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [];
  } catch {
    return [];
  }
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await db.collection<ChatThreadDoc>("chat_threads").createIndex({ projectId: 1, updatedAt: -1 });
      await db.collection<ChatMessageDoc>("chat_messages").createIndex({ threadId: 1, createdAt: 1 });
    })();
  }
  return indexesReady;
}

async function ensureProjectAccess(projectId: ObjectId, userId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const project = await db.collection("projects").findOne({
    _id: projectId,
    ownerUserId: userId,
  });
  return !!project;
}

// POST /api/projects/:id/threads
router.post("/projects/:id/threads", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return err(res, 404, "NOT_FOUND", "Project not found");

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return err(res, 404, "NOT_FOUND", "Project not found");

    const body = req.body as { title?: unknown };
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New chat";

    const db = await getDb();
    const now = new Date();
    const doc: ChatThreadDoc = {
      userId: req.user._id,
      projectId,
      title,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<ChatThreadDoc>("chat_threads").insertOne(doc);
    const thread = await db.collection<ChatThreadDoc>("chat_threads").findOne({ _id: result.insertedId });
    if (!thread) throw new Error("Failed to load thread");

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Builder] Created thread ${thread._id} for project ${projectId}`);
    }
    return res.status(201).json({
      ok: true,
      thread: {
        id: thread._id.toString(),
        projectId: thread.projectId.toString(),
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/projects/:id/threads
router.get("/projects/:id/threads", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const projectId = parseProjectId(req.params.id);
    if (!projectId) return err(res, 404, "NOT_FOUND", "Project not found");

    const hasAccess = await ensureProjectAccess(projectId, req.user._id);
    if (!hasAccess) return err(res, 404, "NOT_FOUND", "Project not found");

    const db = await getDb();
    const threads = await db
      .collection<ChatThreadDoc>("chat_threads")
      .find({ projectId, userId: req.user._id })
      .sort({ updatedAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      threads: threads.map((t) => ({
        id: t._id.toString(),
        projectId: t.projectId.toString(),
        title: t.title,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/threads/:threadId/messages
router.get("/threads/:threadId/messages", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const threadId = parseThreadId(req.params.threadId);
    if (!threadId) return err(res, 404, "NOT_FOUND", "Thread not found");

    const db = await getDb();
    const thread = await db.collection<ChatThreadDoc>("chat_threads").findOne({
      _id: threadId,
      userId: req.user._id,
    });
    if (!thread) return err(res, 404, "NOT_FOUND", "Thread not found");

    const messages = await db
      .collection<ChatMessageDoc>("chat_messages")
      .find({ threadId })
      .sort({ createdAt: 1 })
      .toArray();

    return res.json({
      ok: true,
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/threads/:threadId/messages - append user msg, call Builder AI, return assistant + proposedActions
router.post("/threads/:threadId/messages", requireAuth, async (req, res, next) => {
  try {
    await ensureIndexes();
    if (!req.user) return err(res, 401, "UNAUTHORIZED", "Unauthorized");

    const threadId = parseThreadId(req.params.threadId);
    if (!threadId) return err(res, 404, "NOT_FOUND", "Thread not found");

    const body = req.body as { content?: unknown };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return err(res, 400, "VALIDATION_ERROR", "content is required");

    const db = await getDb();
    const thread = await db.collection<ChatThreadDoc>("chat_threads").findOne({
      _id: threadId,
      userId: req.user._id,
    });
    if (!thread) return err(res, 404, "NOT_FOUND", "Thread not found");

    const messagesCol = db.collection<ChatMessageDoc>("chat_messages");
    const threadsCol = db.collection<ChatThreadDoc>("chat_threads");

    // 1) Save user message
    await messagesCol.insertOne({
      threadId,
      role: "user",
      content,
      createdAt: new Date(),
    });

    // 1b) If first message, update thread title from content (or keep "New chat")
    const msgCount = await messagesCol.countDocuments({ threadId });
    if (msgCount === 1 && (thread.title === "New chat" || !thread.title)) {
      const titleFromMsg = content.slice(0, 50).trim() || "New chat";
      await threadsCol.updateOne(
        { _id: threadId },
        { $set: { title: titleFromMsg, updatedAt: new Date() } }
      );
    }

    // 2) Load history for context
    const history = await messagesCol.find({ threadId }).sort({ createdAt: 1 }).toArray();
    const openaiMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: BUILDER_SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    // 3) Call Builder AI (OpenAI)
    let assistantContent = "";
    try {
      const result = await runOpenAI({
        model: BUILDER_MODEL,
        messages: openaiMessages,
        temperature: 0.7,
        maxTokens: 2048,
      });
      assistantContent = result.output;
    } catch (e) {
      assistantContent = "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง";
    }

    // 4) Save assistant message
    const now = new Date();
    const insertResult = await messagesCol.insertOne({
      threadId,
      role: "assistant",
      content: assistantContent,
      createdAt: now,
    });

    // 5) Update thread updatedAt
    await threadsCol.updateOne({ _id: threadId }, { $set: { updatedAt: now } });

    // 6) Parse proposedActions from response, map to public DTO (no provider/model)
    const rawProposed = extractProposedActions(assistantContent);
    const proposedActions = rawProposed.map((pa) => toPublicProposedAction(pa as unknown as Record<string, unknown>));

    const assistantMessage = {
      id: insertResult.insertedId.toString(),
      role: "assistant" as const,
      content: assistantContent,
      createdAt: now,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Builder] Thread ${threadId} message saved, proposedActions=${proposedActions.length}`);
    }

    return res.json({
      ok: true,
      message: assistantMessage,
      assistantMessage,
      proposedActions,
    });
  } catch (e) {
    next(e);
  }
});

export { router as builderRouter };
