/**
 * Extract audit context from Express request.
 */

import type { Request } from "express";

export function getAuditContext(req: Request): { ip: string; userAgent: string } {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";
  const userAgent = (req.headers["user-agent"] as string) ?? "";
  return { ip, userAgent };
}
