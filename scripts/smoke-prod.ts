type JsonRecord = Record<string, unknown>;

const BASE_URL = process.env.PROD_BASE_URL || "https://alexza-platform8.onrenderer.com";
const PASSWORD = process.env.PROD_SMOKE_PASSWORD || "password123";
const NAME = "Prod Smoke";
const INPUT_TEXT = `echo smoke ${Date.now()}`;

interface StepResult {
  name: string;
  ok: boolean;
  status?: number;
  detail: string;
  skipped?: boolean;
}

class CookieJar {
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
}

function toDetail(body: string, max = 220): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}...`;
}

async function requestJson(
  path: string,
  init: RequestInit = {},
  cookieJar?: CookieJar
): Promise<{ response: Response; bodyText: string; json: JsonRecord | null }> {
  const headers = new Headers(init.headers || {});
  if (cookieJar) {
    const cookieHeader = cookieJar.toHeader();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });

  const bodyText = await response.text();
  if (cookieJar) {
    cookieJar.addFromResponse(response);
  }

  let json: JsonRecord | null = null;
  try {
    json = bodyText ? (JSON.parse(bodyText) as JsonRecord) : null;
  } catch {
    json = null;
  }

  return { response, bodyText, json };
}

function printStep(result: StepResult) {
  const icon = result.skipped ? "SKIP" : result.ok ? "PASS" : "FAIL";
  const statusText = result.status ? ` status=${result.status}` : "";
  console.log(`[${icon}] ${result.name}${statusText} | ${result.detail}`);
}

async function main() {
  const results: StepResult[] = [];
  const jar = new CookieJar();
  const email = `prod-smoke-${Date.now()}@example.com`;
  let projectId = "";
  let rawKey = "";

  const record = (step: StepResult) => {
    results.push(step);
    printStep(step);
  };

  try {
    const health = await requestJson("/api/health");
    record({
      name: "health",
      ok: health.response.status === 200 && health.json?.ok === true,
      status: health.response.status,
      detail: toDetail(health.bodyText),
    });

    const healthDb = await requestJson("/api/health/db");
    record({
      name: "health_db",
      ok: healthDb.response.status === 200 && healthDb.json?.ok === true,
      status: healthDb.response.status,
      detail: toDetail(healthDb.bodyText),
    });

    const signup = await requestJson(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: PASSWORD, name: NAME }),
      },
      jar
    );
    record({
      name: "auth_signup",
      ok: signup.response.status === 201,
      status: signup.response.status,
      detail: toDetail(signup.bodyText),
    });

    const login = await requestJson(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: PASSWORD }),
      },
      jar
    );
    record({
      name: "auth_login",
      ok: login.response.status === 200 && jar.toHeader().length > 0,
      status: login.response.status,
      detail: `cookies=${jar.toHeader() ? "set" : "missing"} body=${toDetail(login.bodyText)}`,
    });

    if (login.response.status === 200 && jar.toHeader().length > 0) {
      const createProject = await requestJson(
        "/api/projects",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Prod Smoke Project", description: "smoke", model: "GPT-4" }),
        },
        jar
      );
      projectId = String(
        (createProject.json?.project as JsonRecord | undefined)?.id || ""
      );
      record({
        name: "projects_create",
        ok: createProject.response.status === 201 && projectId.length > 0,
        status: createProject.response.status,
        detail: `projectId=${projectId || "missing"} body=${toDetail(createProject.bodyText)}`,
      });

      const listProjects = await requestJson("/api/projects", { method: "GET" }, jar);
      const hasCreatedProject =
        Array.isArray(listProjects.json?.projects) &&
        (listProjects.json?.projects as unknown[]).some((project) => {
          const row = project as JsonRecord;
          return String(row.id || row._id || "") === projectId;
        });
      record({
        name: "projects_list",
        ok: listProjects.response.status === 200 && hasCreatedProject,
        status: listProjects.response.status,
        detail: `containsCreatedProject=${hasCreatedProject} body=${toDetail(listProjects.bodyText)}`,
      });
    } else {
      record({
        name: "projects_create",
        ok: false,
        skipped: true,
        detail: "Skipped: login failed, no session cookie",
      });
      record({
        name: "projects_list",
        ok: false,
        skipped: true,
        detail: "Skipped: login failed, no session cookie",
      });
    }

    if (projectId) {
      const createKey = await requestJson(
        `/api/projects/${projectId}/keys`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Prod Smoke Key" }),
        },
        jar
      );
      rawKey = String(createKey.json?.rawKey || "");
      const keyPrefix = String(
        createKey.json?.key && typeof createKey.json.key === "object"
          ? (createKey.json.key as JsonRecord).prefix || ""
          : ""
      );
      record({
        name: "keys_create",
        ok: createKey.response.status === 201 && rawKey.length > 0 && keyPrefix.length > 0,
        status: createKey.response.status,
        detail: `rawKey=${rawKey ? "present" : "missing"} keyPrefix=${keyPrefix || "missing"}`,
      });
    } else {
      record({
        name: "keys_create",
        ok: false,
        skipped: true,
        detail: "Skipped: project creation failed",
      });
    }

    if (rawKey) {
      const run = await requestJson("/v1/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": rawKey,
        },
        body: JSON.stringify({ input: INPUT_TEXT }),
      });
      const runOutput = String(run.json?.output || "");
      record({
        name: "v1_run",
        ok: run.response.status === 200 && run.json?.ok === true && runOutput.length > 0,
        status: run.response.status,
        detail: `outputSnippet=${toDetail(runOutput || run.bodyText)}`,
      });
    } else {
      record({
        name: "v1_run",
        ok: false,
        skipped: true,
        detail: "Skipped: raw API key not available",
      });
    }

    if (jar.toHeader()) {
      const usageSummary = await requestJson("/api/usage/summary?days=7", { method: "GET" }, jar);
      const usageCalls = Number(
        usageSummary.json?.totals && typeof usageSummary.json.totals === "object"
          ? (usageSummary.json.totals as JsonRecord).calls || 0
          : 0
      );
      record({
        name: "usage_summary",
        ok: usageSummary.response.status === 200 && usageCalls >= 1,
        status: usageSummary.response.status,
        detail: `totals.calls=${usageCalls} body=${toDetail(usageSummary.bodyText)}`,
      });

      if (projectId) {
        const projectUsage = await requestJson(
          `/api/projects/${projectId}/usage/summary?days=7`,
          { method: "GET" },
          jar
        );
        const projectUsageCalls = Number(
          projectUsage.json?.totals && typeof projectUsage.json.totals === "object"
            ? (projectUsage.json.totals as JsonRecord).calls || 0
            : 0
        );
        record({
          name: "project_usage_summary",
          ok: projectUsage.response.status === 200 && projectUsageCalls >= 1,
          status: projectUsage.response.status,
          detail: `totals.calls=${projectUsageCalls} body=${toDetail(projectUsage.bodyText)}`,
        });
      } else {
        record({
          name: "project_usage_summary",
          ok: false,
          skipped: true,
          detail: "Skipped: project id unavailable",
        });
      }
    } else {
      record({
        name: "usage_summary",
        ok: false,
        skipped: true,
        detail: "Skipped: login failed, no session cookie",
      });
      record({
        name: "project_usage_summary",
        ok: false,
        skipped: true,
        detail: "Skipped: login failed, no session cookie",
      });
    }

    const usageUi = await requestJson("/app/usage");
    const usageUiOk = usageUi.response.status === 200 && usageUi.bodyText.includes('id="root"');
    record({
      name: "usage_ui",
      ok: usageUiOk,
      status: usageUi.response.status,
      detail: usageUiOk ? "contains Usage Analytics" : toDetail(usageUi.bodyText),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record({
      name: "unexpected_error",
      ok: false,
      detail: message,
    });
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nSummary: ${passed}/${results.length} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();
