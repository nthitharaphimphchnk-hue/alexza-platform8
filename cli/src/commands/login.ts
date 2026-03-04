import type { Command } from "commander";
import * as readline from "readline";
import { loadConfig, saveConfig } from "../config.js";

export function loginCommand(program: Command): void {
  program
    .command("login")
    .description("Store API key locally (~/.alexza/config.json)")
    .option("-k, --key <key>", "API key (or prompted if omitted)")
    .option("-u, --url <url>", "Base URL (default: http://localhost:3005)")
    .option("-p, --project <id>", "Default project ID for run/actions")
    .action(async (opts: { key?: string; url?: string; project?: string }) => {
      const config = loadConfig();
      let apiKey = opts.key?.trim();

      if (!apiKey) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        apiKey = await new Promise<string>((resolve) => {
          rl.question("API key: ", (answer) => {
            rl.close();
            resolve(answer?.trim() ?? "");
          });
        });
      }

      if (!apiKey) {
        console.error("Error: API key is required.");
        process.exit(1);
      }

      const updated = {
        ...config,
        apiKey,
        baseUrl: opts.url?.trim() || config.baseUrl || "http://localhost:3005",
        projectId: opts.project !== undefined ? opts.project.trim() || undefined : config.projectId,
      };
      saveConfig(updated);
      console.log("API key stored successfully.");
    });
}
