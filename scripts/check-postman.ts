/**
 * CI check: ensure Postman collection can be generated and has expected structure.
 * Run: pnpm exec tsx scripts/check-postman.ts
 * Exits 0 if generation succeeds and collection has key folders.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COLLECTION_PATH = path.join(ROOT, "postman", "ALEXZA.postman_collection.json");
const REQUIRED_FOLDERS = ["Auth", "Runtime", "Projects", "Webhooks", "Audit"];

function getFolderNames(collection: { item?: Array<{ name?: string }> }): string[] {
  return (collection.item ?? []).map((i) => i.name ?? "").filter(Boolean);
}

function main(): void {
  execSync("pnpm exec tsx scripts/generate-postman.ts", {
    cwd: ROOT,
    stdio: "pipe",
  });

  const content = fs.readFileSync(COLLECTION_PATH, "utf-8");
  const collection = JSON.parse(content) as { item?: Array<{ name?: string }> };
  const folders = getFolderNames(collection);

  for (const required of REQUIRED_FOLDERS) {
    if (!folders.includes(required)) {
      console.error(`Postman collection missing folder: ${required}`);
      process.exit(1);
    }
  }

  console.log("Postman collection generated successfully.");
}
