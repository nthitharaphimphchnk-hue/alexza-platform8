/**
 * ALEXZA AI JavaScript SDK
 * @packageDocumentation
 */

export interface RunOptions {
  /** Project ID (MongoDB ObjectId) */
  project: string;
  /** Action name */
  action: string;
  /** Input object matching the action's inputSchema */
  input: Record<string, unknown>;
}

export interface RunResponse {
  ok: true;
  requestId: string;
  output: string;
  creditsCharged?: number;
  usage?: {
    tokens?: number;
    creditsCharged?: number;
  };
  latencyMs?: number;
}

export interface AlexzaErrorData {
  code?: string;
  message: string;
  requestId?: string;
}

/**
 * Structured error thrown by the SDK.
 */
export class AlexzaError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, data?: AlexzaErrorData) {
    super(message);
    this.name = "AlexzaError";
    this.status = status;
    this.code = data?.code;
    this.requestId = data?.requestId;
    Object.setPrototypeOf(this, AlexzaError.prototype);
  }

  toJSON(): { name: string; message: string; status: number; code?: string; requestId?: string } {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      requestId: this.requestId,
    };
  }
}

export interface AlexzaOptions {
  /** API base URL (default: https://api.alexza.ai or ALEXZA_API_URL env) */
  baseUrl?: string;
}

export interface RegionInfo {
  id: string;
  name: string;
  apiBaseUrl: string;
  location?: string;
}

const DEFAULT_BASE_URL = "https://api.alexza.ai";

/**
 * Discover the lowest-latency region by probing each region's /health.
 * Use with Alexza options: new Alexza(key, { baseUrl: (await discoverBestRegion()).apiBaseUrl })
 * @param discoveryBaseUrl - Base URL to fetch regions list (default: https://api.alexza.ai)
 */
export async function discoverBestRegion(
  discoveryBaseUrl: string = DEFAULT_BASE_URL
): Promise<RegionInfo> {
  const base = String(discoveryBaseUrl).replace(/\/+$/, "");
  const res = await fetch(`${base}/api/public/regions`);
  if (!res.ok) {
    return { id: "us", name: "US East", apiBaseUrl: DEFAULT_BASE_URL };
  }
  const data = (await res.json()) as { ok?: boolean; regions?: RegionInfo[] };
  const regions = data?.regions ?? [];
  if (regions.length === 0) {
    return { id: "us", name: "US East", apiBaseUrl: DEFAULT_BASE_URL };
  }

  const results = await Promise.all(
    regions.map(async (r) => {
      const start = performance.now();
      try {
        const h = await fetch(`${r.apiBaseUrl.replace(/\/+$/, "")}/health`);
        const latency = performance.now() - start;
        return { region: r, latency: h.ok ? latency : Infinity };
      } catch {
        return { region: r, latency: Infinity };
      }
    })
  );

  const best = results.reduce((a, b) => (a.latency <= b.latency ? a : b));
  return best.region;
}

/**
 * ALEXZA AI client for running actions.
 */
export class Alexza {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /**
   * @param apiKey - API key (e.g. axza_live_...)
   * @param options - Optional configuration
   */
  constructor(apiKey: string, options?: AlexzaOptions) {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      throw new AlexzaError("API key is required", 0);
    }
    this.apiKey = apiKey.trim();
    const envUrl =
      typeof process !== "undefined" && typeof process.env?.ALEXZA_API_URL === "string"
        ? process.env.ALEXZA_API_URL
        : undefined;
    const base = options?.baseUrl ?? envUrl ?? DEFAULT_BASE_URL;
    this.baseUrl = String(base).replace(/\/+$/, "");
  }

  /**
   * Run an action.
   * @param options - Project ID, action name, and input
   * @returns Run response with output and usage
   */
  async run(options: RunOptions): Promise<RunResponse> {
    const { project, action, input } = options;
    if (!project || !action) {
      throw new AlexzaError("project and action are required", 0);
    }
    if (!input || typeof input !== "object") {
      throw new AlexzaError("input must be an object", 0);
    }

    const url = `${this.baseUrl}/v1/projects/${encodeURIComponent(project)}/run/${encodeURIComponent(action)}`;
    const body = { input };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new AlexzaError(
        `Request failed with status ${response.status}`,
        response.status
      );
    }

    if (!response.ok) {
      const err = (data as Record<string, unknown>)?.error;
      const message =
        typeof err === "object" && err !== null && typeof (err as Record<string, unknown>).message === "string"
          ? (err as Record<string, unknown>).message as string
          : typeof (data as Record<string, unknown>)?.message === "string"
            ? (data as Record<string, unknown>).message as string
            : typeof (data as Record<string, unknown>)?.error === "string"
              ? (data as Record<string, unknown>).error as string
              : `Request failed with status ${response.status}`;
      const code =
        typeof err === "object" && err !== null && typeof (err as Record<string, unknown>).code === "string"
          ? (err as Record<string, unknown>).code as string
          : undefined;
      const requestId =
        typeof (data as Record<string, unknown>)?.requestId === "string"
          ? (data as Record<string, unknown>).requestId as string
          : undefined;
      throw new AlexzaError(message, response.status, { code, message, requestId });
    }

    return data as RunResponse;
  }
}
