import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { CorsOptions } from "cors";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";
import { authRouter } from "./auth";
import { getDb, pingDb } from "./db";
import { keysRouter } from "./keys";
import { getSessionCookieName, hashSessionToken } from "./utils/crypto";
import { projectsRouter } from "./projects";
import { runRouter } from "./run";
import { usageRouter } from "./usageRoutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const trustProxyRaw = process.env.TRUST_PROXY;
  if (trustProxyRaw !== undefined) {
    const parsedTrustProxy = Number.parseInt(trustProxyRaw, 10);
    app.set("trust proxy", Number.isNaN(parsedTrustProxy) ? trustProxyRaw : parsedTrustProxy);
  } else if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigin: CorsOptions["origin"] =
    allowedOrigins.length === 0
      ? true
      : (origin, callback) => {
          // Allow requests without Origin (curl/health checks) and explicitly allow configured origins.
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error("Not allowed by CORS"));
        };

  app.use(
    cors({
      origin: corsOrigin,
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
  app.use("/api", usageRouter);
  app.use(runRouter);
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounted /api/projects routes OK");
  }

  if (process.env.NODE_ENV !== "production") {
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
  } else {
    app.get("/api/debug/session", (_req, res) => {
      res.status(404).json({ ok: false, error: "NOT_FOUND" });
    });
    app.use("/api/debug", (_req, res) => {
      res.status(404).json({ ok: false, error: "NOT_FOUND" });
    });
  }

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

  const rootFromSource = path.resolve(__dirname, "..");
  const rootFromBuild = path.resolve(__dirname, "..", "..");
  const projectRoot = fs.existsSync(path.resolve(rootFromSource, "client")) ? rootFromSource : rootFromBuild;
  const staticPath = path.resolve(projectRoot, "client", "dist");

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

  const configuredPort = Number.parseInt(process.env.PORT ?? "3002", 10);
  const port = Number.isNaN(configuredPort) ? 3002 : configuredPort;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
