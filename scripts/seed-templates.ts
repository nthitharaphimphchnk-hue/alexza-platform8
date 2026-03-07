/**
 * Seed action_templates with 50-100 high-quality AI templates.
 * Also publishes system templates to marketplace_templates.
 * Usage: pnpm exec tsx scripts/seed-templates.ts
 */

import dotenv from "dotenv";
import path from "path";
import { ObjectId } from "mongodb";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

type Category = "content" | "marketing" | "data_extraction" | "productivity" | "agents" | "summarize" | "translate" | "extraction" | "writing" | "support" | "other";

interface TemplateSeed {
  name: string;
  description: string;
  category: Category;
  tags: string[];
  promptTemplate: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

const TEMPLATES: TemplateSeed[] = [
  // === CONTENT ===
  {
    name: "Blog Generator",
    description: "Generate a full blog post from a topic and key points.",
    category: "content",
    tags: ["blog", "content", "seo", "writing"],
    promptTemplate: "Write a comprehensive blog post (800-1200 words) on: {{topic}}\n\nKey points to cover: {{keyPoints}}\n\nInclude: engaging intro, well-structured sections with headers, conclusion, and call-to-action. Use a conversational yet professional tone.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Blog topic" },
        keyPoints: { type: "string", description: "Key points to cover" },
      },
      required: ["topic"],
    },
  },
  {
    name: "Blog Post Outline",
    description: "Generate a detailed blog post outline from a topic.",
    category: "content",
    tags: ["blog", "outline", "content", "structure"],
    promptTemplate: "Create a detailed blog post outline for: {{topic}}\n\nInclude: title, intro hook, 4-6 main sections with sub-points, conclusion, and CTA. Make it SEO-friendly.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "Blog topic" } },
      required: ["topic"],
    },
  },
  {
    name: "Content Rewriter",
    description: "Rewrite content while preserving meaning and improving clarity.",
    category: "content",
    tags: ["content", "rewrite", "clarity", "writing"],
    promptTemplate: "Rewrite the following content. Improve clarity and flow while preserving the exact meaning. Use varied sentence structure.\n\nContent:\n{{content}}",
    inputSchema: {
      type: "object",
      properties: { content: { type: "string", description: "Content to rewrite" } },
      required: ["content"],
    },
  },
  {
    name: "Headline Generator",
    description: "Generate multiple catchy headlines for content.",
    category: "content",
    tags: ["headline", "content", "marketing", "seo"],
    promptTemplate: "Generate 5 compelling headlines for: {{topic}}\n\nTarget audience: {{audience}}\n\nMix styles: curiosity, benefit-driven, how-to, list, and question. Each under 60 characters.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Content topic" },
        audience: { type: "string", description: "Target audience" },
      },
      required: ["topic"],
    },
  },
  {
    name: "Long-form Article Writer",
    description: "Write in-depth long-form articles (2000+ words).",
    category: "content",
    tags: ["article", "long-form", "content", "seo"],
    promptTemplate: "Write a comprehensive long-form article (2000+ words) on: {{topic}}\n\nResearch angle: {{angle}}\n\nInclude: executive summary, detailed sections with data/evidence, expert perspectives, actionable takeaways, and conclusion. Use subheadings and bullet points for readability.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Article topic" },
        angle: { type: "string", description: "Research or perspective angle" },
      },
      required: ["topic"],
    },
  },
  // === MARKETING ===
  {
    name: "SEO Article Writer",
    description: "Write SEO-optimized articles with target keywords.",
    category: "marketing",
    tags: ["seo", "content", "marketing", "keywords"],
    promptTemplate: "Write an SEO-optimized article (1000-1500 words) on: {{topic}}\n\nPrimary keyword: {{keyword}}\nSecondary keywords: {{secondaryKeywords}}\n\nInclude: meta description, H1, H2/H3 structure, keyword placement, internal linking suggestions, and conclusion. Write for humans first, optimize for search second.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Article topic" },
        keyword: { type: "string", description: "Primary keyword" },
        secondaryKeywords: { type: "string", description: "Secondary keywords (comma-separated)" },
      },
      required: ["topic", "keyword"],
    },
  },
  {
    name: "Product Description Generator",
    description: "Generate compelling e-commerce product descriptions.",
    category: "marketing",
    tags: ["product", "ecommerce", "marketing", "sales"],
    promptTemplate: "Write a compelling product description (150-250 words) for:\n\nProduct: {{name}}\nKey features: {{features}}\nTarget customer: {{customer}}\n\nUse benefit-focused language, include a clear value proposition, and end with a soft CTA. Optimize for conversion.",
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
    name: "Email Campaign Writer",
    description: "Write persuasive email campaign copy.",
    category: "marketing",
    tags: ["email", "campaign", "marketing", "automation"],
    promptTemplate: "Write an email campaign for: {{campaignPurpose}}\n\nAudience: {{audience}}\nKey message: {{message}}\n\nInclude: subject line (A/B variant), preheader, opening hook, body (2-3 short paragraphs), CTA button text, and PS. Keep under 150 words for body.",
    inputSchema: {
      type: "object",
      properties: {
        campaignPurpose: { type: "string", description: "Campaign purpose" },
        audience: { type: "string", description: "Target audience" },
        message: { type: "string", description: "Key message" },
      },
      required: ["campaignPurpose", "audience"],
    },
  },
  {
    name: "Lead Follow-up Email",
    description: "Generate personalized lead follow-up emails.",
    category: "marketing",
    tags: ["email", "lead", "sales", "follow-up"],
    promptTemplate: "Write a personalized follow-up email for a lead.\n\nLead context: {{context}}\nPrevious interaction: {{previousInteraction}}\nGoal: {{goal}}\n\nKeep it concise (under 100 words), personalized, and include one clear CTA. Sound human, not salesy.",
    inputSchema: {
      type: "object",
      properties: {
        context: { type: "string", description: "Lead context" },
        previousInteraction: { type: "string", description: "Previous interaction" },
        goal: { type: "string", description: "Follow-up goal" },
      },
      required: ["context"],
    },
  },
  {
    name: "Ad Copy AIDA",
    description: "Generate ad copy using AIDA framework.",
    category: "marketing",
    tags: ["ad", "copy", "AIDA", "marketing"],
    promptTemplate: "Write ad copy for {{product}} using AIDA:\n- Attention: Hook the reader\n- Interest: Build interest with benefits\n- Desire: Create desire\n- Action: Clear CTA\n\nTarget: {{audience}}",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string", description: "Product or service" },
        audience: { type: "string", description: "Target audience" },
      },
      required: ["product", "audience"],
    },
  },
  {
    name: "Social Media Post",
    description: "Generate platform-optimized social media posts.",
    category: "marketing",
    tags: ["social", "marketing", "post", "content"],
    promptTemplate: "Create a {{platform}} post for:\n\nMessage: {{message}}\nTone: {{tone}}\n\nMax {{maxLength}} characters. Include hashtags if appropriate. Add a call-to-action.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Key message" },
        platform: { type: "string", description: "twitter, linkedin, instagram, facebook" },
        tone: { type: "string", description: "professional, casual, playful" },
        maxLength: { type: "number", description: "Max character count" },
      },
      required: ["message"],
    },
  },
  {
    name: "Landing Page Copy",
    description: "Write conversion-focused landing page copy.",
    category: "marketing",
    tags: ["landing", "conversion", "marketing", "copy"],
    promptTemplate: "Write landing page copy for: {{product}}\n\nValue proposition: {{valueProp}}\nTarget audience: {{audience}}\n\nInclude: hero headline, subheadline, 3 benefit bullets, social proof placeholder, and CTA. Focus on conversion.",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string", description: "Product/service" },
        valueProp: { type: "string", description: "Value proposition" },
        audience: { type: "string", description: "Target audience" },
      },
      required: ["product", "valueProp"],
    },
  },
  {
    name: "Meta Description Generator",
    description: "Generate SEO meta descriptions.",
    category: "marketing",
    tags: ["seo", "meta", "marketing"],
    promptTemplate: "Write an SEO meta description (150-160 chars) for:\n\nPage title: {{title}}\nContent summary: {{summary}}\nPrimary keyword: {{keyword}}",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Page title" },
        summary: { type: "string", description: "Content summary" },
        keyword: { type: "string", description: "Primary keyword" },
      },
      required: ["title", "summary"],
    },
  },
  // === DATA EXTRACTION ===
  {
    name: "Resume Parser",
    description: "Extract structured data from resume text.",
    category: "data_extraction",
    tags: ["resume", "extract", "parsing", "hr"],
    promptTemplate: "Extract structured data from this resume. Return JSON with: name, email, phone, summary, education (array), experience (array with title, company, dates, description), skills (array), certifications.",
    inputSchema: {
      type: "object",
      properties: { resume: { type: "string", description: "Resume text" } },
      required: ["resume"],
    },
    outputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        summary: { type: "string" },
        education: { type: "array" },
        experience: { type: "array" },
        skills: { type: "array" },
        certifications: { type: "array" },
      },
    },
  },
  {
    name: "Contact Info Extractor",
    description: "Extract name, email, phone, address from text.",
    category: "data_extraction",
    tags: ["contact", "extract", "parsing"],
    promptTemplate: "Extract contact information from the text. Return JSON: name, email, phone, address. If not found, use null.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to parse" } },
      required: ["text"],
    },
    outputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
      },
    },
  },
  {
    name: "Invoice Data Extractor",
    description: "Extract invoice fields from text.",
    category: "data_extraction",
    tags: ["invoice", "extract", "finance"],
    promptTemplate: "Extract invoice data from the text. Return JSON: vendor, invoiceNumber, date, dueDate, lineItems (array with description, quantity, unitPrice, total), subtotal, tax, total.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Invoice text" } },
      required: ["text"],
    },
    outputSchema: {
      type: "object",
      properties: {
        vendor: { type: "string" },
        invoiceNumber: { type: "string" },
        date: { type: "string" },
        dueDate: { type: "string" },
        lineItems: { type: "array" },
        subtotal: { type: "number" },
        tax: { type: "number" },
        total: { type: "number" },
      },
    },
  },
  {
    name: "Key Entities Extractor",
    description: "Extract names, dates, organizations from text.",
    category: "data_extraction",
    tags: ["extract", "entities", "NER"],
    promptTemplate: "Extract person names, dates, and organization names from the text. Return JSON: { people: [], dates: [], organizations: [] }",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to analyze" } },
      required: ["text"],
    },
    outputSchema: {
      type: "object",
      properties: {
        people: { type: "array" },
        dates: { type: "array" },
        organizations: { type: "array" },
      },
    },
  },
  {
    name: "Structured Data from Unstructured",
    description: "Convert unstructured text to structured JSON.",
    category: "data_extraction",
    tags: ["extract", "structured", "json"],
    promptTemplate: "Convert this unstructured text into structured JSON. Identify the main entities and relationships. Output valid JSON only.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Unstructured text" } },
      required: ["text"],
    },
  },
  // === PRODUCTIVITY ===
  {
    name: "Meeting Notes Summarizer",
    description: "Summarize meeting notes into action items and decisions.",
    category: "productivity",
    tags: ["meeting", "notes", "summary", "action items"],
    promptTemplate: "Summarize these meeting notes. Extract:\n1. Key decisions\n2. Action items (who, what, when)\n3. Open questions\n4. Next steps\n\nNotes:\n{{notes}}",
    inputSchema: {
      type: "object",
      properties: { notes: { type: "string", description: "Meeting notes" } },
      required: ["notes"],
    },
  },
  {
    name: "Meeting Notes Summarizer (Brief)",
    description: "Create a brief 2-3 sentence summary of meeting notes.",
    category: "productivity",
    tags: ["meeting", "summary", "brief"],
    promptTemplate: "Summarize these meeting notes in 2-3 concise sentences. Focus on outcomes and next steps.\n\nNotes:\n{{notes}}",
    inputSchema: {
      type: "object",
      properties: { notes: { type: "string", description: "Meeting notes" } },
      required: ["notes"],
    },
  },
  {
    name: "Email Draft Generator",
    description: "Generate professional email drafts.",
    category: "productivity",
    tags: ["email", "draft", "professional", "productivity"],
    promptTemplate: "Write a professional email:\n\nPurpose: {{purpose}}\nKey points: {{points}}\nTone: {{tone}}",
    inputSchema: {
      type: "object",
      properties: {
        purpose: { type: "string", description: "Email purpose" },
        points: { type: "string", description: "Key points" },
        tone: { type: "string", description: "Formal, friendly, urgent" },
      },
      required: ["purpose", "points"],
    },
  },
  {
    name: "Task List from Notes",
    description: "Extract actionable tasks from notes.",
    category: "productivity",
    tags: ["tasks", "productivity", "extract"],
    promptTemplate: "Extract actionable tasks from these notes. For each: task description, assignee (if mentioned), priority (high/medium/low), due date (if mentioned). Format as a clear list.",
    inputSchema: {
      type: "object",
      properties: { notes: { type: "string", description: "Notes" } },
      required: ["notes"],
    },
  },
  {
    name: "Document Summarizer",
    description: "Summarize long documents.",
    category: "productivity",
    tags: ["summary", "document", "productivity"],
    promptTemplate: "Provide a detailed summary of this document. Include: main thesis, key arguments, supporting evidence, conclusions. Use bullet points for clarity.\n\nDocument:\n{{document}}",
    inputSchema: {
      type: "object",
      properties: { document: { type: "string", description: "Document text" } },
      required: ["document"],
    },
  },
  {
    name: "Expand Bullet Points",
    description: "Expand bullet points into full paragraphs.",
    category: "productivity",
    tags: ["expand", "bullet", "writing"],
    promptTemplate: "Expand these bullet points into well-written paragraphs. Add transitions and flow.\n\nBullets:\n{{bullets}}",
    inputSchema: {
      type: "object",
      properties: { bullets: { type: "string", description: "Bullet points" } },
      required: ["bullets"],
    },
  },
  {
    name: "Simplify Complex Text",
    description: "Simplify text for general audience.",
    category: "productivity",
    tags: ["simplify", "plain language", "clarity"],
    promptTemplate: "Simplify this text for a general audience. Use plain language and short sentences. Keep the core message.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Complex text" } },
      required: ["text"],
    },
  },
  {
    name: "Paraphrase",
    description: "Paraphrase text while preserving meaning.",
    category: "productivity",
    tags: ["paraphrase", "rewrite"],
    promptTemplate: "Paraphrase the following. Use different words and structure while keeping the exact meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to paraphrase" } },
      required: ["text"],
    },
  },
  // === AGENTS ===
  {
    name: "Research Agent",
    description: "Synthesize research and provide structured findings.",
    category: "agents",
    tags: ["research", "agent", "synthesis"],
    promptTemplate: "Act as a research assistant. Given the topic and any provided sources, synthesize findings into:\n1. Executive summary\n2. Key findings (bullet points)\n3. Gaps or areas for further research\n4. Recommended next steps\n\nTopic: {{topic}}\nSources/context: {{sources}}",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Research topic" },
        sources: { type: "string", description: "Source material or context" },
      },
      required: ["topic"],
    },
  },
  {
    name: "Customer Support Agent",
    description: "Draft empathetic support responses.",
    category: "agents",
    tags: ["support", "customer", "agent"],
    promptTemplate: "Act as a customer support agent. Draft a helpful, empathetic response to:\n\nCustomer message: {{message}}\nContext: {{context}}\n\nBe professional, solution-oriented, and acknowledge the customer's concern. If you need more info, ask one clear question.",
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
    name: "Sales Assistant Agent",
    description: "Generate sales outreach and follow-up content.",
    category: "agents",
    tags: ["sales", "agent", "outreach"],
    promptTemplate: "Act as a sales assistant. Generate {{type}} for:\n\nProspect: {{prospect}}\nProduct: {{product}}\nContext: {{context}}\n\nKeep it personalized, concise, and value-focused. Avoid being pushy.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "cold_email, follow_up, proposal_intro" },
        prospect: { type: "string", description: "Prospect info" },
        product: { type: "string", description: "Product/service" },
        context: { type: "string", description: "Context" },
      },
      required: ["type", "prospect", "product"],
    },
  },
  {
    name: "Support Ticket Triage",
    description: "Categorize and prioritize support tickets.",
    category: "agents",
    tags: ["support", "triage", "ticket"],
    promptTemplate: "Analyze this support ticket. Provide:\n1. Category (billing, technical, account, other)\n2. Priority (low, medium, high, urgent)\n3. Brief summary\n4. Suggested response outline\n\nTicket: {{ticket}}",
    inputSchema: {
      type: "object",
      properties: { ticket: { type: "string", description: "Ticket content" } },
      required: ["ticket"],
    },
  },
  {
    name: "Support Response Draft",
    description: "Draft support responses.",
    category: "agents",
    tags: ["support", "response", "customer"],
    promptTemplate: "Draft a helpful support response to:\n\nMessage: {{message}}\nContext: {{context}}\n\nBe empathetic and solution-oriented.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Customer message" },
        context: { type: "string", description: "Context" },
      },
      required: ["message"],
    },
  },
  {
    name: "FAQ Generator",
    description: "Generate FAQ from content.",
    category: "content",
    tags: ["faq", "content", "support"],
    promptTemplate: "Generate 5-7 FAQ Q&A pairs from this content. Format as Q: ... A: ...\n\nContent:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Source content" } },
      required: ["text"],
    },
  },
  // === LEGACY / EXISTING ===
  {
    name: "Summarize Short",
    description: "Create a brief 2-3 sentence summary.",
    category: "summarize",
    tags: ["summary", "brief", "condense"],
    promptTemplate: "Summarize in 2-3 concise sentences. Keep key points.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to summarize" } },
      required: ["text"],
    },
  },
  {
    name: "Summarize Long",
    description: "Create a detailed summary with main points.",
    category: "summarize",
    tags: ["summary", "detailed", "outline"],
    promptTemplate: "Provide a detailed summary. Include main points and key sub-points. Use bullet points.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to summarize" } },
      required: ["text"],
    },
  },
  {
    name: "Translate Thai to English",
    description: "Translate Thai to English.",
    category: "translate",
    tags: ["thai", "english", "translation"],
    promptTemplate: "Translate this Thai to English. Preserve tone and meaning.\n\nThai:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Thai text" } },
      required: ["text"],
    },
  },
  {
    name: "Translate English to Thai",
    description: "Translate English to Thai.",
    category: "translate",
    tags: ["english", "thai", "translation"],
    promptTemplate: "Translate this English to Thai. Use natural Thai phrasing.\n\nEnglish:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "English text" } },
      required: ["text"],
    },
  },
  {
    name: "Rewrite Formal",
    description: "Rewrite in formal, professional tone.",
    category: "writing",
    tags: ["rewrite", "formal", "professional"],
    promptTemplate: "Rewrite in a formal, professional tone. Keep the same meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to rewrite" } },
      required: ["text"],
    },
  },
  {
    name: "Rewrite Casual",
    description: "Rewrite in friendly, casual tone.",
    category: "writing",
    tags: ["rewrite", "casual", "friendly"],
    promptTemplate: "Rewrite in a friendly, casual tone. Keep the same meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to rewrite" } },
      required: ["text"],
    },
  },
  // === ADDITIONAL TEMPLATES (50-100 total) ===
  {
    name: "LinkedIn Post Generator",
    description: "Generate professional LinkedIn posts.",
    category: "marketing",
    tags: ["linkedin", "social", "marketing", "professional"],
    promptTemplate: "Write a LinkedIn post (150-200 words) for:\n\nTopic: {{topic}}\nTone: {{tone}}\n\nInclude a hook, value, and soft CTA. Use line breaks for readability.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Post topic" },
        tone: { type: "string", description: "professional, thought-leader, casual" },
      },
      required: ["topic"],
    },
  },
  {
    name: "Twitter Thread Writer",
    description: "Create Twitter/X threads.",
    category: "marketing",
    tags: ["twitter", "thread", "social", "marketing"],
    promptTemplate: "Write a Twitter thread (5-7 tweets) on: {{topic}}\n\nEach tweet max 280 chars. Number the tweets. End with a CTA or question.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "Thread topic" } },
      required: ["topic"],
    },
  },
  {
    name: "Press Release Writer",
    description: "Write professional press releases.",
    category: "marketing",
    tags: ["press", "release", "pr", "marketing"],
    promptTemplate: "Write a press release for:\n\nHeadline: {{headline}}\nKey facts: {{facts}}\nQuote: {{quote}}\nBoilerplate: {{boilerplate}}\n\nUse AP style. Include dateline and contact info placeholder.",
    inputSchema: {
      type: "object",
      properties: {
        headline: { type: "string", description: "Headline" },
        facts: { type: "string", description: "Key facts" },
        quote: { type: "string", description: "Quote to include" },
        boilerplate: { type: "string", description: "Company boilerplate" },
      },
      required: ["headline", "facts"],
    },
  },
  {
    name: "Job Description Writer",
    description: "Generate job descriptions.",
    category: "content",
    tags: ["hr", "job", "recruitment"],
    promptTemplate: "Write a job description for: {{role}}\n\nCompany: {{company}}\nKey responsibilities: {{responsibilities}}\nRequirements: {{requirements}}\n\nInclude: title, summary, responsibilities, requirements, benefits placeholder.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", description: "Job role" },
        company: { type: "string", description: "Company name" },
        responsibilities: { type: "string", description: "Key responsibilities" },
        requirements: { type: "string", description: "Requirements" },
      },
      required: ["role"],
    },
  },
  {
    name: "Case Study Writer",
    description: "Write customer case studies.",
    category: "marketing",
    tags: ["case study", "marketing", "content"],
    promptTemplate: "Write a case study (500-700 words) for:\n\nCustomer: {{customer}}\nChallenge: {{challenge}}\nSolution: {{solution}}\nResults: {{results}}\n\nUse storytelling structure: challenge, solution, results, quote placeholder.",
    inputSchema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "Customer name" },
        challenge: { type: "string", description: "Challenge" },
        solution: { type: "string", description: "Solution" },
        results: { type: "string", description: "Results" },
      },
      required: ["customer", "challenge", "solution", "results"],
    },
  },
  {
    name: "Review Responder",
    description: "Draft responses to customer reviews.",
    category: "agents",
    tags: ["review", "customer", "support"],
    promptTemplate: "Draft a response to this {{sentiment}} review:\n\nReview: {{review}}\n\nThank the customer, address the feedback, and if negative, offer to help. Keep under 100 words.",
    inputSchema: {
      type: "object",
      properties: {
        review: { type: "string", description: "Review text" },
        sentiment: { type: "string", description: "positive, negative, neutral" },
      },
      required: ["review"],
    },
  },
  {
    name: "Competitor Analysis",
    description: "Analyze competitor from description.",
    category: "marketing",
    tags: ["competitor", "analysis", "marketing"],
    promptTemplate: "Analyze this competitor:\n\nDescription: {{description}}\n\nProvide: strengths, weaknesses, positioning, differentiation opportunities. Use bullet points.",
    inputSchema: {
      type: "object",
      properties: { description: { type: "string", description: "Competitor description" } },
      required: ["description"],
    },
  },
  {
    name: "Value Proposition Generator",
    description: "Create value propositions.",
    category: "marketing",
    tags: ["value prop", "marketing", "positioning"],
    promptTemplate: "Create 3 value proposition options for:\n\nProduct: {{product}}\nTarget: {{target}}\nKey benefit: {{benefit}}\n\nEach 1-2 sentences. Focus on outcome, not features.",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string", description: "Product" },
        target: { type: "string", description: "Target audience" },
        benefit: { type: "string", description: "Key benefit" },
      },
      required: ["product", "target"],
    },
  },
  {
    name: "Contract Clause Extractor",
    description: "Extract key clauses from contract text.",
    category: "data_extraction",
    tags: ["contract", "extract", "legal"],
    promptTemplate: "Extract key clauses from this contract. Identify: parties, term, termination, liability, indemnification, payment terms. Return structured summary.",
    inputSchema: {
      type: "object",
      properties: { contract: { type: "string", description: "Contract text" } },
      required: ["contract"],
    },
  },
  {
    name: "Survey Response Analyzer",
    description: "Summarize and analyze survey responses.",
    category: "data_extraction",
    tags: ["survey", "analysis", "feedback"],
    promptTemplate: "Analyze these survey responses:\n\nQuestion: {{question}}\nResponses: {{responses}}\n\nProvide: summary, common themes, sentiment, key quotes, recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Survey question" },
        responses: { type: "string", description: "Responses" },
      },
      required: ["question", "responses"],
    },
  },
  {
    name: "Transcript Summarizer",
    description: "Summarize audio/video transcripts.",
    category: "productivity",
    tags: ["transcript", "summary", "meeting"],
    promptTemplate: "Summarize this transcript. Include: main topics, key points, decisions, action items, next steps.\n\nTranscript:\n{{transcript}}",
    inputSchema: {
      type: "object",
      properties: { transcript: { type: "string", description: "Transcript text" } },
      required: ["transcript"],
    },
  },
  {
    name: "Proposal Writer",
    description: "Draft project proposals.",
    category: "content",
    tags: ["proposal", "sales", "business"],
    promptTemplate: "Draft a proposal section for:\n\nSection: {{section}}\nProject: {{project}}\nClient: {{client}}\nKey points: {{points}}\n\nWrite professionally and persuasively.",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string", description: "Section (executive_summary, approach, deliverables)" },
        project: { type: "string", description: "Project description" },
        client: { type: "string", description: "Client name" },
        points: { type: "string", description: "Key points" },
      },
      required: ["section", "project"],
    },
  },
  {
    name: "Cold Email Writer",
    description: "Write personalized cold outreach emails.",
    category: "marketing",
    tags: ["cold email", "sales", "outreach"],
    promptTemplate: "Write a cold email for:\n\nProspect: {{prospect}}\nProduct: {{product}}\nValue prop: {{valueProp}}\n\nKeep under 150 words. Personalize opening. One clear CTA.",
    inputSchema: {
      type: "object",
      properties: {
        prospect: { type: "string", description: "Prospect info" },
        product: { type: "string", description: "Product" },
        valueProp: { type: "string", description: "Value proposition" },
      },
      required: ["prospect", "product"],
    },
  },
  {
    name: "Thank You Email",
    description: "Generate thank you emails.",
    category: "productivity",
    tags: ["email", "thank you", "follow-up"],
    promptTemplate: "Write a thank you email for: {{occasion}}\n\nContext: {{context}}\nTone: {{tone}}\n\nKeep concise and genuine.",
    inputSchema: {
      type: "object",
      properties: {
        occasion: { type: "string", description: "Meeting, interview, purchase" },
        context: { type: "string", description: "Context" },
        tone: { type: "string", description: "warm, formal, brief" },
      },
      required: ["occasion"],
    },
  },
  {
    name: "Apology Email",
    description: "Draft apology/customer recovery emails.",
    category: "agents",
    tags: ["apology", "customer", "support"],
    promptTemplate: "Draft an apology email for:\n\nIssue: {{issue}}\nResolution: {{resolution}}\n\nAcknowledge the problem, apologize sincerely, explain resolution, offer goodwill if appropriate.",
    inputSchema: {
      type: "object",
      properties: {
        issue: { type: "string", description: "What went wrong" },
        resolution: { type: "string", description: "How it's being fixed" },
      },
      required: ["issue"],
    },
  },
  {
    name: "Onboarding Email Sequence",
    description: "Create onboarding email sequence.",
    category: "marketing",
    tags: ["onboarding", "email", "automation"],
    promptTemplate: "Write email {{number}} of a {{total}}-email onboarding sequence for: {{product}}\n\nGoal of this email: {{goal}}\nPrevious emails covered: {{previous}}\n\nKeep under 150 words. One CTA.",
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "number", description: "Email number in sequence" },
        total: { type: "number", description: "Total emails" },
        product: { type: "string", description: "Product" },
        goal: { type: "string", description: "This email's goal" },
        previous: { type: "string", description: "What previous emails covered" },
      },
      required: ["number", "total", "product", "goal"],
    },
  },
  {
    name: "Product Comparison",
    description: "Generate product comparison content.",
    category: "content",
    tags: ["product", "comparison", "content"],
    promptTemplate: "Write a comparison of {{productA}} vs {{productB}}.\n\nAudience: {{audience}}\nFocus: {{focus}}\n\nInclude: overview, feature comparison, pros/cons, recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        productA: { type: "string", description: "Product A" },
        productB: { type: "string", description: "Product B" },
        audience: { type: "string", description: "Target audience" },
        focus: { type: "string", description: "Comparison focus" },
      },
      required: ["productA", "productB"],
    },
  },
  {
    name: "How-To Guide Writer",
    description: "Write step-by-step how-to guides.",
    category: "content",
    tags: ["how-to", "guide", "content"],
    promptTemplate: "Write a how-to guide for: {{task}}\n\nAudience: {{audience}}\nPrerequisites: {{prerequisites}}\n\nInclude: intro, numbered steps, tips, troubleshooting, conclusion.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task to explain" },
        audience: { type: "string", description: "Target audience" },
        prerequisites: { type: "string", description: "Prerequisites" },
      },
      required: ["task"],
    },
  },
  {
    name: "Tone Changer",
    description: "Rewrite text in a different tone.",
    category: "writing",
    tags: ["tone", "rewrite", "style"],
    promptTemplate: "Rewrite this text in a {{tone}} tone. Keep the same meaning.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Original text" },
        tone: { type: "string", description: "professional, casual, friendly, formal, urgent" },
      },
      required: ["text", "tone"],
    },
  },
  {
    name: "Grammar and Style Fix",
    description: "Fix grammar and improve style.",
    category: "writing",
    tags: ["grammar", "style", "edit"],
    promptTemplate: "Fix grammar, punctuation, and improve style. Preserve the author's voice. Output the corrected text only.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Text to fix" } },
      required: ["text"],
    },
  },
  {
    name: "Executive Summary",
    description: "Create executive summaries from documents.",
    category: "productivity",
    tags: ["executive", "summary", "business"],
    promptTemplate: "Create an executive summary (150-200 words) of this document. Include: main point, key findings, recommendations, next steps.\n\nDocument:\n{{document}}",
    inputSchema: {
      type: "object",
      properties: { document: { type: "string", description: "Document" } },
      required: ["document"],
    },
  },
  {
    name: "Feedback Response",
    description: "Draft responses to feedback.",
    category: "agents",
    tags: ["feedback", "response", "support"],
    promptTemplate: "Draft a response to this {{type}} feedback:\n\nFeedback: {{feedback}}\n\nThank them, acknowledge the point, and if applicable, outline next steps. Be genuine.",
    inputSchema: {
      type: "object",
      properties: {
        feedback: { type: "string", description: "Feedback text" },
        type: { type: "string", description: "positive, negative, suggestion" },
      },
      required: ["feedback"],
    },
  },
  {
    name: "SOP Writer",
    description: "Write standard operating procedures.",
    category: "content",
    tags: ["sop", "process", "documentation"],
    promptTemplate: "Write an SOP for: {{process}}\n\nScope: {{scope}}\nAudience: {{audience}}\n\nInclude: purpose, scope, steps, responsibilities, references.",
    inputSchema: {
      type: "object",
      properties: {
        process: { type: "string", description: "Process name" },
        scope: { type: "string", description: "Scope" },
        audience: { type: "string", description: "Who will use it" },
      },
      required: ["process"],
    },
  },
  {
    name: "Quiz Question Generator",
    description: "Generate quiz questions from content.",
    category: "content",
    tags: ["quiz", "education", "content"],
    promptTemplate: "Generate {{count}} quiz questions (multiple choice) from this content. Include correct answer and 3 distractors. Vary difficulty.\n\nContent:\n{{content}}",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Source content" },
        count: { type: "number", description: "Number of questions" },
      },
      required: ["content"],
    },
  },
  {
    name: "Tagline Generator",
    description: "Generate brand taglines.",
    category: "marketing",
    tags: ["tagline", "brand", "marketing"],
    promptTemplate: "Generate 5 tagline options for:\n\nBrand: {{brand}}\nProduct: {{product}}\nValues: {{values}}\n\nEach under 10 words. Memorable and distinctive.",
    inputSchema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand name" },
        product: { type: "string", description: "Product/service" },
        values: { type: "string", description: "Brand values" },
      },
      required: ["brand"],
    },
  },
  {
    name: "Testimonial Request",
    description: "Draft testimonial request emails.",
    category: "marketing",
    tags: ["testimonial", "email", "marketing"],
    promptTemplate: "Write a testimonial request email for a {{customerType}} customer.\n\nProduct: {{product}}\nRelationship: {{relationship}}\n\nKeep it short, personal, and easy to respond to. Include 2-3 prompt questions.",
    inputSchema: {
      type: "object",
      properties: {
        customerType: { type: "string", description: "Type of customer" },
        product: { type: "string", description: "Product" },
        relationship: { type: "string", description: "Customer relationship" },
      },
      required: ["product"],
    },
  },
  {
    name: "Objection Handler",
    description: "Generate responses to sales objections.",
    category: "agents",
    tags: ["sales", "objection", "agent"],
    promptTemplate: "Write a response to this sales objection:\n\nObjection: {{objection}}\nProduct: {{product}}\n\nUse feel-felt-found or similar. Empathize, reframe, provide evidence. Keep conversational.",
    inputSchema: {
      type: "object",
      properties: {
        objection: { type: "string", description: "Customer objection" },
        product: { type: "string", description: "Product" },
      },
      required: ["objection", "product"],
    },
  },
  {
    name: "Pitch Deck Outline",
    description: "Create pitch deck slide outlines.",
    category: "content",
    tags: ["pitch", "deck", "startup"],
    promptTemplate: "Create a pitch deck outline for: {{company}}\n\nProblem: {{problem}}\nSolution: {{solution}}\nMarket: {{market}}\n\nInclude 10-12 slides with titles and key points for each.",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Company name" },
        problem: { type: "string", description: "Problem" },
        solution: { type: "string", description: "Solution" },
        market: { type: "string", description: "Market" },
      },
      required: ["company", "problem", "solution"],
    },
  },
  {
    name: "Newsletter Writer",
    description: "Write newsletter content.",
    category: "content",
    tags: ["newsletter", "email", "content"],
    promptTemplate: "Write a newsletter section for:\n\nTopic: {{topic}}\nAudience: {{audience}}\nTone: {{tone}}\n\nInclude: engaging opener, 2-3 paragraphs, CTA. Under 300 words.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic" },
        audience: { type: "string", description: "Audience" },
        tone: { type: "string", description: "Tone" },
      },
      required: ["topic"],
    },
  },
  {
    name: "Recipe Formatter",
    description: "Format recipes from unstructured text.",
    category: "data_extraction",
    tags: ["recipe", "extract", "format"],
    promptTemplate: "Extract and format this recipe. Return: name, servings, ingredients (list), instructions (numbered steps), notes if any.\n\nText:\n{{text}}",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Recipe text" } },
      required: ["text"],
    },
  },
  {
    name: "Event Description",
    description: "Write event descriptions.",
    category: "content",
    tags: ["event", "description", "marketing"],
    promptTemplate: "Write an event description for:\n\nEvent: {{event}}\nDate/Time: {{datetime}}\nAudience: {{audience}}\n\nInclude: hook, what to expect, who should attend, CTA to register.",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event name" },
        datetime: { type: "string", description: "Date and time" },
        audience: { type: "string", description: "Target audience" },
      },
      required: ["event"],
    },
  },
  {
    name: "Bio Writer",
    description: "Write professional bios.",
    category: "content",
    tags: ["bio", "profile", "professional"],
    promptTemplate: "Write a {{length}} bio for:\n\nName: {{name}}\nRole: {{role}}\nBackground: {{background}}\nUse case: {{useCase}}\n\nTone: {{tone}}",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name" },
        role: { type: "string", description: "Role/title" },
        background: { type: "string", description: "Background" },
        useCase: { type: "string", description: "LinkedIn, website, etc." },
        length: { type: "string", description: "short, medium, long" },
        tone: { type: "string", description: "professional, casual" },
      },
      required: ["name", "role"],
    },
  },
  {
    name: "Slogan Generator",
    description: "Generate brand slogans.",
    category: "marketing",
    tags: ["slogan", "brand", "marketing"],
    promptTemplate: "Generate 10 slogan options for {{brand}}.\n\nProduct: {{product}}\nValues: {{values}}\n\nMix styles: benefit, emotional, descriptive. Each under 8 words.",
    inputSchema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand" },
        product: { type: "string", description: "Product" },
        values: { type: "string", description: "Values" },
      },
      required: ["brand"],
    },
  },
  {
    name: "Changelog Writer",
    description: "Write product changelog entries.",
    category: "content",
    tags: ["changelog", "product", "release"],
    promptTemplate: "Write a changelog entry for:\n\nVersion: {{version}}\nChanges: {{changes}}\n\nFormat: feature bullets, fix bullets, improvement bullets. User-friendly language.",
    inputSchema: {
      type: "object",
      properties: {
        version: { type: "string", description: "Version" },
        changes: { type: "string", description: "List of changes" },
      },
      required: ["version", "changes"],
    },
  },
  {
    name: "Bug Report Triage",
    description: "Categorize and summarize bug reports.",
    category: "agents",
    tags: ["bug", "triage", "support"],
    promptTemplate: "Analyze this bug report. Provide: severity (critical/high/medium/low), category, summary, reproduction steps (if inferrable), suggested assignee type.",
    inputSchema: {
      type: "object",
      properties: { report: { type: "string", description: "Bug report" } },
      required: ["report"],
    },
  },
  {
    name: "Feature Request Analyzer",
    description: "Analyze and summarize feature requests.",
    category: "agents",
    tags: ["feature", "product", "analysis"],
    promptTemplate: "Analyze this feature request. Provide: summary, user need, proposed solution, impact, effort estimate (low/medium/high), recommendation.",
    inputSchema: {
      type: "object",
      properties: { request: { type: "string", description: "Feature request" } },
      required: ["request"],
    },
  },
  {
    name: "Interview Question Generator",
    description: "Generate interview questions.",
    category: "content",
    tags: ["interview", "hr", "recruitment"],
    promptTemplate: "Generate {{count}} interview questions for {{role}}.\n\nFocus areas: {{focus}}\nLevel: {{level}}\n\nInclude behavioral, situational, and role-specific. Add what to listen for.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", description: "Role" },
        count: { type: "number", description: "Number of questions" },
        focus: { type: "string", description: "Focus areas" },
        level: { type: "string", description: "junior, mid, senior" },
      },
      required: ["role"],
    },
  },
  {
    name: "Performance Review Writer",
    description: "Draft performance review content.",
    category: "content",
    tags: ["performance", "hr", "review"],
    promptTemplate: "Draft a performance review for {{name}}.\n\nRole: {{role}}\nStrengths: {{strengths}}\nAreas for growth: {{growth}}\n\nInclude: summary, achievements, development goals. Professional tone.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Employee name" },
        role: { type: "string", description: "Role" },
        strengths: { type: "string", description: "Strengths" },
        growth: { type: "string", description: "Areas for growth" },
      },
      required: ["name", "role"],
    },
  },
];

