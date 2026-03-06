/**
 * API scope middleware - verifies API key has required scope.
 * When session auth is used (no req.apiKey), passes through.
 * When API key is used, returns 403 if scope is insufficient.
 */

import type { NextFunction, Request, Response } from "express";
import { hasScope, type ApiKeyScope } from "../config/scopes";

export function requireApiScope(required: ApiKeyScope) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      next();
      return;
    }
    const keyScopes = req.apiKey.scopes;
    if (hasScope(keyScopes, required)) {
      next();
      return;
    }
    res.status(403).json({ error: "insufficient_scope" });
  };
}
