import { Router } from "express";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { requireAuth } from "./middleware/requireAuth";

interface ProjectDoc {
  ownerUserId: ObjectId;
  name: string;
  description?: string;
  model?: string;
  status: "active" | "paused";
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProjectBody {
  name?: unknown;
  description?: unknown;
  model?: unknown;
}

interface UpdateProjectBody {
  name?: unknown;
  description?: unknown;
  model?: unknown;
  status?: unknown;
}

const router = Router();
let projectsIndexesReady: Promise<void> | null = null;

function toProjectResponse(project: WithId<ProjectDoc>) {
  const id = project._id.toString();
  return {
    id,
    _id: id,
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

function parseProjectId(rawId: string): ObjectId | null {
  if (!ObjectId.isValid(rawId)) return null;
  return new ObjectId(rawId);
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

    const projectId = parseProjectId(req.params.id);
    if (!projectId) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const project = await projects.findOne({
      _id: projectId,
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

router.delete("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const projectId = parseProjectId(req.params.id);
    if (!projectId) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const deletedProject = await projects.findOneAndDelete({
      _id: projectId,
      ownerUserId: req.user._id,
    });

    if (!deletedProject) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const threadIds = await db
      .collection("chat_threads")
      .find({ projectId })
      .project({ _id: 1 })
      .toArray()
      .then((rows) => rows.map((r) => r._id));

    await Promise.all([
      db.collection("api_keys").deleteMany({ projectId }),
      db.collection("usage_logs").deleteMany({ projectId }),
      db.collection("project_actions").deleteMany({ projectId }),
      db.collection("chat_messages").deleteMany({ threadId: { $in: threadIds } }),
      db.collection("chat_threads").deleteMany({ projectId }),
    ]);

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.patch("/projects/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureProjectsIndexes();
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const projectId = parseProjectId(req.params.id);
    if (!projectId) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const body = req.body as UpdateProjectBody;
    const updateSet: Partial<ProjectDoc> = {};
    let hasAtLeastOneField = false;

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return res.status(400).json(validationError("name must be a string"));
      }
      const name = body.name.trim();
      if (name.length < 2) {
        return res.status(400).json(validationError("Project name must be at least 2 characters"));
      }
      updateSet.name = name;
      hasAtLeastOneField = true;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return res.status(400).json(validationError("description must be a string"));
      }
      updateSet.description = body.description.trim();
      hasAtLeastOneField = true;
    }

    if (body.model !== undefined) {
      if (typeof body.model !== "string") {
        return res.status(400).json(validationError("model must be a string"));
      }
      updateSet.model = body.model.trim();
      hasAtLeastOneField = true;
    }

    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "paused") {
        return res.status(400).json(validationError('status must be "active" or "paused"'));
      }
      updateSet.status = body.status;
      hasAtLeastOneField = true;
    }

    if (!hasAtLeastOneField) {
      return res.status(400).json(validationError("No valid fields to update"));
    }

    updateSet.updatedAt = new Date();

    const db = await getDb();
    const projects = db.collection<ProjectDoc>("projects");
    const updated = await projects.findOneAndUpdate(
      {
        _id: projectId,
        ownerUserId: req.user._id,
      },
      {
        $set: updateSet,
      },
      {
        returnDocument: "after",
      }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    return res.json({ ok: true, project: toProjectResponse(updated) });
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
