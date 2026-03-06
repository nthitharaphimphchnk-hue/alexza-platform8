import "./sentry";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { CorsOptions } from "cors";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { sanitizeForLog, maskEmail } from "./utils/sanitize";
import { authRouter } from "./auth";
import { oauthRouter } from "./oauth";
import { getDb, pingDb } from "./db";
import { keysRouter } from "./keys";
import { getSessionCookieName, hashSessionToken } from "./utils/crypto";
import { projectsRouter } from "./projects";
import { v1Router } from "./routes/v1";
import { v2Router } from "./routes/v2";
import { adminRunLogsRouter } from "./adminRunLogs";
import { builderRouter } from "./builder";
import { actionsRouter } from "./actions";
import { usageRouter } from "./usageRoutes";
import { creditsRouter } from "./credits";
import { walletRouter } from "./walletRoutes";
import { runWalletMigration } from "./wallet";
import { billingRouter, runBillingUserMigration } from "./billing";
import { stripeRouter, createWebhookRoute } from "./modules/stripe/stripe.routes";
import { runRoutingModeMigration } from "./projects";
import { runWorkspaceMigration } from "./workspaces/migration";
import { workspacesRouter } from "./workspaces/workspaces.routes";
import { onboardingRouter } from "./onboarding";
import { notificationsRouter, runLowCreditsEmailMigration } from "./notifications";
import { webhooksRouter } from "./webhooks/webhooks.routes";
import { estimateRouter } from "./estimate";
import { analyticsRouter } from "./analytics";
import { requestsRouter } from "./requestsRoutes";
import { templatesRouter } from "./templatesRoutes";
import { adminTemplatesRouter } from "./adminTemplatesRoutes";
import { auditRoutes } from "./auditRoutes";
import { healthRouter } from "./healthRoutes";
import { statusRouter } from "./statusRoutes";
import { startStatusMonitor } from "./statusService";
import { requestIdMiddleware } from "./middleware/requestId";
import { sentryScopeMiddleware } from "./middleware/sentryScope";
import { requestLogger } from "./middleware/requestLogger";
import { slowRequestMiddleware } from "./middleware/slowRequest";
import * as Sentry from "@sentry/node";
import { sentryRelease } from "./sentry";
import { logger } from "./utils/logger";
import { normalizeEnvUrl } from "./utils/envUrls";
import { getCreditPrice } from "./config";
import { CREDIT_PRICE_TIERS } from "./config/pricing";
import { API_KEY_SCOPES } from "./config/scopes";
import { TOKENS_PER_CREDIT } from "./wallet";
import swaggerUi from "swagger-ui-express";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function canAccessDebugRoutes(req: express.Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  if (!configuredAdminKey || configuredAdminKey.trim().length === 0) return false;
  const rawHeader = req.headers["x-admin-key"];
  const providedAdminKey = typeof rawHeader === "string" ? rawHeader.trim() : "";
  return providedAdminKey.length > 0 && providedAdminKey === configuredAdminKey;
}

function extractRegisteredRoutes(app: express.Express): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  type StackLayer = {
    route?: { path?: string; methods?: Record<string, boolean> };
    name?: string;
    handle?: { stack?: StackLayer[] };
    regexp?: { source?: string };
  };

  const appWithRouter = app as unknown as { _router?: { stack?: StackLayer[] } };
  const stack = appWithRouter._router?.stack ?? [];

  const walk = (layers: StackLayer[], parentPath = "") => {
    for (const layer of layers) {
      if (layer.route?.path && layer.route.methods) {
        const methods = Object.keys(layer.route.methods)
          .filter((method) => layer.route?.methods?.[method])
          .map((method) => method.toUpperCase());
        const rawPath = `${parentPath}${layer.route.path}`;
        for (const method of methods) {
          const full = `${method} ${rawPath}`;
          if (!seen.has(full)) {
            seen.add(full);
            result.push(full);
          }
        }
        continue;
      }

      if (layer.name === "router" && layer.handle?.stack) {
        let routerPrefix = parentPath;
        const source = layer.regexp?.source ?? "";
        if (source.includes("\\/api\\/?")) {
          routerPrefix = `${parentPath}/api`;
        }
        walk(layer.handle.stack, routerPrefix);
      }
    }
  };

  walk(stack);
  return result.sort((a, b) => a.localeCompare(b));
}

