import { Router } from "express";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

const router = Router();

router.get("/onboarding/state", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const db = await getDb();
    const users = db.collection("users");
    const user = await users.findOne<{ onboardingCompleted?: boolean; onboardingStep?: number }>(
      { _id: req.user._id },
      { projection: { onboardingCompleted: 1, onboardingStep: 1 } }
    );
    const completed = user?.onboardingCompleted ?? false;
    const step = typeof user?.onboardingStep === "number" ? user.onboardingStep : 0;
    return res.json({ ok: true, onboardingCompleted: completed, onboardingStep: step });
  } catch (error) {
    return next(error);
  }
});

router.post("/onboarding/state", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const body = req.body as { step?: unknown; completed?: unknown };
    const stepRaw = typeof body.step === "number" ? body.step : Number(body.step);
    const step = Number.isFinite(stepRaw) ? Math.max(0, Math.min(4, stepRaw)) : undefined;
    const completed =
      typeof body.completed === "boolean"
        ? body.completed
        : body.completed === "true"
          ? true
          : body.completed === "false"
            ? false
            : undefined;

    const update: Record<string, unknown> = {};
    if (step !== undefined) update.onboardingStep = step;
    if (completed !== undefined) update.onboardingCompleted = completed;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Must provide step and/or completed fields",
      });
    }

    const db = await getDb();
    const users = db.collection("users");
    await users.updateOne({ _id: req.user._id }, { $set: update });

    const user = await users.findOne<{ onboardingCompleted?: boolean; onboardingStep?: number }>(
      { _id: req.user._id },
      { projection: { onboardingCompleted: 1, onboardingStep: 1 } }
    );
    const completedOut = user?.onboardingCompleted ?? false;
    const stepOut = typeof user?.onboardingStep === "number" ? user.onboardingStep : 0;

    return res.json({
      ok: true,
      onboardingCompleted: completedOut,
      onboardingStep: stepOut,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/onboarding/complete", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    const db = await getDb();
    const users = db.collection("users");
    await users.updateOne(
      { _id: req.user._id },
      { $set: { onboardingCompleted: true, onboardingStep: 4 } }
    );
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export { router as onboardingRouter };

