/**
 * Config stored at ~/.alexza/config.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface AlexzaConfig {
  apiKey?: string;
  baseUrl?: string;
  projectId?: string;
}

const CONFIG_DIR = join(homedir(), ".alexza");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_BASE_URL = "http://localhost:3005";

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): AlexzaConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : undefined,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULT_BASE_URL,
      projectId: typeof parsed.projectId === "string" ? parsed.projectId : undefined,
    };
  } catch {
    return { baseUrl: DEFAULT_BASE_URL };
  }
}

export function saveConfig(config: AlexzaConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
