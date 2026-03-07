/**
 * Seed template_packs with starter packs.
 * Requires action_templates to be seeded first (pnpm exec tsx scripts/seed-templates.ts)
 * Usage: pnpm exec tsx scripts/seed-packs.ts
 */

import dotenv from "dotenv";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const PACKS: { name: string; description: string; templateNames: string[]; tags: string[] }[] = [
  {
    name: "SEO Pack",
    description: "Everything you need for SEO content: articles, meta descriptions, headlines, and keyword optimization.",
    templateNames: [
      "SEO Article Writer",
      "Meta Description Generator",
      "Headline Generator",
      "Blog Post Outline",
      "Long-form Article Writer",
    ],
    tags: ["seo", "content", "marketing", "blog"],
  },
  {
    name: "Marketing Pack",
    description: "Complete marketing toolkit: email campaigns, product descriptions, social media, and landing pages.",
    templateNames: [
      "Email Campaign Writer",
      "Product Description Generator",
      "Lead Follow-up Email",
      "Ad Copy AIDA",
      "Social Media Post",
      "Landing Page Copy",
    ],
    tags: ["marketing", "email", "social", "conversion"],
  },
  {
    name: "Customer Support Pack",
    description: "Support team essentials: ticket triage, response drafts, FAQs, and feedback handling.",
    templateNames: [
      "Support Ticket Triage",
      "Support Response Draft",
      "FAQ Generator",
      "Feedback Response",
      "Apology Email",
    ],
    tags: ["support", "customer", "ticket", "faq"],
  },
  {
    name: "Sales Automation Pack",
    description: "Sales outreach and conversion: cold emails, objection handling, pitches, and follow-ups.",
    templateNames: [
      "Cold Email Writer",
      "Objection Handler",
      "Lead Follow-up Email",
      "Sales Assistant Agent",
      "Thank You Email",
      "Testimonial Request",
    ],
    tags: ["sales", "outreach", "email", "automation"],
  },
  {
    name: "Research Pack",
    description: "Research and analysis: synthesize findings, create outlines, summarize documents.",
    templateNames: [
      "Research Agent",
      "Document Summarizer",
      "Meeting Notes Summarizer",
      "Executive Summary",
      "Competitor Analysis",
    ],
    tags: ["research", "summarize", "analysis", "productivity"],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || process.env.DB_NAME || "alexza";
  if (!uri) {
    console.error("[seed-packs] MONGODB_URI required");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const templatesCol = db.collection<{ _id: ObjectId; name: string }>("action_templates");
  const packsCol = db.collection("template_packs");

  for (const pack of PACKS) {
    const templateIds: ObjectId[] = [];
    for (const name of pack.templateNames) {
      const t = await templatesCol.findOne({ name });
      if (t) {
        templateIds.push(t._id);
      } else {
        console.warn(`[seed-packs] Template not found: ${name}`);
      }
    }

    const existing = await packsCol.findOne({ name: pack.name });
    if (existing) {
      console.log(`[seed-packs] Skipped (exists): ${pack.name}`);
      continue;
    }

    const now = new Date();
    await packsCol.insertOne({
      name: pack.name,
      description: pack.description,
      templateIds,
      agents: [],
      workflows: [],
      tags: pack.tags,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`[seed-packs] Created: ${pack.name} (${templateIds.length} templates)`);
  }

  await client.close();
  console.log("[seed-packs] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
