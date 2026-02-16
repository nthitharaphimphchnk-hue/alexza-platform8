import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";
import { authRouter } from "./auth";
import { getDb, pingDb } from "./db";
import { keysRouter } from "./keys";
import { getSessionCookieName, hashSessionToken } from "./utils/crypto";
import { projectsRouter } from "./projects";
import { runRouter } from "./run";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/health/db", async (_req, res) => {
    try {
      await pingDb();
      res.json({ ok: true, db: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ ok: false, db: "error", message });
    }
  });

  app.get("/api/health/openai", (_req, res) => {
    const configured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!configured) {
      return res.json({ ok: true, configured: false });
    }
    return res.json({ ok: true, configured: true, model });
  });

  app.use("/api", authRouter);
  app.use("/api", projectsRouter);
  app.use("/api", keysRouter);
  app.use(runRouter);
  console.log("Mounted /api/projects routes OK");

  app.get("/api/debug/session", async (req, res) => {
    const token = req.cookies?.[getSessionCookieName()];
    if (!token || typeof token !== "string") {
      res.json({
        hasUser: false,
        userId: null,
        cookies: req.cookies,
      });
      return;
    }

    try {
      const db = await getDb();
      const sessions = db.collection<{ userId: ObjectId; tokenHash: string; expiresAt: Date }>("sessions");
      const session = await sessions.findOne({
        tokenHash: hashSessionToken(token),
        expiresAt: { $gt: new Date() },
      });

      res.json({
        hasUser: Boolean(session),
        userId: session?.userId?.toString?.() ?? null,
        cookies: req.cookies,
      });
    } catch {
      res.json({
        hasUser: false,
        userId: null,
        cookies: req.cookies,
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/debug/projects", async (_req, res, next) => {
      try {
        const db = await getDb();
        const projects = await db
          .collection<{
            _id: ObjectId;
            ownerUserId: ObjectId;
            name: string;
            description?: string;
            model?: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
          }>("projects")
          .find({})
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray();

        res.json({
          ok: true,
          projects: projects.map((project) => ({
            id: project._id.toString(),
            ownerUserId: project.ownerUserId.toString(),
            name: project.name,
            description: project.description ?? "",
            model: project.model ?? "",
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          })),
        });
      } catch (error) {
        next(error);
      }
    });
  }

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Unhandled server error:", err);
      res.status(500).json({
        ok: false,
        error: "INTERNAL_ERROR",
        message: "Unexpected server error",
      });
    }
  );

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
