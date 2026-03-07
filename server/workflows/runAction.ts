/**
 * Run AI action from workflow - uses temp API key and internal fetch.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { createTemporaryKeyForReplay, revokeKeyById } from "../keys";
import { logger } from "../utils/logger";

export async function runWorkflowAction(params: {
  projectId: string;
  actionName: string;
  input: Record<string, unknown>;
  ownerUserId: ObjectId;
}): Promise<{ output: string; usage?: { tokens?: number } }> {
  const projectId = new ObjectId(params.projectId);
  const db = await getDb();
  const project = await db.collection<{ ownerUserId: ObjectId }>("projects").findOne({ _id: projectId });
  const projectOwner = project?.ownerUserId ?? params.ownerUserId;

  let rawKey: string | null = null;
  let keyId: ObjectId | null = null;

  try {
    const keyResult = await createTemporaryKeyForReplay(projectId, projectOwner);
    rawKey = keyResult.rawKey;
    keyId = keyResult.keyId;
  } catch (err) {
    logger.error({ err, projectId: params.projectId }, "[Workflow] runAction: failed to create temp key");
    throw new Error("Failed to create workflow execution key");
  }

  const baseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT ?? 3002}`;
  const runUrl = `${baseUrl}/v1/projects/${params.projectId}/run/${encodeURIComponent(params.actionName)}`;
  const payload = { input: params.input };

  try {
    const res = await fetch(runUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok?: boolean; output?: string; usage?: { tokens?: number } };
    if (!res.ok) {
      const msg = (json as { error?: { message?: string } }).error?.message ?? "Action failed";
      throw new Error(msg);
    }
    return {
      output: json.output ?? "",
      usage: json.usage,
    };
  } finally {
    await revokeKeyById(keyId!);
  }
}
