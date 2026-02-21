/**
 * Structured JSON logging with pino.
 * Redacts sensitive headers. No request body logging (sizes/keys only).
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-api-key']",
      "req.headers['x-admin-key']",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
});
