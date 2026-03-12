type JsonRecord = Record<string, unknown>;

type Status = "PASS" | "WARN" | "FAIL";

interface CheckResult {
  name: string;
  status: Status;
  detail: string;
}

interface CategorySummary {
  category: string;
  status: Status;
  checks: CheckResult[];
}

const BASE_URL =
  process.env.PROD_BASE_URL?.trim() ||
  process.env.READINESS_BASE_URL?.trim() ||
  "https://alexza-platform8.onrender.com";

const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "SESSION_SECRET",
];

const AI_ENV_VARS = ["OPENAI_API_KEY", "OPENROUTER_API_KEY"];

const STRIPE_ENV_VARS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

const OAUTH_ENV_VARS = [
  "OAUTH_REDIRECT_BASE_URL",
  "CLIENT_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
];

const SENTRY_ENV_VARS = ["SENTRY_DSN", "VITE_SENTRY_DSN"];

const RATE_LIMIT_ENV_VARS = [
  "RATE_LIMIT_IP_PER_MIN",
  "RATE_LIMIT_FREE_PER_MIN",
  "RATE_LIMIT_PRO_PER_MIN",
  "RATE_LIMIT_ENTERPRISE_PER_MIN",
];

const TIMEOUT_ENV_VARS = [
  "REQUEST_TIMEOUT_MS",
  "AI_RUN_TIMEOUT_MS",
  "WEBHOOK_TIMEOUT_MS",
  "WORKFLOW_STEP_TIMEOUT_MS",
];

function getEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return undefined;
  return raw.trim();
}

function classifyStatus(values: Status[]): Status {
  if (values.includes("FAIL")) return "FAIL";
  if (values.includes("WARN")) return "WARN";
  return "PASS";
}

async function request(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; bodyText: string; json: JsonRecord | null }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, init);
  const text = await res.text();
  let json: JsonRecord | null = null;
  try {
    json = text ? (JSON.parse(text) as JsonRecord) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, bodyText: text, json };
}