async function startServer() {
  await runBillingUserMigration();
  await runWalletMigration();
  await runLowCreditsEmailMigration();
  await runRoutingModeMigration();
  await runWorkspaceMigration();
  const app = express();
  const server = createServer(app);

  // Trust proxy (required for Render; secure cookies work behind proxy)
  const trustProxyRaw = process.env.TRUST_PROXY;
  if (trustProxyRaw !== undefined) {
    const parsedTrustProxy = Number.parseInt(trustProxyRaw, 10);
    app.set("trust proxy", Number.isNaN(parsedTrustProxy) ? 1 : parsedTrustProxy);
  } else {
    app.set("trust proxy", 1);
  }

  // CORS: prefer CLIENT_URL, then CORS_ORIGIN (comma-separated)
  const clientUrl = normalizeEnvUrl(process.env.CLIENT_URL);
  const corsOriginEnv = (process.env.CORS_ORIGIN || "").trim();
  const allowedOrigins = [
    ...(clientUrl ? [clientUrl] : []),
    ...corsOriginEnv.split(",").map((o) => normalizeEnvUrl(o)).filter(Boolean),
  ];
  logger.info({ allowedOrigins }, "[Startup] CORS final allowed origins");
  logger.info({ creditPrice: getCreditPrice() }, "[Startup] Credit price (USD per credit)");
  const corsOrigin: CorsOptions["origin"] =
    allowedOrigins.length === 0
      ? true
      : (origin, callback) => {
          // Allow requests without Origin (curl/health checks) and explicitly allow configured origins.
          const originNorm = origin ? normalizeEnvUrl(origin) : "";
          const allowed = !origin || allowedOrigins.some((a) => originNorm === a);
          if (allowed) {
            callback(null, true);
            return;
          }
          callback(new Error("Not allowed by CORS"));
        };

  app.use(requestIdMiddleware);
  app.use(sentryScopeMiddleware);
  app.use(requestLogger);
  app.use(slowRequestMiddleware);

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );

  // Stripe webhook MUST use raw body - mount before express.json()
  app.post("/api/billing/stripe/webhook", ...createWebhookRoute());

  app.use(express.json());
  app.use(cookieParser());

  app.use(oauthRouter);

  // Health endpoints (GET /health, /health/db, /health/stripe, /health/webhooks)
  app.use("/", healthRouter);

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
    if (!configured) {
      return res.json({ ok: true, configured: false });
    }
    return res.json({ ok: true, configured: true });
  });

  /** Public config - safe for unauthenticated clients (pricing display, etc.) */
  app.get("/api/public/config", (_req, res) => {
    res.json({
      ok: true,
      creditPrice: getCreditPrice(),
      creditsPerThousandTokens: TOKENS_PER_CREDIT,
    });
  });

  /** Public pricing tiers - volume discount table */
  app.get("/api/public/pricing", (_req, res) => {
    res.json({
      ok: true,
      tiers: CREDIT_PRICE_TIERS,
    });
  });

  /** Public API key scopes - for UI when creating keys */
  app.get("/api/public/scopes", (_req, res) => {
    res.json({
      ok: true,
      scopes: API_KEY_SCOPES,
    });
  });

  app.use("/api", authRouter);
  app.use("/api", workspacesRouter);
  app.use("/api", projectsRouter);
  app.use("/api", keysRouter);
  app.use("/api", builderRouter);
  app.use("/api", actionsRouter);
  app.use("/api", usageRouter);
  app.use("/api", creditsRouter);
  app.use("/api", walletRouter);
  app.use("/api", estimateRouter);
  app.use("/api", analyticsRouter);
  app.use("/api", requestsRouter);
  app.use("/api", templatesRouter);
  app.use("/api", adminTemplatesRouter);
  app.use("/api", auditRoutes);
  app.use("/api", onboardingRouter);
  app.use("/api", billingRouter);
  app.use("/api/billing/stripe", stripeRouter);
  app.use("/api", notificationsRouter);
  app.use("/api", webhooksRouter);
  app.use("/api", statusRouter);
  app.use("/api", adminRunLogsRouter);

  // Versioned API: /v1 (stable), /v2 (scaffold)
  app.use("/v1", v1Router);
  app.use("/v2", v2Router);

  // OpenAPI / Swagger documentation at /docs/api
  const openapiPaths = [
    path.join(__dirname, "..", "..", "openapi.yaml"),
    path.join(__dirname, "..", "openapi.yaml"),
    path.join(process.cwd(), "openapi.yaml"),
  ];
  let openapiDoc: Record<string, unknown> | null = null;
  for (const openapiPath of openapiPaths) {
    try {
      const yamlContent = fs.readFileSync(openapiPath, "utf-8");
      openapiDoc = parseYaml(yamlContent) as Record<string, unknown>;
      break;
    } catch {
      continue;
    }
  }
  if (!openapiDoc) {
    logger.warn({ paths: openapiPaths }, "[OpenAPI] Failed to load spec from any path");
  }
  if (openapiDoc) {
    app.get("/docs/api/openapi.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.json(openapiDoc);
    });
    app.use(
      "/docs/api",
      swaggerUi.serve,
      swaggerUi.setup(openapiDoc, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
        },
      })
    );
    logger.info("[OpenAPI] Swagger UI mounted at /docs/api");
  }

  app.get("/api/_debug/routes", (req, res) => {
    if (!canAccessDebugRoutes(req)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Admin access required" });
    }

    const routes = extractRegisteredRoutes(app);
    const requiredRoutes = [
      "GET /api/health",
      "GET /api/credits/balance",
      "GET /api/billing/plan",
      "POST /api/admin/billing/reset-monthly",
      "POST /api/admin/billing/cron/reset-monthly",
      "POST /api/admin/billing/force-reset-due",
      "POST /api/admin/notifications/test-low-credits",
      "POST /api/admin/notifications/cron/low-credits-scan",
      "GET /api/admin/notifications/status",
    ];
    const requiredRoutesPresent = requiredRoutes.reduce<Record<string, boolean>>((acc, route) => {
      acc[route] = routes.includes(route);
      return acc;
    }, {});

    return res.json({
      ok: true,
      routes,
      requiredRoutesPresent,
    });
  });
  if (process.env.NODE_ENV !== "production") {
    logger.info("Mounted /api/projects routes OK");
  }

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/debug/sentry-error", (_req, _res) => {
      throw new Error("Sentry Backend Test Error");
    });
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
    app.post("/api/dev/test-webhook", async (_req, res, next) => {
      const TEST_WEBHOOK_URL = "https://webhook.site/24f646b9-0338-4a5b-abee-7cd57e66736b";
      const payload = {
        event: "test.webhook",
        data: {
          message: "Hello from ALEXZA AI",
          timestamp: Date.now(),
        },
      };
      try {
        const response = await fetch(TEST_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Alexza-Event": "test.webhook",
            "X-Alexza-Source": "alexza-dev",
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          logger.info({ status: response.status }, "[Dev] Test webhook sent successfully");
          return res.json({ ok: true, message: "Webhook sent", status: response.status });
        }
        const text = await response.text();
        logger.warn({ status: response.status, body: text?.slice(0, 200) }, "[Dev] Test webhook failed");
        return res.status(502).json({ ok: false, error: "WEBHOOK_FAILED", status: response.status, body: text?.slice(0, 200) });
      } catch (err) {
        logger.error({ err: String(err) }, "[Dev] Test webhook failed");
        return next(err);
      }
    });
  } else {
    app.post("/api/dev/test-webhook", (_req, res) => {
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

  Sentry.setupExpressErrorHandler(app);

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const requestId = (req as express.Request & { requestId?: string }).requestId ?? randomUUID();
      const safeMsg = process.env.NODE_ENV === "production" ? "Unexpected server error" : sanitizeForLog(err);
      const isLoginRoute =
        req.path === "/api/auth/login" || req.originalUrl?.includes("/api/auth/login") || false;

      logger.error(
        {
          err: safeMsg,
          requestId,
          route: req.path,
          method: req.method,
          url: req.originalUrl,
          ...(isLoginRoute && {
            "[Login Error] stack": err instanceof Error ? err.stack : undefined,
            "[Login Error] bodyEmailMasked":
              req.body && typeof req.body === "object" && typeof req.body.email === "string"
                ? maskEmail(req.body.email)
                : "(no email in body)",
          }),
        },
        "Unhandled server error"
      );
      Sentry.setTag("requestId", requestId);
      res.setHeader("x-request-id", requestId);
      res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
        requestId,
      });
    }
  );

  const defaultPort = 3005;
  const configuredPort = Number.parseInt(process.env.PORT ?? String(defaultPort), 10);
  const port = Number.isNaN(configuredPort) ? defaultPort : configuredPort;

  const cookieName = getSessionCookieName();
  const corsOriginLog =
    allowedOrigins.length === 0
      ? "any (no CLIENT_URL/CORS_ORIGIN)"
      : allowedOrigins.join(", ");

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        { port, err: err.message },
        `[Startup] Port ${port} is in use. Set PORT=<free_port> in .env.local (e.g. PORT=3006) or kill the process using port ${port}.`
      );
    } else {
      logger.error({ port, err: err.message }, "[Startup] Server failed to listen");
    }
    process.exit(1);
  });

  server.listen(port, () => {
    const portActual = (server.address() as { port?: number })?.port ?? port;
    const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const runtimeDefaultProvider = hasOpenRouterKey ? "openrouter" : "openai";
    const sentryDsn = (process.env.SENTRY_DSN ?? "").trim();
    const sentryEnabled = Boolean(sentryDsn);
    const tracesSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

    const clientUrlNorm = normalizeEnvUrl(process.env.CLIENT_URL);
    const frontendUrlNorm = normalizeEnvUrl(process.env.FRONTEND_APP_URL);
    const oauthRedirectNorm = normalizeEnvUrl(process.env.OAUTH_REDIRECT_BASE_URL);
    const corsOriginNorm = (process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((o) => normalizeEnvUrl(o))
      .filter(Boolean);
    logger.info(
      {
        CLIENT_URL: clientUrlNorm || "(unset)",
        FRONTEND_APP_URL: frontendUrlNorm || "(unset)",
        OAUTH_REDIRECT_BASE_URL: oauthRedirectNorm || "(unset)",
        CORS_ORIGIN: corsOriginNorm.length ? corsOriginNorm : "(unset)",
      },
      "[Startup] Normalized env URLs"
    );

    const apiBaseUrl = `http://localhost:${portActual}`;
    logger.info(
      {
        msg: "[DEV] Server listening",
        port: portActual,
        apiBaseUrl,
        hint: "Set VITE_API_BASE_URL=" + apiBaseUrl + " if client runs on different port",
      },
      "[Startup] Server ready"
    );

    const logPayload: Record<string, unknown> = {
      msg: "Server started",
      port: portActual,
      nodeEnv: process.env.NODE_ENV ?? "development",
      cookieName,
      corsOrigin: corsOriginLog,
      hasOpenRouterKey,
      runtimeDefaultProvider,
      sentryEnabled,
    };

    if (process.env.NODE_ENV !== "production") {
      logPayload.tracesSampleRate = Number.isNaN(tracesSampleRate) ? 0.1 : tracesSampleRate;
      logPayload.release = sentryRelease;
    }

    logger.info(logPayload);

    startStatusMonitor();
  });
}

startServer().catch(console.error);
