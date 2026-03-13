import AppShell from "@/components/app/AppShell";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { useEffect, useState } from "react";

type WindowOption = "24h" | "7d" | "30d";

interface TimePoint {
  timestamp: string;
  count: number;
}

interface SoftLaunchMetricsResponse {
  ok: boolean;
  window: WindowOption;
  metrics: {
    newSignups: number;
    newSignups7d: number;
    newWorkspaces: number;
    newProjects: number;
    firstSuccessfulRuns: number;
    totalApiRuns: number;
    feedbackCount: number;
    criticalFeedbackCount: number;
    webhookFailures: number;
    errorCount: number;
  };
  series: {
    signups: TimePoint[];
    runs: TimePoint[];
    feedback: TimePoint[];
  };
}

function MiniBarChart({ title, points }: { title: string; points: TimePoint[] }) {
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

export default function AdminSoftLaunch() {
  const [windowOption, setWindowOption] = useState<WindowOption>("24h");
  const [data, setData] = useState<SoftLaunchMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async (win: WindowOption) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<SoftLaunchMetricsResponse>(
        `/api/admin/soft-launch-metrics?window=${win}`,
        {
          headers: {
            // x-admin-key should be provided via proxy/extension in production.
          },
        }
      );
      if (!res.ok) {
        throw new Error("Soft launch metrics endpoint returned not ok");
      }
      setData(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load soft launch metrics";
      showErrorToast("Soft launch metrics error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(windowOption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = data?.metrics;

  return (
    <AppShell
      title="Soft Launch Metrics"
      subtitle="Focused view of early signups, usage, and feedback during soft launch"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin" },
        { label: "Soft Launch" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            Window:{" "}
            <span className="font-semibold text-gray-200">
              {data?.window === "7d" ? "Last 7 days" : data?.window === "30d" ? "Last 30 days" : "Last 24 hours"}
            </span>
          </div>
          <div className="flex gap-2 text-xs">
            {(["24h", "7d", "30d"] as WindowOption[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setWindowOption(opt);
                  void load(opt);
                }}
                className={`rounded-full px-3 py-1 border text-xs ${
                  windowOption === opt
                    ? "border-[rgba(255,255,255,0.6)] bg-white/10 text-white"
                    : "border-[rgba(255,255,255,0.18)] bg-black/40 text-gray-300 hover:bg-white/5"
                }`}
              >
                {opt === "24h" ? "24h" : opt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">New signups</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !metrics ? "…" : metrics.newSignups.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Last 7 days:{" "}
              {isLoading || !metrics ? "…" : metrics.newSignups7d.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">New workspaces</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !metrics ? "…" : metrics.newWorkspaces.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-gray-500">New projects: {isLoading || !metrics ? "…" : metrics.newProjects.toLocaleString()}</div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">First successful AI runs</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !metrics ? "…" : metrics.firstSuccessfulRuns.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Total API runs:{" "}
              {isLoading || !metrics ? "…" : metrics.totalApiRuns.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Feedback & Reliability</div>
            <div className="mt-1 text-sm text-gray-300 space-y-1">
              <div>
                Feedback: {isLoading || !metrics ? "…" : metrics.feedbackCount.toLocaleString()}
              </div>
              <div>
                Critical:{" "}
                {isLoading || !metrics
                  ? "…"
                  : metrics.criticalFeedbackCount.toLocaleString()}
              </div>
              <div>
                Webhook failures:{" "}
                {isLoading || !metrics ? "…" : metrics.webhookFailures.toLocaleString()}
              </div>
              <div>
                Errors: {isLoading || !metrics ? "…" : metrics.errorCount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MiniBarChart title="Signups over time" points={data?.series.signups ?? []} />
          <MiniBarChart title="API runs over time" points={data?.series.runs ?? []} />
          <MiniBarChart title="Feedback over time" points={data?.series.feedback ?? []} />
        </div>
      </div>
    </AppShell>
  );
}