function summarizeBody(body: string, max = 200): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}...`;
}

async function checkEnvironment(): Promise<CategorySummary> {
  const checks: CheckResult[] = [];

  for (const name of REQUIRED_ENV_VARS) {
    const present = Boolean(getEnv(name));
    checks.push({
      name: `env:${name}`,
      status: present ? "PASS" : "FAIL",
      detail: present ? `${name} is set` : `${name} is missing`,
    });
  }

  const aiPresent = AI_ENV_VARS.some((v) => Boolean(getEnv(v)));
  checks.push({
    name: "env:ai_providers",
    status: aiPresent ? "PASS" : "FAIL",
    detail: aiPresent
      ? "At least one AI provider key (OPENAI_API_KEY or OPENROUTER_API_KEY) is configured"
      : "No AI provider API keys configured",
  });

  const stripePresent = STRIPE_ENV_VARS.every((v) => Boolean(getEnv(v)));
  checks.push({
    name: "env:stripe",
    status: stripePresent ? "PASS" : "WARN",
    detail: stripePresent
      ? "Stripe secrets configured"
      : "Stripe secrets not fully configured (wallet & marketplace billing will be disabled)",
  });

  const anyOauth = OAUTH_ENV_VARS.some((v) => Boolean(getEnv(v)));
  checks.push({
    name: "env:oauth",
    status: anyOauth ? "PASS" : "WARN",
    detail: anyOauth
      ? "OAuth env vars present"
      : "OAuth not configured (Google/GitHub login will be disabled)",
  });

  const sentryBackend = Boolean(getEnv("SENTRY_DSN"));
  const sentryFrontend = Boolean(getEnv("VITE_SENTRY_DSN"));
  const sentryStatus: Status =
    sentryBackend && sentryFrontend ? "PASS" : sentryBackend || sentryFrontend ? "WARN" : "WARN";
  checks.push({
    name: "env:sentry",
    status: sentryStatus,
    detail: sentryBackend && sentryFrontend
      ? "Sentry DSNs configured for backend and frontend"
      : sentryBackend || sentryFrontend
        ? "Sentry partially configured (one of backend/frontend DSN missing)"
        : "Sentry not configured (no SENTRY_DSN / VITE_SENTRY_DSN)",
  });

  const samlEnabled = getEnv("SAML_ENABLED") === "true";
  checks.push({
    name: "env:saml",
    status: samlEnabled ? "WARN" : "PASS",
    detail: samlEnabled
      ? "SAML_ENABLED=true – ensure per-workspace SAML config is set in the app"
      : "SAML not enabled",
  });

  const rateLimitDetails: string[] = [];
  let rateLimitStatus: Status = "PASS";
  for (const name of RATE_LIMIT_ENV_VARS) {
    const raw = getEnv(name);
    if (!raw) {
      rateLimitDetails.push(`${name}=<default>`);
      continue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      rateLimitStatus = "WARN";
      rateLimitDetails.push(`${name}=INVALID("${raw}")`);
    } else {
      rateLimitDetails.push(`${name}=${parsed}`);
    }
  }
  checks.push({
    name: "env:rate_limits",
    status: rateLimitStatus,
    detail: rateLimitDetails.join(", ") || "Using built-in defaults",
  });

  let timeoutStatus: Status = "PASS";
  const timeoutDetails: string[] = [];
  for (const name of TIMEOUT_ENV_VARS) {
    const raw = getEnv(name);
    if (!raw) {
      timeoutDetails.push(`${name}=<default>`);
      continue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      timeoutStatus = "FAIL";
      timeoutDetails.push(`${name}=INVALID("${raw}")`);
    } else {
      timeoutDetails.push(`${name}=${parsed}`);
    }
  }
  checks.push({
    name: "env:timeouts",
    status: timeoutStatus,
    detail: timeoutDetails.join(", ") || "Using built-in defaults",
  });

  return {
    category: "Environment",
    status: classifyStatus(checks.map((c) => c.status)),
    checks,
  };
}

async function checkDatabaseAndHealth(): Promise<CategorySummary[]> {
  const healthChecks: CategorySummary[] = [];

  // Basic /api/health
  const healthResults: CheckResult[] = [];
  try {
    const res = await request("/api/health");
    const ok = res.status === 200 && res.json?.ok === true;
    healthResults.push({
      name: "health:api_health",
      status: ok ? "PASS" : "FAIL",
      detail: `GET /api/health status=${res.status} body=${summarizeBody(res.bodyText)}`,
    });
  } catch (err) {
    healthResults.push({
      name: "health:api_health",
      status: "FAIL",
      detail: `GET /api/health failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  healthChecks.push({
    category: "Health",
    status: classifyStatus(healthResults.map((c) => c.status)),
    checks: healthResults,
  });

  // DB health
  const dbChecks: CheckResult[] = [];
  try {
    const res = await request("/api/health/db");
    const ok = res.status === 200 && res.json?.ok === true;
    dbChecks.push({
      name: "health:db",
      status: ok ? "PASS" : "FAIL",
      detail: `GET /api/health/db status=${res.status} body=${summarizeBody(res.bodyText)}`,
    });
  } catch (err) {
    dbChecks.push({
      name: "health:db",
      status: "FAIL",
      detail: `GET /api/health/db failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  healthChecks.push({
    category: "Database",
    status: classifyStatus(dbChecks.map((c) => c.status)),
    checks: dbChecks,
  });

  // OpenAI provider health
  const aiChecks: CheckResult[] = [];
  try {
    const res = await request("/api/health/openai");
    const configured = res.json?.configured === true;
    aiChecks.push({
      name: "health:openai",
      status: configured ? "PASS" : "WARN",
      detail: `GET /api/health/openai status=${res.status} configured=${configured}`,
    });
  } catch (err) {
    aiChecks.push({
      name: "health:openai",
      status: "WARN",
      detail: `GET /api/health/openai failed: ${err instanceof Error ? err.message : String(
        err
      )}`,
    });
  }

  healthChecks.push({
    category: "AI Providers",
    status: classifyStatus(aiChecks.map((c) => c.status)),
    checks: aiChecks,
  });

  return healthChecks;
}

async function runAuthProjectAndRunFlow(): Promise<CategorySummary[]> {
  const summaries: CategorySummary[] = [];
  const checks: CheckResult[] = [];

  const jar = new (class {
    private readonly cookies = new Map<string, string>();
    addFromResponse(response: Response) {
      const headers = response.headers as Headers & { getSetCookie?: () => string[] };
      const rawSetCookies = headers.getSetCookie?.() ?? [];
      for (const raw of rawSetCookies) {
        const firstPart = raw.split(";")[0] || "";
        const separator = firstPart.indexOf("=");
        if (separator < 1) continue;
        const key = firstPart.slice(0, separator).trim();
        const value = firstPart.slice(separator + 1).trim();
        if (!key || !value) continue;
        this.cookies.set(key, value);
      }
    }
    toHeader(): string {
      return Array.from(this.cookies.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
    }
  })();

  const email = `readiness-${Date.now()}@example.com`;
  const password = process.env.PROD_SMOKE_PASSWORD || "password123";
  const name = "Production Readiness User";

  async function authedRequest(
    path: string,
    init: RequestInit = {}
  ): Promise<{ ok: boolean; status: number; bodyText: string; json: JsonRecord | null }> {
    const headers = new Headers(init.headers || {});
    const cookieHeader = jar.toHeader();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
    return request(path, { ...init, headers });
  }

  // signup
  try {
    const res = await authedRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    checks.push({
      name: "auth:signup",
      status: res.status === 201 ? "PASS" : "FAIL",
      detail: `POST /api/auth/signup status=${res.status} body=${summarizeBody(res.bodyText)}`,
    });
  } catch (err) {
    checks.push({
      name: "auth:signup",
      status: "FAIL",
      detail: `POST /api/auth/signup failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // login
  let loginOk = false;
  try {
    const res = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    jar.addFromResponse(res as Response);
    loginOk = res.status === 200 && jar.toHeader().length > 0;
    checks.push({
      name: "auth:login",
      status: loginOk ? "PASS" : "FAIL",
      detail: `POST /api/auth/login status=${res.status} cookies=${
        jar.toHeader() ? "set" : "missing"
      }`,
    });
  } catch (err) {
    checks.push({
      name: "auth:login",
      status: "FAIL",
      detail: `POST /api/auth/login failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  let projectId = "";
  let rawKey = "";

  // projects + keys + /v1/run
  if (loginOk) {
    try {
      const createProject = await authedRequest("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Readiness Check Project",
          description: "Production readiness check",
          model: "gpt-4o-mini",
        }),
      });
      const proj = createProject.json?.project as JsonRecord | undefined;
      projectId = String(proj?.id || proj?._id || "");
      const ok = createProject.status === 201 && projectId.length > 0;
      checks.push({
        name: "projects:create",
        status: ok ? "PASS" : "FAIL",
        detail: `POST /api/projects status=${createProject.status} projectId=${projectId || "missing"}`,
      });
    } catch (err) {
      checks.push({
        name: "projects:create",
        status: "FAIL",
        detail: `POST /api/projects failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    if (projectId) {
      try {
        const keyRes = await authedRequest(`/api/projects/${projectId}/keys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Readiness Key" }),
        });
        rawKey = String(keyRes.json?.rawKey || "");
        const ok = keyRes.status === 201 && rawKey.length > 0;
        checks.push({
          name: "keys:create",
          status: ok ? "PASS" : "FAIL",
          detail: `POST /api/projects/:id/keys status=${keyRes.status} rawKey=${
            rawKey ? "present" : "missing"
          }`,
        });
      } catch (err) {
        checks.push({
          name: "keys:create",
          status: "FAIL",
          detail: `POST /api/projects/:id/keys failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }
    } else {
      checks.push({
        name: "keys:create",
        status: "WARN",
        detail: "Skipped: project creation failed",
      });
    }

    if (rawKey) {
      try {
        const runRes = await request("/v1/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": rawKey,
          },
          body: JSON.stringify({ input: "readiness check" }),
        });
        const ok = runRes.status === 200 && runRes.json?.ok === true;
        checks.push({
          name: "runtime:v1_run",
          status: ok ? "PASS" : "WARN",
          detail: `POST /v1/run status=${runRes.status} body=${summarizeBody(runRes.bodyText)}`,
        });
      } catch (err) {
        checks.push({
          name: "runtime:v1_run",
          status: "WARN",
          detail: `POST /v1/run failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    } else {
      checks.push({
        name: "runtime:v1_run",
        status: "WARN",
        detail: "Skipped: API key not available",
      });
    }
  } else {
    checks.push(
      {
        name: "projects:create",
        status: "WARN",
        detail: "Skipped: login failed, no session cookie",
      },
      {
        name: "keys:create",
        status: "WARN",
        detail: "Skipped: login failed, no session cookie",
      },
      {
        name: "runtime:v1_run",
        status: "WARN",
        detail: "Skipped: login failed, no session cookie",
      }
    );
  }

  summaries.push({
    category: "Auth & Projects",
    status: classifyStatus(
      checks
        .filter((c) => c.name.startsWith("auth:") || c.name.startsWith("projects:"))
        .map((c) => c.status)
    ),
    checks: checks.filter(
      (c) => c.name.startsWith("auth:") || c.name.startsWith("projects:")
    ),
  });

  summaries.push({
    category: "API Keys & Run",
    status: classifyStatus(
      checks
        .filter((c) => c.name.startsWith("keys:") || c.name.startsWith("runtime:"))
        .map((c) => c.status)
    ),
    checks: checks.filter(
      (c) => c.name.startsWith("keys:") || c.name.startsWith("runtime:")
    ),
  });

  return summaries;
}

async function checkAdditionalRoutes(): Promise<CategorySummary[]> {
  const categories: CategorySummary[] = [];

  const routeChecks: CheckResult[] = [];

  // Webhook routes (list endpoints, even if 401 they should exist)
  try {
    const res = await request("/api/webhooks");
    const status: Status = res.status === 200 || res.status === 401 ? "PASS" : "WARN";
    routeChecks.push({
      name: "routes:webhooks",
      status,
      detail: `GET /api/webhooks status=${res.status}`,
    });
  } catch (err) {
    routeChecks.push({
      name: "routes:webhooks",
      status: "WARN",
      detail: `GET /api/webhooks failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Billing routes
  try {
    const res = await request("/api/billing/stripe/summary");
    const status: Status = res.status >= 200 && res.status < 500 ? "PASS" : "WARN";
    routeChecks.push({
      name: "routes:billing",
      status,
      detail: `GET /api/billing/stripe/summary status=${res.status}`,
    });
  } catch (err) {
    routeChecks.push({
      name: "routes:billing",
      status: "WARN",
      detail: `GET /api/billing/stripe/summary failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }

  // Marketplace & community routes (backend)
  const backendPaths = [
    ["/api/marketplace", "routes:marketplace"],
    ["/api/agent-marketplace", "routes:agent_marketplace"],
    ["/api/workflow-marketplace", "routes:workflow_marketplace"],
    ["/api/community/trending-agents", "routes:community"],
  ] as const;
  for (const [path, name] of backendPaths) {
    try {
      const res = await request(path);
      const status: Status = res.status >= 200 && res.status < 500 ? "PASS" : "WARN";
      routeChecks.push({
        name,
        status,
        detail: `GET ${path} status=${res.status}`,
      });
    } catch (err) {
      routeChecks.push({
        name,
        status: "WARN",
        detail: `GET ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  categories.push({
    category: "Core Routes",
    status: classifyStatus(routeChecks.map((c) => c.status)),
    checks: routeChecks,
  });

  // Frontend routes (playground, docs, dashboard)
  const frontendChecks: CheckResult[] = [];
  const frontendPaths = [
    ["/docs", "frontend:docs"],
    ["/app/playground", "frontend:playground"],
    ["/app/dashboard", "frontend:dashboard"],
  ] as const;
  for (const [path, name] of frontendPaths) {
    try {
      const res = await request(path);
      const status: Status = res.status >= 200 && res.status < 500 ? "PASS" : "WARN";
      frontendChecks.push({
        name,
        status,
        detail: `GET ${path} status=${res.status}`,
      });
    } catch (err) {
      frontendChecks.push({
        name,
        status: "WARN",
        detail: `GET ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  categories.push({
    category: "Frontend Routes",
    status: classifyStatus(frontendChecks.map((c) => c.status)),
    checks: frontendChecks,
  });

  return categories;
}

function printSummary(summaries: CategorySummary[]) {
  const byCategory = new Map<string, Status>();
  for (const s of summaries) {
    byCategory.set(s.category, s.status);
  }

  function printLine(label: string, key: string) {
    const status = byCategory.get(key) ?? "WARN";
    console.log(`${label}: ${status}`);
  }

  printLine("Environment", "Environment");
  printLine("Health", "Health");
  printLine("Database", "Database");
  printLine("AI Providers", "AI Providers");
  printLine("Auth & Projects", "Auth & Projects");
  printLine("API Keys & Run", "API Keys & Run");
  printLine("Core Routes", "Core Routes");
  printLine("Frontend", "Frontend Routes");

  const overallStatus = classifyStatus(
    Array.from(byCategory.values())
  );
  const ready = overallStatus !== "FAIL";
  console.log(`Overall: ${ready ? "READY" : "NOT READY"}`);
}

async function main() {
  console.log("=== ALEXZA AI Production Readiness ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log("");

  const allSummaries: CategorySummary[] = [];

  allSummaries.push(await checkEnvironment());

  const healthSummaries = await checkDatabaseAndHealth();
  allSummaries.push(...healthSummaries);

  const authSummaries = await runAuthProjectAndRunFlow();
  allSummaries.push(...authSummaries);

  const routeSummaries = await checkAdditionalRoutes();
  allSummaries.push(...routeSummaries);

  console.log("");
  printSummary(allSummaries);
  console.log("");
  console.log("Details:");
  for (const summary of allSummaries) {
    console.log(`\n[${summary.category}] (${summary.status})`);
    for (const check of summary.checks) {
      console.log(`- ${check.name}: ${check.status} - ${check.detail}`);
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Readiness check failed with unexpected error:", err);
  process.exit(1);
});

