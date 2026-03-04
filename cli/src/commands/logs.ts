import type { Command } from "commander";
import { apiRequest, ApiError } from "../api.js";

interface RequestLog {
  id: string;
  projectId: string;
  projectName?: string;
  actionName: string;
  status: string;
  tokensUsed?: number;
  latencyMs?: number;
  error?: string;
  createdAt: string;
}

interface LogsResponse {
  ok: boolean;
  requests: RequestLog[];
  pagination?: { page: number; total: number; totalPages: number };
}

export function logsCommand(program: Command): void {
  program
    .command("logs")
    .description("Fetch request logs")
    .option("-p, --project <id>", "Filter by project ID")
    .option("-a, --action <name>", "Filter by action name")
    .option("-s, --status <status>", "Filter by status (success, error, failed_insufficient_credits)")
    .option("--page <n>", "Page number (default: 1)", "1")
    .action(async (opts: { project?: string; action?: string; status?: string; page?: string }) => {
      const params = new URLSearchParams();
      if (opts.project) params.set("projectId", opts.project);
      if (opts.action) params.set("actionName", opts.action);
      if (opts.status) params.set("status", opts.status);
      if (opts.page) params.set("page", opts.page);

      const query = params.toString();
      const path = `/api/requests${query ? `?${query}` : ""}`;

      try {
        const res = await apiRequest<LogsResponse>(path);
        if (!res.ok || !res.requests) {
          console.error("Unexpected response from API.");
          process.exit(1);
        }
        if (res.requests.length === 0) {
          console.log("No logs found.");
          return;
        }
        for (const r of res.requests) {
          const parts = [
            r.id,
            r.projectName ?? r.projectId,
            r.actionName,
            r.status,
            r.tokensUsed ?? "-",
            r.latencyMs ?? "-",
            r.createdAt,
          ];
          console.log(parts.join("\t"));
        }
        if (res.pagination && res.pagination.totalPages > 1) {
          console.error(`Page ${res.pagination.page} of ${res.pagination.totalPages} (${res.pagination.total} total)`);
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
