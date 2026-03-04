/**
 * Seed action_templates with 20 system templates.
 * Usage: pnpm exec tsx scripts/seed-templates.ts
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

interface TemplateSeed {
  name: string;
  description: string;
  category: "summarize" | "translate" | "extraction" | "writing" | "support" | "other";
  tags: string[];
  promptTemplate: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

const TEMPLATES: TemplateSeed[] = [
  {
    name: "Summarize Short",
    description: "Create a brief 2-3 sentence summary of the input text.",
    category: "summarize",
    tags: ["summary", "brief", "condense"],
    promptTemplate: "Summarize the following text in 2-3 concise sentences. Keep the key points.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to summarize" } },
      required: ["text"],
    },
  },
  {
    name: "Summarize Long",
    description: "Create a detailed summary with main points and sub-points.",
    category: "summarize",
    tags: ["summary", "detailed", "outline"],
    promptTemplate: "Provide a detailed summary of the following text. Include main points and key sub-points. Use bullet points for clarity.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to summarize" } },
      required: ["text"],
    },
  },
  {
    name: "Translate Thai to English",
    description: "Translate text from Thai to English.",
    category: "translate",
    tags: ["thai", "english", "translation"],
    promptTemplate: "Translate the following Thai text to English. Preserve tone and meaning.\n\nThai:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Thai text to translate" } },
      required: ["text"],
    },
  },
  {
    name: "Translate English to Thai",
    description: "Translate text from English to Thai.",
    category: "translate",
    tags: ["english", "thai", "translation"],
    promptTemplate: "Translate the following English text to Thai. Use natural Thai phrasing.\n\nEnglish:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "English text to translate" } },
      required: ["text"],
    },
  },
  {
    name: "Extract Contact Info",
    description: "Extract name, phone, and address from unstructured text.",
    category: "extraction",
    tags: ["extract", "contact", "name", "phone", "address"],
    promptTemplate: "Extract the following from the text: name, phone number, and address. Return as JSON.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text containing contact info" } },
      required: ["text"],
    },
    outputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
      },
    },
  },
  {
    name: "Extract Key Entities",
    description: "Extract names, dates, and organizations from text.",
    category: "extraction",
    tags: ["extract", "entities", "NER"],
    promptTemplate: "Extract all person names, dates, and organization names from the following text. List each category separately.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to analyze" } },
      required: ["text"],
    },
  },
  {
    name: "Write Ad Copy AIDA",
    description: "Generate ad copy using the AIDA framework (Attention, Interest, Desire, Action).",
    category: "writing",
    tags: ["ad", "copy", "AIDA", "marketing"],
    promptTemplate: "Write ad copy for the following product using the AIDA framework:\n- Attention: Hook the reader\n- Interest: Build interest with benefits\n- Desire: Create desire\n- Action: Clear call-to-action\n\nProduct: {{product}}\nTarget audience: {{audience}}",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string", description: "Product or service name" },
        audience: { type: "string", description: "Target audience" },
      },
      required: ["product", "audience"],
    },
  },
  {
    name: "Generate FAQ from Text",
    description: "Generate frequently asked questions from a given text.",
    category: "writing",
    tags: ["FAQ", "questions", "content"],
    promptTemplate: "Generate 5-7 relevant FAQ questions and answers based on the following text. Format as Q: ... A: ...\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Source text" } },
      required: ["text"],
    },
  },
  {
    name: "Rewrite Formal Tone",
    description: "Rewrite text in a formal, professional tone.",
    category: "writing",
    tags: ["rewrite", "formal", "professional"],
    promptTemplate: "Rewrite the following text in a formal, professional tone. Keep the same meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to rewrite" } },
      required: ["text"],
    },
  },
  {
    name: "Rewrite Casual Tone",
    description: "Rewrite text in a friendly, casual tone.",
    category: "writing",
    tags: ["rewrite", "casual", "friendly"],
    promptTemplate: "Rewrite the following text in a friendly, casual tone. Keep the same meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to rewrite" } },
      required: ["text"],
    },
  },
  {
    name: "Email Draft Generator",
    description: "Generate a professional email draft from a brief description.",
    category: "writing",
    tags: ["email", "draft", "professional"],
    promptTemplate: "Write a professional email based on the following:\n\nPurpose: {{purpose}}\nKey points to include: {{points}}\nTone: {{tone}}",
    inputSchema: {
      type: "object",
      properties: {
        purpose: { type: "string", description: "Email purpose" },
        points: { type: "string", description: "Key points to include" },
        tone: { type: "string", description: "Formal, friendly, or urgent" },
      },
      required: ["purpose", "points"],
    },
  },
  {
    name: "Product Description Generator",
    description: "Generate a compelling product description from key features.",
    category: "writing",
    tags: ["product", "description", "ecommerce"],
    promptTemplate: "Write a compelling product description (150-200 words) for:\n\nProduct name: {{name}}\nKey features: {{features}}\nTarget customer: {{customer}}",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Product name" },
        features: { type: "string", description: "Key features" },
        customer: { type: "string", description: "Target customer" },
      },
      required: ["name", "features"],
    },
  },
  {
    name: "Support Ticket Triage",
    description: "Categorize and summarize a support ticket.",
    category: "support",
    tags: ["support", "triage", "ticket"],
    promptTemplate: "Analyze this support ticket and provide:\n1. Category (billing, technical, account, other)\n2. Priority (low, medium, high, urgent)\n3. Brief summary\n4. Suggested response outline\n\nTicket:\n{{ticket}}",
    inputSchema: {
      type: "object",
      properties: { ticket: { type: "string", description: "Support ticket content" } },
      required: ["ticket"],
    },
  },
  {
    name: "Support Response Draft",
    description: "Draft a helpful support response.",
    category: "support",
    tags: ["support", "response", "customer"],
    promptTemplate: "Draft a helpful, empathetic support response to this customer message. Be professional and solution-oriented.\n\nCustomer message:\n{{message}}\n\nContext: {{context}}",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Customer message" },
        context: { type: "string", description: "Additional context" },
      },
      required: ["message"],
    },
  },
  {
    name: "Blog Post Outline",
    description: "Generate a blog post outline from a topic.",
    category: "writing",
    tags: ["blog", "outline", "content"],
    promptTemplate: "Create a detailed blog post outline for the topic: {{topic}}\n\nInclude: title, intro, 4-6 main sections with sub-points, conclusion, and CTA.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "Blog topic" } },
      required: ["topic"],
    },
  },
  {
    name: "Social Media Post",
    description: "Generate a social media post from key message.",
    category: "writing",
    tags: ["social", "post", "marketing"],
    promptTemplate: "Create a {{platform}} post (max {{maxLength}} chars) for:\n\nMessage: {{message}}\nInclude a call-to-action if appropriate.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Key message" },
        platform: { type: "string", description: "twitter, linkedin, instagram" },
        maxLength: { type: "number", description: "Max character count" },
      },
      required: ["message"],
    },
  },
  {
    name: "Meeting Notes Summary",
    description: "Summarize meeting notes into action items and key decisions.",
    category: "summarize",
    tags: ["meeting", "notes", "action items"],
    promptTemplate: "Summarize these meeting notes. Extract:\n1. Key decisions\n2. Action items (who, what, when)\n3. Open questions\n\nNotes:\n{{notes}}",
    inputSchema: {
      type: "object",
      properties: { notes: { type: "string", description: "Meeting notes" } },
      required: ["notes"],
    },
  },
  {
    name: "Paraphrase",
    description: "Paraphrase text while preserving meaning.",
    category: "writing",
    tags: ["paraphrase", "rewrite"],
    promptTemplate: "Paraphrase the following text. Use different words and structure while keeping the exact same meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to paraphrase" } },
      required: ["text"],
    },
  },
  {
    name: "Expand Bullet Points",
    description: "Expand bullet points into full paragraphs.",
    category: "writing",
    tags: ["expand", "bullet", "paragraph"],
    promptTemplate: "Expand these bullet points into well-written paragraphs. Maintain flow and add appropriate transitions.\n\nBullet points:\n{{bullets}}",
    inputSchema: {
      type: "object",
      properties: { bullets: { type: "string", description: "Bullet points to expand" } },
      required: ["bullets"],
    },
  },
  {
    name: "Simplify Complex Text",
    description: "Simplify complex text for a general audience.",
    category: "writing",
    tags: ["simplify", "plain language"],
    promptTemplate: "Simplify the following text for a general audience. Use plain language and short sentences. Keep the core message.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Complex text" } },
      required: ["text"],
    },
  },
];

async function main() {
  const { getDb } = await import("../server/db");
  const db = await getDb();
  const col = db.collection("action_templates");

  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const defaultModel = hasOpenRouter ? "openai/gpt-4o" : "gpt-4o";

  const now = new Date();
  let inserted = 0;

  for (const t of TEMPLATES) {
    const existing = await col.findOne({
      name: t.name,
      createdBy: "system",
    });
    if (existing) {
      console.log(`[seed-templates] Skip (exists): ${t.name}`);
      continue;
    }

    await col.insertOne({
      ...t,
      defaultModel,
      createdBy: "system",
      visibility: "public",
      createdAt: now,
      updatedAt: now,
    });
    inserted++;
    console.log(`[seed-templates] Created: ${t.name}`);
  }

  console.log(`[seed-templates] Done. Inserted ${inserted} templates.`);
}

main().catch((err) => {
  console.error("[seed-templates]", err);
  process.exit(1);
});
