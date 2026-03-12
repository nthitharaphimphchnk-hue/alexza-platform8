import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { logger } from "./utils/logger";
import type { CreatorDoc } from "./models/creator";
import type { CreatorEarningDoc } from "./models/monetization";
import type { AgentMarketplaceDoc } from "./models/agentMarketplace";
import type { WorkflowMarketplaceDoc } from "./models/workflowMarketplace";
import type { MarketplaceTemplateDoc } from "./models/marketplaceTemplate";

const router = Router();

function computeScore(
  downloads: number,
  rating: number,
  recentBoost: number
): number {
  return downloads * 1 + rating * 20 + recentBoost;
}

router.get("/leaderboard", async (_req, res, next) => {
  try {
    const db = await getDb();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Top creators (by revenue/usage)
    const creatorsCol = db.collection<CreatorDoc>("creators");
    const earningsCol = db.collection<CreatorEarningDoc>("creator_earnings");

    const creatorAgg = await earningsCol
      .aggregate<{
        _id: { creatorId: ObjectId };
        revenue: number;
        payoutAmount: number;
      }>([
        {
          $group: {
            _id: { creatorId: "$creatorId" },
            revenue: { $sum: "$revenue" },
            payoutAmount: { $sum: "$payoutAmount" },
          },
        },
        {
          $addFields: {
            score: {
              $add: ["$revenue", { $multiply: ["$payoutAmount", 0.5] }],
            },
          },
        },
        { $sort: { score: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    const creatorIds = creatorAgg.map((r) => r._id.creatorId);
    const creatorDocs = await creatorsCol
      .find({ _id: { $in: creatorIds } })
      .toArray();
    const creatorsById = new Map(creatorDocs.map((c) => [c._id.toString(), c]));

    const topCreators = creatorAgg
      .map((row, idx) => {
        const c = creatorsById.get(row._id.creatorId.toString());
        if (!c) return null;
        return {
          id: c._id.toString(),
          rank: idx + 1,
          name: c.displayName || c.username,
          username: c.username,
          revenue: row.revenue,
          payoutAmount: row.payoutAmount,
          score: row.revenue + row.payoutAmount * 0.5,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Top agents
    const agentsCol = db.collection<AgentMarketplaceDoc>("agent_marketplace");
    const agentRows = await agentsCol
      .find({ visibility: "public" })
      .toArray();
    const topAgents = agentRows
      .map((doc) => {
        const downloads = doc.downloads ?? 0;
        const rating = doc.rating ?? 0;
        const recentBoost = doc.createdAt >= thirtyDaysAgo ? 50 : 0;
        const score = computeScore(downloads, rating, recentBoost);
        return {
          id: doc._id.toString(),
          name: doc.name,
          downloads,
          rating,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Top workflows
    const workflowsCol = db.collection<WorkflowMarketplaceDoc>("workflow_marketplace");
    const workflowRows = await workflowsCol
      .find({ visibility: "public" })
      .toArray();
    const topWorkflows = workflowRows
      .map((doc) => {
        const downloads = doc.downloads ?? 0;
        const rating = doc.rating ?? 0;
        const recentBoost = doc.createdAt >= thirtyDaysAgo ? 50 : 0;
        const score = computeScore(downloads, rating, recentBoost);
        return {
          id: doc._id.toString(),
          name: doc.name,
          downloads,
          rating,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Top templates (marketplace templates)
    const templatesCol = db.collection<MarketplaceTemplateDoc>("marketplace_templates");
    const templateRows = await templatesCol
      .find({ visibility: "public" })
      .toArray();
    const topTemplates = templateRows
      .map((doc) => {
        const downloads = doc.downloads ?? 0;
        const rating = doc.rating ?? 0;
        const recentBoost = doc.createdAt >= thirtyDaysAgo ? 50 : 0;
        const score = computeScore(downloads, rating, recentBoost);
        return {
          id: doc._id.toString(),
          name: doc.name,
          downloads,
          rating,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return res.json({
      ok: true,
      topCreators,
      topAgents,
      topWorkflows,
      topTemplates,
    });
  } catch (error) {
    logger.error({ err: error }, "[Leaderboard] error");
    return next(error);
  }
});

export { router as leaderboardRouter };

