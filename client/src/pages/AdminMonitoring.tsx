import AppShell from "@/components/app/AppShell";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { useEffect, useState } from "react";

interface TimePoint {
  timestamp: string;
  count: number;
}

interface MetricsResponse {
  ok: boolean;
  activeUsers: number;
  requestsPerMinute: number;
  aiRunsPerMinute: number;
  errorsLastHour: number;
  slowRequests: number;
  webhookFailures: number;
  totalUsers: number;
  totalProjects: number;
  series: {
    requests: TimePoint[];
    aiRuns: TimePoint[];
    errors: TimePoint[];
  };
}

function MiniChart({ title, points }: { title: string; points: TimePoint[] }) {
  const max = points.reduce((m, p) => (p.count > m ? p.count : m), 0) || 1;
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
      <div className="text-xs text-gray-400 mb-2">{title}</div>
      <div className="flex items-end gap-1 h-24">
        {points.length === 0 ? (
          <div className="text-xs text-gray-500">No data</div>
        ) : (
          points.map((p) => (
            <div
              key={p.timestamp}
              className="flex-1 bg-cyan-500/60 rounded-sm"
              style={{ height: `${(p.count / max) * 100 || 2}%` }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminMonitoring() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiRequest<MetricsResponse>("/api/admin/metrics", {
        headers: {
          // x-admin-key should be provided via proxy/extension in prod.
        },
      });
      if (!res.ok) {
        throw new Error("Metrics endpoint returned not ok");
      }
      setData(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load metrics";
      showErrorToast("Admin monitoring error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <AppShell
      title="Production Monitoring"
      subtitle="Real-time metrics for the ALEXZA AI runtime"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin" },
        { label: "Monitoring" },
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Active Users (last 5 min)</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !data ? "…" : data.activeUsers.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Total users: {isLoading || !data ? "…" : data.totalUsers.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">API Requests / min</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !data ? "…" : data.requestsPerMinute.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Projects: {isLoading || !data ? "…" : data.totalProjects.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">AI Runs / min</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !data ? "…" : data.aiRunsPerMinute.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-gray-500">Last minute</div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Errors & Webhooks</div>
            <div className="mt-1 text-sm text-gray-300 space-y-1">
              <div>
                Errors (last hour):{" "}
                {isLoading || !data ? "…" : data.errorsLastHour.toLocaleString()}
              </div>
              <div>
                Slow requests (last 5 min):{" "}
                {isLoading || !data ? "…" : data.slowRequests.toLocaleString()}
              </div>
              <div>
                Webhook failures (last hour):{" "}
                {isLoading || !data ? "…" : data.webhookFailures.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MiniChart title="Requests over last hour" points={data?.series.requests ?? []} />
          <MiniChart title="AI runs over last hour" points={data?.series.aiRuns ?? []} />
          <MiniChart title="Errors over last hour" points={data?.series.errors ?? []} />
        </div>

        <p className="text-xs text-gray-500">
          This page auto-refreshes every 8 seconds. Access is restricted via{" "}
          <code className="text-[#c0c0c0]">ADMIN_API_KEY</code> and the{" "}
          <code className="text-[#c0c0c0]">x-admin-key</code> header on{" "}
          <code className="text-[#c0c0c0]">/api/admin/metrics</code>.
        </p>
      </div>
    </AppShell>
  );
}