async function main() {
  const { getDb } = await import("../server/db");
  const db = await getDb();
  const templatesCol = db.collection("action_templates");
  const marketplaceCol = db.collection("marketplace_templates");

  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const defaultModel = hasOpenRouter ? "openai/gpt-4o" : "gpt-4o";

  const now = new Date();
  let inserted = 0;
  let marketplaceInserted = 0;

  for (const t of TEMPLATES) {
    const existing = await templatesCol.findOne({
      name: t.name,
      createdBy: "system",
    });
    if (existing) {
      console.log(`[seed-templates] Skip (exists): ${t.name}`);
      continue;
    }

    const doc = {
      ...t,
      defaultModel,
      createdBy: "system",
      visibility: "public",
      createdAt: now,
      updatedAt: now,
    };
    const result = await templatesCol.insertOne(doc);
    inserted++;
    console.log(`[seed-templates] Created: ${t.name}`);

    // Publish to marketplace
    const templateId = result.insertedId;
    const marketplaceExisting = await marketplaceCol.findOne({ templateId });
    if (!marketplaceExisting) {
      await marketplaceCol.insertOne({
        name: t.name,
        description: t.description,
        author: "ALEXZA",
        authorUserId: new ObjectId("000000000000000000000000"),
        templateId,
        category: t.category,
        tags: t.tags,
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        visibility: "public",
        createdAt: now,
        updatedAt: now,
      });
      marketplaceInserted++;
      console.log(`[seed-templates] Published to marketplace: ${t.name}`);
    }
  }

  console.log(`[seed-templates] Done. Inserted ${inserted} templates, ${marketplaceInserted} to marketplace.`);
}

main().catch((err) => {
  console.error("[seed-templates]", err);
  process.exit(1);
});
