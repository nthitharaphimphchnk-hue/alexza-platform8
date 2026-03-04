import type { Command } from "commander";
import { apiRequest, ApiError } from "../api.js";

interface UsageResponse {
  ok: boolean;
  totalCreditsUsed?: number;
  totalApiCalls?: number;
  totalTokensUsed?: number;
  totalActionsRun?: number;
}

export function usageCommand(program: Command): void {
  program
    .command("usage")
    .description("Show analytics summary")
    .action(async () => {
      try {
        const res = await apiRequest<UsageResponse>("/api/analytics/overview");
        if (!res.ok) {
          console.error("Unexpected response from API.");
          process.exit(1);
        }
        console.log("Analytics (last 30 days):");
        console.log(`  Credits used:    ${res.totalCreditsUsed ?? 0}`);
        console.log(`  API calls:       ${res.totalApiCalls ?? 0}`);
        console.log(`  Tokens used:     ${res.totalTokensUsed ?? 0}`);
        console.log(`  Actions run:     ${res.totalActionsRun ?? 0}`);
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
