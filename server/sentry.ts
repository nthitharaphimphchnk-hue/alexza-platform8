/**
 * Sentry initialization for backend.
 * Init BEFORE routes/middleware. No provider/model exposure.
 */

import * as Sentry from "@sentry/node";

const dsn = (process.env.SENTRY_DSN ?? "").trim();
const environment = (process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development").trim();
const tracesSampleRate = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
const profilesSampleRate = Number.parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? "0");

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: Number.isNaN(tracesSampleRate) ? 0.1 : Math.min(1, Math.max(0, tracesSampleRate)),
    profilesSampleRate: Number.isNaN(profilesSampleRate) ? 0 : Math.min(1, Math.max(0, profilesSampleRate)),
    beforeSend(event) {
      // Never send secrets or provider/model names
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        if (headers.authorization) headers.authorization = "[REDACTED]";
        if (headers.cookie) headers.cookie = "[REDACTED]";
        if (headers["x-api-key"]) headers["x-api-key"] = "[REDACTED]";
      }
      return event;
    },
  });
}

export { Sentry };
