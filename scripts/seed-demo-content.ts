/**
 * Seed demo content for soft launch:
 * - Featured templates, agents, workflows, packs, apps, creators, example projects.
 *
 * Usage:
 *   DEMO_OWNER_USER_ID=<userId> DEMO_WORKSPACE_ID=<workspaceId> pnpm exec tsx scripts/seed-demo-content.ts
 *
 * The DEMO_OWNER_USER_ID and DEMO_WORKSPACE_ID should point at a real user/workspace
 * that will be treated as "system/demo" owner for this content.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../server/db";
import { logger } from "../server/utils/logger";

interface DemoContext {
  ownerUserId: ObjectId;
  workspaceId: ObjectId;
}

function getDemoContext(): DemoContext {
  const owner = process.env.DEMO_OWNER_USER_ID?.trim();
  const workspace = process.env.DEMO_WORKSPACE_ID?.trim();
  if (!owner || !workspace || !ObjectId.isValid(owner) || !ObjectId.isValid(workspace)) {
    throw new Error(
      "DEMO_OWNER_USER_ID and DEMO_WORKSPACE_ID must be set to valid ObjectId strings"
    );
  }
  return { ownerUserId: new ObjectId(owner), workspaceId: new ObjectId(workspace) };
}

async function upsertTemplatePack(ctx: DemoContext) {
  const db = await getDb();
  const col = db.collection("template_packs");

  const now = new Date();
  const name = "Getting Started Pack";

  await col.updateOne(
    { name },
    {
      $setOnInsert: {
        createdAt: now,
      },
      $set: {
        description: "Starter templates for common summarization, extraction, and support flows.",
        tags: ["demo", "featured", "starter"],
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  logger.info({ name }, "[DemoSeed] template pack upserted");
}

async function upsertDemoAgent(ctx: DemoContext) {
  const db = await getDb();
  const col = db.collection("agents");
  const now = new Date();

  const name = "Demo Support Agent";

  await col.updateOne(
    { name, ownerUserId: ctx.ownerUserId },
    {
      $setOnInsert: {
        workspaceId: ctx.workspaceId,
        createdAt: now,
      },
      $set: {
        description: "Example agent for customer support scenarios.",
        tools: [],
        memoryEnabled: true,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  logger.info({ name }, "[DemoSeed] agent upserted");
}

async function upsertDemoWorkflow(ctx: DemoContext) {
  const db = await getDb();
  const col = db.collection("workflows");
  const now = new Date();

  const name = "Demo Lead Qualification Workflow";

  await col.updateOne(
    { name, ownerUserId: ctx.ownerUserId },
    {
      $setOnInsert: {
        workspaceId: ctx.workspaceId,
        enabled: true,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  logger.info({ name }, "[DemoSeed] workflow upserted");
}

async function upsertDemoApp(ctx: DemoContext) {
  const db = await getDb();
  const col = db.collection("apps");
  const now = new Date();

  const name = "Demo AI Workspace";

  await col.updateOne(
    { name },
    {
      $setOnInsert: {
        createdAt: now,
      },
      $set: {
        description: "Demo application that showcases agents, workflows, and templates together.",
        category: "demo",
        tags: ["demo", "featured"],
        visibility: "public",
        downloads: 0,
        rating: 5,
        ratingCount: 0,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  logger.info({ name }, "[DemoSeed] app upserted");
}

async function upsertDemoCreator(ctx: DemoContext) {
  const db = await getDb();
  const col = db.collection("creators");
  const now = new Date();

  const username = "alexza_demo";

  await col.updateOne(
    { username },
    {
      $setOnInsert: {
        createdAt: now,
      },
      $set: {
        displayName: "ALEXZA Demo",
        bio: "Official demo creator for soft launch content.",
        avatar: "",
        userId: ctx.ownerUserId,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  logger.info({ username }, "[DemoSeed] creator upserted");
}

async function main() {
  logger.info("[DemoSeed] Starting demo content seeding");
  const ctx = getDemoContext();

  await Promise.all([
    upsertTemplatePack(ctx),
    upsertDemoAgent(ctx),
    upsertDemoWorkflow(ctx),
    upsertDemoApp(ctx),
    upsertDemoCreator(ctx),
  ]);

  logger.info("[DemoSeed] Completed demo content seeding");
}

main().catch((err) => {
  logger.error({ err }, "[DemoSeed] Failed");
  process.exit(1);
});

