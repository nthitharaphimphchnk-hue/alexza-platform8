import type { Command } from "commander";
import { apiRequest, ApiError } from "../api.js";

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

interface ProjectsResponse {
  ok: boolean;
  projects: Project[];
}

export function projectsCommand(program: Command): void {
  program
    .command("projects")
    .description("List user projects")
    .action(async () => {
      try {
        const res = await apiRequest<ProjectsResponse>("/api/projects");
        if (!res.ok || !res.projects) {
          console.error("Unexpected response from API.");
          process.exit(1);
        }
        if (res.projects.length === 0) {
          console.log("No projects found.");
          return;
        }
        for (const p of res.projects) {
          console.log(`${p.id}\t${p.name}\t${p.status ?? "active"}`);
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
