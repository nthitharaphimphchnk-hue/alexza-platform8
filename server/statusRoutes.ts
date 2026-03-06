/**
 * GET /api/status - Public status API for status page.
 */

import { Router, Request, Response } from "express";
import { runHealthCheck, getUptime24h } from "./statusService";

const router = Router();

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const components = await runHealthCheck();
    const uptime24h = getUptime24h();
    res.json({
      ok: true,
      components,
      uptime24h,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      components: [],
      uptime24h: 0,
      timestamp: new Date().toISOString(),
      error: "Status check failed",
    });
  }
});

export const statusRouter = router;
