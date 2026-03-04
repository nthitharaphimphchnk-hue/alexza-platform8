import type { Command } from "commander";
import { readFileSync } from "fs";
import { loadConfig } from "../config.js";
import { apiRequest, ApiError } from "../api.js";

interface RunResponse {
  ok: boolean;
  output?: unknown;
  creditsCharged?: number;
  requestId?: string;
}

function parseInput(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as unknown;
  }
  try {
    const content = readFileSync(trimmed, "utf-8");
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error(`Invalid --input: expected JSON string or path to JSON file`);
  }
}

export function runCommand(program: Command): void {
  program
    .command("run <action>")
    .description("Run an action")
    .option("-p, --project <id>", "Project ID (or use default from config)")
    .option("-i, --input <json|file>", "Input JSON string or path to JSON file")
    .action(async (action: string, opts: { project?: string; input?: string }) => {
      const config = loadConfig();
      const projectId = opts.project ?? config.projectId;
      if (!projectId) {
        console.error("Error: --project is required, or set projectId in config.");
        process.exit(1);
      }

      let body: { input?: unknown } = {};
      if (opts.input) {
        try {
          body.input = parseInput(opts.input);
        } catch (e) {
          console.error(e instanceof Error ? e.message : e);
          process.exit(1);
        }
      }

      try {
        const res = await apiRequest<RunResponse>(
          `/v1/projects/${projectId}/run/${encodeURIComponent(action)}`,
          { method: "POST", body: Object.keys(body).length ? body : { input: {} } }
        );
        if (!res.ok) {
          console.error("Run failed.");
          process.exit(1);
        }
        if (res.output !== undefined) {
          console.log(JSON.stringify(res.output, null, 2));
        }
        if (res.creditsCharged !== undefined) {
          console.error(`Credits charged: ${res.creditsCharged}`);
        }
      } catch (e) {
        if (e instanceof ApiError) {
          console.error(`Error: ${e.message}`);
        } else {
          console.error(e);
        }
        process.exit(1);
      }
    });
}
