/**
 * Status service - aggregates health, tracks uptime, runs 60s monitor.
 */

import { logger } from "./utils/logger";

export type ComponentStatus = "operational" | "degraded" | "down";

export interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  latency?: number;
  message?: string;
}

export interface StatusResponse {
  ok: boolean;
  components: ComponentHealth[];
  uptime24h: number; // 0-100 percentage
  timestamp: string;
}

const CHECK_INTERVAL_MS = 60_000;
const UPTIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const UPTIME_SLOTS = 24 * 60; // 1 slot per minute

/** Store last N minutes: true = operational, false = down/degraded */
const uptimeSlots: boolean[] = new Array(UPTIME_SLOTS).fill(true);
let uptimeSlotIndex = 0;
let lastSlotTime = Date.now();

function getBaseUrl(): string {
  const port = process.env.PORT || "3005";
  return `http://localhost:${port}`;
}

async function checkHealth(path: string): Promise<{ status: number; latency: number; json?: unknown }> {
  const start = performance.now();
  try {
    const res = await fetch(`${getBaseUrl()}${path}`);
    const latency = Math.round(performance.now() - start);
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, latency, json };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    logger.warn({ err, path }, "[Status] Health check failed");
    return { status: 500, latency, json: null };
  }
}

function isOperational(status: number, json?: unknown): boolean {
  if (status !== 200) return false;
  const s = (json as { status?: string })?.status;
  return s === "operational";
}

function isDegraded(status: number, json?: unknown): boolean {
  if (status !== 200) return false;
  const s = (json as { status?: string })?.status;
  return s === "degraded";
}

function recordUptimeSlot(overallOk: boolean): void {
  const now = Date.now();
  const elapsed = now - lastSlotTime;
  const slotsToAdvance = Math.min(Math.floor(elapsed / 60_000), UPTIME_SLOTS);
  for (let i = 0; i < slotsToAdvance; i++) {
    uptimeSlotIndex = (uptimeSlotIndex + 1) % UPTIME_SLOTS;
    uptimeSlots[uptimeSlotIndex] = overallOk;
  }
  lastSlotTime = now;
}

export function getUptime24h(): number {
  const valid = uptimeSlots.filter((v) => v !== undefined);
  if (valid.length === 0) return 100;
  const ok = valid.filter(Boolean).length;
  return Math.round((ok / valid.length) * 100);
}

export async function runHealthCheck(): Promise<ComponentHealth[]> {
  const [api, db, stripe, webhooks] = await Promise.all([
    checkHealth("/health"),
    checkHealth("/health/db"),
    checkHealth("/health/stripe"),
    checkHealth("/health/webhooks"),
  ]);

  const components: ComponentHealth[] = [
    {
      name: "API",
      status: isOperational(api.status, api.json) ? "operational" : isDegraded(api.status, api.json) ? "degraded" : "down",
      latency: api.latency,
    },
    {
      name: "Database",
      status: isOperational(db.status, db.json) ? "operational" : isDegraded(db.status, db.json) ? "degraded" : "down",
      latency: db.latency,
    },
    {
      name: "Stripe",
      status: isOperational(stripe.status, stripe.json) ? "operational" : isDegraded(stripe.status, stripe.json) ? "degraded" : "down",
      latency: stripe.latency,
    },
    {
      name: "Webhooks",
      status: isOperational(webhooks.status, webhooks.json) ? "operational" : isDegraded(webhooks.status, webhooks.json) ? "degraded" : "down",
      latency: webhooks.latency,
    },
    {
      name: "Workers",
      status: "operational", // API serves as workers in this architecture
    },
  ];

  const overallOk = components.every((c) => c.status === "operational");
  recordUptimeSlot(overallOk);

  return components;
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startStatusMonitor(): void {
  if (monitorInterval) return;
  monitorInterval = setInterval(async () => {
    try {
      await runHealthCheck();
    } catch (err) {
      logger.warn({ err }, "[Status] Monitor check failed");
      recordUptimeSlot(false);
    }
  }, CHECK_INTERVAL_MS);
  logger.info({ intervalMs: CHECK_INTERVAL_MS }, "[Status] Monitor started");
}

export function stopStatusMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info("[Status] Monitor stopped");
  }
}
