/**
 * Onboarding status - checklist for new users
 */

import { Router } from "express";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

const router = Router();

export interface OnboardingStatus {
  hasProject: boolean;
  hasApiKey: boolean;
  hasAction: boolean;
  complete: boolean;
}

router.get("/onboarding/status", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const db = await getDb();
    const userId = req.user._id;

    const [projectsCount, keysCount, actionsCount] = await Promise.all([
      db.collection("projects").countDocuments({ ownerUserId: userId }),
      db.collection("api_keys").countDocuments({
        ownerUserId: userId,
        revokedAt: null,
      }),
      db.collection("project_actions").countDocuments({ userId }),
    ]);

    const hasProject = projectsCount > 0;
    const hasApiKey = keysCount > 0;
    const hasAction = actionsCount > 0;

    const complete = hasProject && hasApiKey && hasAction;

    return res.json({
      ok: true,
      onboarding: {
        hasProject,
        hasApiKey,
        hasAction,
        complete,
      },
    });
  } catch (e) {
    next(e);
  }
});

export { router as onboardingRouter };
