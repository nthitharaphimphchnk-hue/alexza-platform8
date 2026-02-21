/**
 * POST /api/estimate - Estimate tokens and credits for a run.
 * No provider/model exposure.
 */

import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";
import {
  estimateTokensFromInput,
  calculateCredits,
  type RoutingMode,
} from "./utils/tokenEstimator";

const router = Router();

function parseProjectId(raw: string): ObjectId | null {
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

router.post("/estimate", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const body = req.body as { projectId?: unknown; actionName?: unknown; input?: unknown };
    const projectIdRaw = typeof body.projectId === "string" ? body.projectId.trim() : "";
    const actionName = typeof body.actionName === "string" ? body.actionName.trim() : "";
    const input = body.input;

    if (!projectIdRaw || !actionName) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "projectId and actionName are required",
      });
    }

    const projectId = parseProjectId(projectIdRaw);
    if (!projectId) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Invalid projectId",
      });
    }

    const db = await getDb();
    const project = await db
      .collection<{ ownerUserId: ObjectId; routingMode?: string }>("projects")
      .findOne({ _id: projectId, ownerUserId: req.user._id });

    if (!project) {
      return res.status(404).json({
        ok: false,
        error: "NOT_FOUND",
        message: "Project not found or no access",
      });
    }

    const routingMode: RoutingMode =
      project.routingMode && ["cheap", "balanced", "quality"].includes(project.routingMode)
        ? (project.routingMode as RoutingMode)
        : "quality";

    const estimatedTokens = estimateTokensFromInput(input ?? {});
    const estimatedCredits = calculateCredits(routingMode, estimatedTokens);

    return res.json({
      ok: true,
      estimatedTokens,
      estimatedCredits,
      routingMode,
    });
  } catch (error) {
    return next(error);
  }
});

export { router as estimateRouter };
