import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/api";

type HealthStatus = "ok" | "degraded";

interface HealthResponse {
  ok?: boolean;
  status?: string;
}

/** Returns "ok" if the endpoint indicates healthy, "degraded" otherwise. */
async function fetchHealth(path: string): Promise<HealthStatus> {
  try {
    const res = await apiRequest<HealthResponse>(path, { method: "GET" });
    const healthy =
      res.ok === true ||
      res.status === "ok" ||
      res.status === "healthy" ||
      res.status === "operational";
    return healthy ? "ok" : "degraded";
  } catch {
    return "degraded";
  }
}

const HEALTH_ENDPOINTS = [
  "/api/health",
  "/api/health/db",
  "/api/health/openai",
  "/api/health/stripe",
  "/api/health/webhooks",
] as const;

const REFRESH_INTERVAL_MS = 30_000;
const DEGRADED_MESSAGE =
  "Some services are currently degraded. AI runs may be slower.";

export default function SystemHealthBanner() {
  const [isDegraded, setIsDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const results = await Promise.all(
        HEALTH_ENDPOINTS.map((path) => fetchHealth(path))
      );

      if (cancelled) return;

      const anyDegraded = results.some((r) => r !== "ok");
      setIsDegraded(anyDegraded);
    };

    void check();
    const id = window.setInterval(check, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!isDegraded) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
        <AlertTriangle size={16} className="text-amber-400" />
      </div>
      <span className="flex-1">{DEGRADED_MESSAGE}</span>
    </div>
  );
}

