/**
 * Smoke test for POST /v1/projects/:projectId/run/:actionName
 *
 * Prerequisites:
 * - Server running (pnpm dev)
 * - MONGODB_URI, SESSION_SECRET, and runtime API keys in .env.local
 *
 * Usage:
 *   pnpm tsx scripts/smoke-run-by-action.ts
 *
 * Optional:
 *   BASE_URL="http://localhost:3002" pnpm tsx scripts/smoke-run-by-action.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3002";
const PASSWORD = "password123";

async function request(
  path: string,
  init: RequestInit = {},
  cookies?: string
): Promise<{ response: Response; body: unknown }> {
  const headers = new Headers(init.headers || {});
  if (cookies) headers.set("cookie", cookies);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response: res, body };
}

function getCookies(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length === 0) {
    const single = res.headers.get("set-cookie");
    if (single) raw.push(single);
  }
  return raw
    .map((c) => (c.split(";")[0] || "").trim())
    .filter(Boolean)
    .join("; ");
}

async function main() {
  console.log("Smoke test: Run by Action");
  console.log("Base URL:", BASE_URL);
  console.log("");

  let cookies = "";

  // 1) Signup
  const email = `smoke-run-${Date.now()}@example.com`;
  const { response: signupRes } = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, name: "Smoke Run" }),
  });
  if (signupRes.ok) {
    cookies = getCookies(signupRes);
    console.log("1. Signup OK");
  } else {
    const { response: loginRes } = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (!loginRes.ok) {
      console.error("1. Signup/Login FAILED:", loginRes.status);
      process.exit(1);
    }
    cookies = getCookies(loginRes);
    console.log("1. Login OK (user exists)");
  }

  // 2) Create project
  const { response: projRes, body: projBody } = await request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Run Project", description: "Smoke test" }),
  }, cookies);

  if (!projRes.ok) {
    console.error("2. Create project FAILED:", projRes.status, projBody);
    process.exit(1);
  }
  const projectId = (projBody as { project?: { id: string } })?.project?.id;
  if (!projectId) {
    console.error("2. No project id in response:", projBody);
    process.exit(1);
  }
  console.log("2. Create project OK, id:", projectId);

  // 3) Create API key
  const { response: keyRes, body: keyBody } = await request(
    `/api/projects/${projectId}/keys`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Smoke Key" }),
    },
    cookies
  );

  if (!keyRes.ok) {
    console.error("3. Create API key FAILED:", keyRes.status, keyBody);
    process.exit(1);
  }
  const rawKey = (keyBody as { rawKey?: string })?.rawKey;
  if (!rawKey) {
    console.error("3. No rawKey in response:", keyBody);
    process.exit(1);
  }
  console.log("3. Create API key OK");

  // 4) Create action via API (use openai if OPENROUTER_API_KEY not set)
  const useOpenAI = !process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim().length === 0;
  const provider = useOpenAI ? "openai" : "openrouter";
  const model = process.env.EXECUTION_DEFAULT_MODEL || (useOpenAI ? "gpt-4o-mini" : "openai/gpt-4o-mini");

  const { response: actionRes, body: actionResBody } = await request(
    `/api/projects/${projectId}/actions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionName: "echo_test",
        description: "Echo smoke test",
        inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] },
        promptTemplate: "Echo back: {{input}}",
        provider,
        model,
      }),
    },
    cookies
  );

  if (!actionRes.ok) {
    console.error("4. Create action FAILED:", actionRes.status, JSON.stringify(actionResBody).slice(0, 200));
    process.exit(1);
  }
  console.log("4. Create action OK (echo_test)");

  // 5) Run action
  const { response: runRes, body: runBody } = await request(
    `/v1/projects/${projectId}/run/echo_test`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": rawKey,
      },
      body: JSON.stringify({ input: "Hello from smoke test" }),
    }
  );

  if (!runRes.ok) {
    console.error("5. Run action FAILED:", runRes.status, runBody);
    process.exit(1);
  }

  const run = runBody as { ok?: boolean; output?: string; requestId?: string; creditsCharged?: number };
  if (!run.ok || run.output === undefined || !run.requestId || run.creditsCharged === undefined) {
    console.error("5. Run response missing required fields:", run);
    process.exit(1);
  }
  console.log("5. Run action OK");
  console.log("   ok:", run.ok, "| requestId:", run.requestId, "| creditsCharged:", run.creditsCharged);
  console.log("   Output:", run.output ? run.output.slice(0, 80) + (run.output.length > 80 ? "..." : "") : "(empty)");

  console.log("");
  console.log("All steps passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
