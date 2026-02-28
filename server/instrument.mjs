/**
 * Sentry instrumentation - MUST run before app (node --import).
 * Fixes "express is not instrumented" for ESM.
 * @see https://docs.sentry.io/platforms/javascript/guides/express/install/esm/
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import * as Sentry from "@sentry/node";

const dsn = (process.env.SENTRY_DSN ?? "").trim();
const environment = (process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development").trim();
const tracesSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
const profilesSampleRate = Number.parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? "0");
const release =
  (process.env.SENTRY_RELEASE ?? "").trim() ||
  (process.env.RENDER_GIT_COMMIT ?? process.env.GIT_SHA ?? process.env.COMMIT_SHA ?? "").trim() ||
  "dev-local";

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: Number.isNaN(tracesSampleRate) ? 0.1 : Math.min(1, Math.max(0, tracesSampleRate)),
    profilesSampleRate: Number.isNaN(profilesSampleRate) ? 0 : Math.min(1, Math.max(0, profilesSampleRate)),
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        if (event.request?.headers) {
          const h = event.request.headers;
          if (h.authorization) h.authorization = "[REDACTED]";
          if (h.cookie) h.cookie = "[REDACTED]";
          if (h["x-api-key"]) h["x-api-key"] = "[REDACTED]";
        }
      }
      return event;
    },
  });
}
