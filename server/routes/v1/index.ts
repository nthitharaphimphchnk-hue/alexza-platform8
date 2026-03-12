/**
 * ALEXZA AI API v1 - Stable public API
 *
 * All v1 endpoints are versioned and stable. Deprecated endpoints include
 * X-Alexza-Deprecated and X-Alexza-Replacement headers.
 */

import { Router } from "express";
import { runRouter } from "../../run";
import { runBySpecRouter } from "../../runBySpec";
import { requestTimeout } from "../../middleware/request-timeout";

const v1Router = Router();

// Runtime: POST /v1/run (legacy, deprecated) and POST /v1/projects/:projectId/run/:actionName
v1Router.use(requestTimeout("ai_run"));
v1Router.use(runRouter);
v1Router.use(runBySpecRouter);

export { v1Router };
