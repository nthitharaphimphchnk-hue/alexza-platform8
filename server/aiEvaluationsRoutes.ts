import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import { ensureProjectAccess } from "./workspaces/projectAccess";

const router = Router();

interface AiEvaluationLite {
  actionId: string;
  promptVersion: number;
  model: string;
  qualityScore: number;
  latency: number;
  tokens: number;
  cost: number;
  createdAt: Date;
  actionName?: string;
}

// GET /api/ai-evaluations - list recent evaluations across accessible projects
router.get("/ai-evaluations", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const db = await getDb();
    const actionsCol = db.collection<{ _id: ObjectId; projectId: ObjectId; actionName: string }>("project_actions");
    const evalsCol = db.collection<{
      _id: ObjectId;
      actionId: ObjectId;
      promptVersion: number;
      model: string;
      qualityScore: number;
      latency: number;
      tokens: number;
      cost: number;
      createdAt: Date;
    }>("ai_evaluations");

    // Join evaluations with actions for actionName/projectId
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
      {
        $lookup: {
          from: "project_actions",
          localField: "actionId",
          foreignField: "_id",
          as: "action",
        },
      },
      { $unwind: "$action" },
    ];

    const raw = await evalsCol.aggregate(pipeline).toArray();

    const results: AiEvaluationLite[] = [];
    for (const row of raw) {
      const projectId = row.action.projectId as ObjectId;
      const canAccess = await ensureProjectAccess(projectId, req.user._id);
      if (!canAccess) continue;

      results.push({
        actionId: row.actionId.toString(),
        promptVersion: row.promptVersion,
        model: row.model,
        qualityScore: row.qualityScore,
        latency: row.latency,
        tokens: row.tokens,
        cost: row.cost,
        createdAt: row.createdAt,
        actionName: row.action.actionName,
      });
    }

    return res.json({
      ok: true,
      evaluations: results,
    });
  } catch (e) {
    next(e);
  }
});

export { router as aiEvaluationsRouter };

