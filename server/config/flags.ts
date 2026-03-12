function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  const norm = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(norm)) return true;
  if (["0", "false", "no", "off"].includes(norm)) return false;
  return fallback;
}

export const PUBLIC_PLAYGROUND_ENABLED = readBooleanEnv("PUBLIC_PLAYGROUND_ENABLED", true);
export const MARKETPLACE_ENABLED = readBooleanEnv("MARKETPLACE_ENABLED", true);
export const COMMUNITY_ENABLED = readBooleanEnv("COMMUNITY_ENABLED", true);
export const APP_STORE_ENABLED = readBooleanEnv("APP_STORE_ENABLED", true);
export const AGENT_MARKETPLACE_ENABLED = readBooleanEnv("AGENT_MARKETPLACE_ENABLED", true);
export const WORKFLOW_MARKETPLACE_ENABLED = readBooleanEnv(
  "WORKFLOW_MARKETPLACE_ENABLED",
  true
);

