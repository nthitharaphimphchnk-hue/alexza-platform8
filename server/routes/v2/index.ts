/**
 * ALEXZA AI API v2 - Scaffold for future versions
 *
 * v2 is reserved for future breaking changes. When implemented, it may introduce
 * new response shapes, pagination, or different authentication.
 */

import { Router } from "express";

const v2Router = Router();

// Placeholder: future v2 endpoints will be mounted here
v2Router.get("/", (_req, res) => {
  res.json({
    ok: true,
    version: "v2",
    message: "ALEXZA AI API v2 - Coming soon",
    stableVersion: "v1",
    docs: "/docs/api",
  });
});

export { v2Router };
