import type { Request } from "express";
import pinoHttp from "pino-http";
import { logger } from "../utils/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: Request) => (req as Request & { requestId?: string }).requestId ?? "unknown",
  customSuccessMessage: (_req, res) => `request completed ${res.statusCode}`,
  customErrorMessage: (_req, res, err) => `request errored ${res.statusCode}: ${err?.message ?? "unknown"}`,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // Do NOT log body - only path/method. No secrets.
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
