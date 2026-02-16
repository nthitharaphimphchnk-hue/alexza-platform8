import { Router } from "express";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

interface ProjectDoc {
  ownerUserId: ObjectId;
  name: string;
  description?: string;
  model?: string;
  status: "active";
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProjectBody {
  name?: unknown;
  description?: unknown;
  model?: unknown;
}

const router = Router();
let projectsIndexesReady: Promise<void> | null = null;

function toProjectResponse(project: WithId<ProjectDoc>) {
  return {
    id: project._id.toString(),
    ownerUserId: project.ownerUserId.toString(),
    name: project.name,
    description: project.description ?? "",
    model: project.model ?? "",
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function validationError(message: string) {
  return { ok: false, error: "VALIDATION_ERROR", message } as const;
}

async function ensureProjectsIndexes() {
  if (!projectsIndexesReady) {
    projectsIndexesReady = (async () => {
      const db = await getDb();
      const projects = db.collection<ProjectDoc>("projects");
      await projects.createIndex({ ownerUserId: 1, createdAt: -1 });
    })();
  }
  return projectsIndexesReady;
}

router.post("/projects", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[Projects][POST] ownerUserId type:",
        req.user?._id?.constructor?.name,
        "value:",
        String(req.user?._id)
      );
    }

    const body = req.body as CreateProjectBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : undefined;
    const model =
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : undefined;

    if (name.length < 2) {
      return res.status(400).json(validationError("Project name must be at least 2 characters"));
    }

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const now = new Date();

    const insertResult = await projects.insertOne({
      ownerUserId: req.user._id,
      name,
      description,
      model,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const project = await projects.findOne({ _id: insertResult.insertedId });
    if (!project) {
      throw new Error("Failed to load newly created project");
    }

    return res.status(201).json({ ok: true, project: toProjectResponse(project) });
  } catch (error) {
    return next(error);
  }
});

router.get("/projects", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[Projects][GET] ownerUserId type:",
        req.user?._id?.constructor?.name,
        "value:",
        String(req.user?._id)
      );
    }

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const rows = await projects
      .find({ ownerUserId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      projects: rows.map(toProjectResponse),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const project = await projects.findOne({
      _id: new ObjectId(id),
      ownerUserId: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    return res.json({ ok: true, project: toProjectResponse(project) });
  } catch (error) {
    return next(error);
  }
});

export { router as projectsRouter };

if (process.env.NODE_ENV !== "production") {
  router.get("/debug/projects/all", async (_req, res, next) => {
    try {
      const db = await getDb();
      const rows = await db
        .collection<ProjectDoc>("projects")
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      res.json({
        ok: true,
        count: rows.length,
        projects: rows.map((row) => ({
          id: row._id.toString(),
          ownerUserId: row.ownerUserId.toString(),
          name: row.name,
          createdAt: row.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/debug/projects/mine", requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
        return;
      }

      const filter = { ownerUserId: req.user._id };
      const db = await getDb();
      const rows = await db
        .collection<ProjectDoc>("projects")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      res.json({
        ok: true,
        filter: { ownerUserId: String(req.user._id) },
        count: rows.length,
        first: rows[0]
          ? {
              id: rows[0]._id.toString(),
              ownerUserId: rows[0].ownerUserId.toString(),
              name: rows[0].name,
              createdAt: rows[0].createdAt,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  });
} else {
  router.get("/debug/projects/all", (_req, res) => {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
  });

  router.get("/debug/projects/mine", (_req, res) => {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
  });
}
