/**
 * Generate Postman collection from OpenAPI spec.
 * Usage: pnpm exec tsx scripts/generate-postman.ts
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const Converter = require("openapi-to-postmanv2");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OPENAPI_PATH = path.join(ROOT, "openapi.yaml");
const COLLECTION_PATH = path.join(ROOT, "postman", "ALEXZA.postman_collection.json");

function stableId(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
}

function assignStableIds(obj: unknown, pathPrefix = "root"): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const o = obj as Record<string, unknown>;

  if (o.id && typeof o.id === "string") {
    const seed = pathPrefix + "-" + String(o.name ?? o.key ?? o.id);
    o.id = stableId(seed);
  }

  if (Array.isArray(o.item)) {
    o.item = o.item.map((item: unknown, i: number) => {
      const it = item as Record<string, unknown>;
      const name = (it.name ?? it.key ?? `item${i}`) as string;
      const req = it.request as Record<string, unknown> | undefined;
      const url = req?.url as { path?: string[] } | undefined;
      const pathArr = url?.path ?? [];
      const method = (req?.method ?? "GET") as string;
      const seed = `${pathPrefix}/${name}-${pathArr.join("-")}-${method}`;
      return assignStableIds(item, seed);
    });
  }

  if (Array.isArray(o.response)) {
    o.response = o.response.map((r: unknown, i: number) => assignStableIds(r, `${pathPrefix}/res${i}`));
  }

  if (o.originalRequest) {
    assignStableIds(o.originalRequest, `${pathPrefix}/orig`);
  }

  return o;
}

function injectCollectionVars(collection: Record<string, unknown>): void {
  const vars = [
    { key: "baseUrl", value: "http://localhost:3005", type: "string" },
    { key: "apiKey", value: "", type: "string" },
    { key: "projectId", value: "", type: "string" },
    { key: "actionName", value: "summarize_text", type: "string" },
    { key: "webhookUrl", value: "https://example.com/webhook", type: "string" },
    { key: "fromDate", value: "", type: "string" },
    { key: "toDate", value: "", type: "string" },
  ];
  collection.variable = vars;
}

function useEnvVarsForRunPath(collection: Record<string, unknown>): void {
  const walk = (items: unknown[]): void => {
    for (const item of items) {
      const it = item as Record<string, unknown>;
      if (it.item) walk(it.item as unknown[]);
      const req = it.request as Record<string, unknown> | undefined;
      const url = req?.url as { path?: string[]; variable?: Array<{ key: string; value: string }> } | undefined;
      if (url?.path?.includes("run")) {
        const vars = url.variable ?? [];
        for (const v of vars) {
          if (v.key === "projectId") v.value = "{{projectId}}";
          if (v.key === "actionName") v.value = "{{actionName}}";
        }
      }
    }
  };
  walk((collection.item ?? []) as unknown[]);
}

function ensureXApiKeyForRunRequests(collection: Record<string, unknown>): void {
  const xApiKeyAuth = {
    type: "apikey",
    apikey: [
      { key: "key", value: "x-api-key", type: "string" },
      { key: "value", value: "{{apiKey}}", type: "string" },
      { key: "in", value: "header", type: "string" },
    ],
  };
  const walk = (items: unknown[]): void => {
    for (const item of items) {
      const it = item as Record<string, unknown>;
      if (it.item) walk(it.item as unknown[]);
      const req = it.request as Record<string, unknown> | undefined;
      if (req?.url) {
        const url = req.url as string | { raw?: string; path?: string[] };
        const raw = typeof url === "string" ? url : (url as { raw?: string })?.raw ?? "";
        const pathArr = (url as { path?: string[] })?.path ?? [];
        const pathStr = Array.isArray(pathArr) ? pathArr.join("/") : "";
        const isRun = (raw + pathStr).includes("v1") && (raw + pathStr).includes("run");
        if (isRun) {
          req.auth = xApiKeyAuth;
        }
      }
    }
  };
  walk((collection.item ?? []) as unknown[]);
}

function fixExampleBodies(collection: Record<string, unknown>): void {
  const walk = (items: unknown[]): void => {
    for (const item of items) {
      const it = item as Record<string, unknown>;
      if (it.item) walk(it.item as unknown[]);
      const req = it.request as Record<string, unknown> | undefined;
      const body = req?.body as Record<string, unknown> | undefined;
      if (body?.raw && typeof body.raw === "string") {
        if (body.raw.includes("email") && body.raw.includes("password") && !body.raw.includes("user@example.com")) {
          body.raw = body.raw.replace(/"email":\s*"[^"]+"/, '"email": "user@example.com"');
          body.raw = body.raw.replace(/"password":\s*"string"/, '"password": "your-password"');
        }
        if (body.raw.includes("input") && body.raw.includes("text")) {
          body.raw = body.raw.replace(/"text":\s*"[^"]*"/, '"text": "Long text to summarize..."');
        }
      }
    }
  };
  walk((collection.item ?? []) as unknown[]);
}

function replaceUrlsWithVariables(collection: Record<string, unknown>): void {
  const repl = (obj: unknown): unknown => {
    if (!obj || typeof obj !== "object") return obj;
    const o = obj as Record<string, unknown>;
    if (o.raw && typeof o.raw === "string") {
      o.raw = o.raw.replace(/http:\/\/localhost:3005/g, "{{baseUrl}}");
    }
    if (o.url && typeof o.url === "object") {
      const u = o.url as Record<string, unknown>;
      if (typeof u.raw === "string") {
        u.raw = u.raw.replace(/http:\/\/localhost:3005/g, "{{baseUrl}}");
      }
    }
    for (const v of Object.values(o)) {
      if (v && typeof v === "object") repl(v);
    }
    return o;
  };
  repl(collection);
}

async function main(): Promise<void> {
  const specContent = fs.readFileSync(OPENAPI_PATH, "utf-8");

  return new Promise((resolve, reject) => {
    Converter.convert(
      { type: "string", data: specContent },
      {
        folderStrategy: "Tags",
        requestParametersResolution: "Example",
        includeAuthInfoInExample: true,
      },
      (err: Error | null, result: { result: boolean; output?: Array<{ data: unknown }>; reason?: string }) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result.result || !result.output?.[0]?.data) {
          reject(new Error(result.reason ?? "Conversion failed"));
          return;
        }

        let collection = result.output[0].data as Record<string, unknown>;
        collection.info = {
          ...(collection.info as object),
          name: "ALEXZA AI",
          description: "ALEXZA AI API - Run actions, manage projects, webhooks, analytics, audit logs.",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        };

        injectCollectionVars(collection);
        ensureXApiKeyForRunRequests(collection);
        useEnvVarsForRunPath(collection);
        replaceUrlsWithVariables(collection);
        fixExampleBodies(collection);
        collection = assignStableIds(collection) as Record<string, unknown>;

        function sortKeys(obj: unknown): unknown {
          if (obj === null || typeof obj !== "object") return obj;
          if (Array.isArray(obj)) return obj.map(sortKeys);
          const sorted: Record<string, unknown> = {};
          for (const k of Object.keys(obj as object).sort()) {
            sorted[k] = sortKeys((obj as Record<string, unknown>)[k]);
          }
          return sorted;
        }
        const sortedCollection = sortKeys(collection) as Record<string, unknown>;

        const outDir = path.dirname(COLLECTION_PATH);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(COLLECTION_PATH, JSON.stringify(sortedCollection, null, 2), "utf-8");
        console.log(`Generated: ${COLLECTION_PATH}`);
        resolve();
      }
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
