import type { Command } from "commander";
import { loadConfig } from "../config.js";
import { apiRequest, ApiError } from "../api.js";

interface Action {
  actionName: string;
  description?: string;
}

interface ActionsResponse {
  ok: boolean;
  actions: Action[];
}

export function actionsCommand(program: Command): void {
  program
    .command("actions")
    .description("List actions in project")
    .option("-p, --project <id>", "Project ID (or use default from config)")
    .action(async (opts: { project?: string }) => {
      const config = loadConfig();
      const projectId = opts.project ?? config.projectId;
      if (!projectId) {
        console.error("Error: --project is required, or set projectId in config (alexza login --project <id>).");
        process.exit(1);
      }

      try {
        const res = await apiRequest<ActionsResponse>(`/api/projects/${projectId}/actions`);
        if (!res.ok || !res.actions) {
          console.error("Unexpected response from API.");
          process.exit(1);
        }
        if (res.actions.length === 0) {
          console.log("No actions found.");
          return;
        }
        for (const a of res.actions) {
          console.log(`${a.actionName}\t${a.description ?? ""}`);
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
