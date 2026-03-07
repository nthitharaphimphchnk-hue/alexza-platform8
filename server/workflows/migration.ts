/**
 * Workflow collections - indexes.
 */

import { getDb } from "../db";
import type { WorkflowDoc } from "./types";
import type { WorkflowStepDoc } from "./types";
import { logger } from "../utils/logger";

let indexesReady: Promise<void> | null = null;

export async function ensureWorkflowIndexes(): Promise<void> {
  if (indexesReady) return indexesReady;

  indexesReady = (async () => {
    const db = await getDb();
    const workflows = db.collection<WorkflowDoc>("workflows");
    const steps = db.collection<WorkflowStepDoc>("workflow_steps");

    await workflows.createIndex({ workspaceId: 1, createdAt: -1 });
    await workflows.createIndex({ ownerUserId: 1 });
    await workflows.createIndex({ enabled: 1 });

    await steps.createIndex({ workflowId: 1, order: 1 });
    await steps.createIndex({ workflowId: 1 });

    logger.info("[Workflows] Indexes ready");
  })();

  return indexesReady;
}
