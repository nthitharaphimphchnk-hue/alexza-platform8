type JsonRecord = Record<string, unknown>;

type Status = "PASS" | "WARN" | "FAIL";

interface StepResult {
  name: string;
  status: Status;
  httpStatus?: number;
  detail: string;
}

const BASE_URL =
  process.env.PROD_BASE_URL?.trim() ||
  process.env.SMOKE_BASE_URL?.trim() ||
  "https://alexza-platform8.onrender.com";

const API_KEY = process.env.PROD_SMOKE_API_KEY?.trim() || "";

function summarizeBody(body: string, max = 200): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}...`;
}

async function request(
  path: string,
  init: RequestInit = {}
): Promise<{ response: Response; bodyText: string; json: JsonRecord | null }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, init);
  const text = await res.text();
  let json: JsonRecord | null = null;
  try {
    json = text ? (JSON.parse(text) as JsonRecord) : null;
  } catch {
    json = null;
  }
  return { response: res, bodyText: text, json };
}

function printStep(step: StepResult) {
  console.log(
    `[${step.status}] ${step.name}${
      step.httpStatus ? ` status=${step.httpStatus}` : ""
    } | ${step.detail}`
  );
}

function classifyStatus(steps: StepResult[]): Status {
  if (steps.some((s) => s.status === "FAIL")) return "FAIL";
  if (steps.some((s) => s.status === "WARN")) return "WARN";
  return "PASS";
}

async function main() {
  const steps: StepResult[] = [];

  console.log("=== ALEXZA AI Production Smoke Test ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log("");

  function record(step: StepResult) {
    steps.push(step);
    printStep(step);
  }

  // Public pages
  const publicPaths: Array<[string, string]> = [
    ["/", "homepage"],
    ["/docs", "docs"],
    ["/pricing", "pricing"],
    ["/app/playground", "playground"],
    ["/login", "login"],
    ["/signup", "signup"],
  ];

  for (const [path, name] of publicPaths) {
    try {
      const { response } = await request(path);
      const ok = response.status >= 200 && response.status < 500;
      record({
        name: `public:${name}`,
        status: ok ? "PASS" : "FAIL",
        httpStatus: response.status,
        detail: `GET ${path}`,
      });
    } catch (err) {
      record({
        name: `public:${name}`,
        status: "FAIL",
        detail: `GET ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Health endpoints
  const healthPaths: Array<[string, string]> = [
    ["/api/health", "health"],
    ["/api/health/db", "health_db"],
    ["/api/health/openai", "health_openai"],
  ];

  for (const [path, name] of healthPaths) {
    try {
      const { response, bodyText, json } = await request(path);
      const ok =
        response.status === 200 && (name === "health_openai" ? json?.ok === true : json?.ok === true);
      record({
        name: `health:${name}`,
        status: ok ? "PASS" : "FAIL",
        httpStatus: response.status,
        detail: `GET ${path} body=${summarizeBody(bodyText)}`,
      });
    } catch (err) {
      record({
        name: `health:${name}`,
        status: "FAIL",
        detail: `GET ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Marketplace & community public APIs
  const apiPaths: Array<[string, string]> = [
    ["/api/marketplace", "marketplace"],
    ["/api/agent-marketplace", "agent_marketplace"],
    ["/api/workflow-marketplace", "workflow_marketplace"],
    ["/api/community/trending-agents", "community_trending_agents"],
    ["/api/community/popular-workflows", "community_popular_workflows"],
    ["/api/community/top-creators", "community_top_creators"],
    ["/api/community/new-packs", "community_new_packs"],
    ["/api/community/featured-apps", "community_featured_apps"],
  ];

  for (const [path, name] of apiPaths) {
    try {
      const { response } = await request(path);
      const ok = response.status >= 200 && response.status < 500;
      record({
        name: `api:${name}`,
        status: ok ? "PASS" : "WARN",
        httpStatus: response.status,
        detail: `GET ${path}`,
      });
    } catch (err) {
      record({
        name: `api:${name}`,
        status: "WARN",
        detail: `GET ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Webhook and billing endpoint presence
  try {
    const { response } = await request("/api/webhooks");
    const ok = response.status === 200 || response.status === 401;
    record({
      name: "api:webhooks",
      status: ok ? "PASS" : "WARN",
      httpStatus: response.status,
      detail: "GET /api/webhooks",
    });
  } catch (err) {
    record({
      name: "api:webhooks",
      status: "WARN",
      detail: `GET /api/webhooks failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    const { response } = await request("/api/billing/stripe/summary");
    const ok = response.status >= 200 && response.status < 500;
    record({
      name: "api:billing",
      status: ok ? "PASS" : "WARN",
      httpStatus: response.status,
      detail: "GET /api/billing/stripe/summary",
    });
  } catch (err) {
    record({
      name: "api:billing",
      status: "WARN",
      detail: `GET /api/billing/stripe/summary failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }

  // Optional: /v1/run smoke if test API key is provided
  if (API_KEY) {
    try {
      const { response, bodyText, json } = await request("/v1/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ input: "production smoke test" }),
      });
      const ok = response.status === 200 && json?.ok === true;
      record({
        name: "runtime:v1_run",
        status: ok ? "PASS" : "WARN",
        httpStatus: response.status,
        detail: `POST /v1/run body=${summarizeBody(bodyText)}`,
      });
    } catch (err) {
      record({
        name: "runtime:v1_run",
        status: "WARN",
        detail: `POST /v1/run failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  } else {
    record({
      name: "runtime:v1_run",
      status: "WARN",
      detail: "Skipped: PROD_SMOKE_API_KEY not set",
    });
  }

  console.log("");
  const overall = classifyStatus(steps);
  console.log(`Overall: ${overall === "FAIL" ? "NOT READY" : "OK (with possible warnings)"}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Production smoke test failed with unexpected error:", err);
  process.exit(1);
});

