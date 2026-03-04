/**
 * Auth middleware: accept either session (requireAuth) or x-api-key.
 * When API key is used, sets req.user from key's ownerUserId for compatibility.
 */

import type { NextFunction, Request, Response } from "express";
import type { AuthUser } from "./requireAuth";
import { requireAuth } from "./requireAuth";
import { requireApiKey } from "./requireApiKey";

export function requireAuthOrApiKey(req: Request, res: Response, next: NextFunction): void {
  const rawKey = req.headers["x-api-key"];
  if (typeof rawKey === "string" && rawKey.trim().length > 0) {
    return requireApiKey(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (req.apiKey) {
        req.user = {
          _id: req.apiKey.ownerUserId,
          id: req.apiKey.ownerUserId.toString(),
          email: "",
          name: "",
        } as AuthUser;
      }
      next();
    });
  }
  requireAuth(req, res, next);
}
