import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/api";

type HealthStatus = "ok" | "degraded" | "down";

interface HealthResponse {
  ok?: boolean;
  status?: string;
}

async function fetchHealth(path: string): Promise<HealthStatus> {
  try {
    const res = await apiRequest<HealthResponse>(path, { method: "GET" });
    if (res.ok === true || res.status === "ok" || res.status === "healthy") {
      return "ok";
    }
    return "degraded";
  } catch {
    return "degraded";
  }
}

export default function SystemHealthBanner() {
  const [status, setStatus] = useState<HealthStatus>("ok");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const results = await Promise.all([
        fetchHealth("/api/health"),
        fetchHealth("/api/health/db"),
        fetchHealth("/api/health/openai"),
        fetchHealth("/api/health/stripe"),
        fetchHealth("/api/health/webhooks"),
      ]);

      if (cancelled) return;

      const anyDegraded = results.some((r) => r !== "ok");
      if (!anyDegraded) {
        setStatus("ok");
        setMessage(null);
        return;
      }

      setStatus("degraded");
      setMessage("Some services are currently degraded. AI runs may be slower.");
    };

    void check();
    const id = window.setInterval(() => {
      void check();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (status === "ok" || !message) return null;

  return (
    <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100 flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/20">
        <AlertTriangle size={16} />
      </div>
      <div className="flex-1">{message}</div>
    </div>
  );
}

