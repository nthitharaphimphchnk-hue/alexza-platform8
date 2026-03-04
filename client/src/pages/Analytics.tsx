import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { BarChart3, LineChart, RefreshCw, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsOverview {
  totalCreditsUsed: number;
  totalApiCalls: number;
  totalTokensUsed: number;
  totalActionsRun: number;
}

interface ProjectUsage {
  projectId: string;
  projectName: string;
  totalApiCalls: number;
  totalTokensUsed: number;
}

interface ActionUsage {
  projectId: string;
  projectName: string;
  actionName: string;
  totalRuns: number;
}

interface DailyUsage {
  date: string;
  totalApiCalls: number;
  totalTokensUsed: number;
  totalActionsRun: number;
}

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [projects, setProjects] = useState<ProjectUsage[]>([]);
  const [actions, setActions] = useState<ActionUsage[]>([]);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadAnalytics = useCallback(async () => {
    if (refreshNonce === 0) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const [overviewRes, projectsRes, actionsRes, dailyRes] = await Promise.all([
        apiRequest<{ ok: boolean } & AnalyticsOverview>("/api/analytics/overview"),
        apiRequest<{ ok: boolean; projects: ProjectUsage[] }>("/api/analytics/projects"),
        apiRequest<{ ok: boolean; actions: ActionUsage[] }>("/api/analytics/actions"),
        apiRequest<{ ok: boolean; daily: DailyUsage[] }>("/api/analytics/daily"),
      ]);

      setOverview({
        totalCreditsUsed: overviewRes.totalCreditsUsed,
        totalApiCalls: overviewRes.totalApiCalls,
        totalTokensUsed: overviewRes.totalTokensUsed,
        totalActionsRun: overviewRes.totalActionsRun,
      });
      setProjects(projectsRes.projects ?? []);
      setActions(actionsRes.actions ?? []);
      setDaily(dailyRes.daily ?? []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load analytics";
      setErrorMessage(message);
      showErrorToast("Unable to load analytics", message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshNonce]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const dailyChartData = useMemo(() => {
    return daily.map((row) => {
      const dt = new Date(row.date);
      const label = Number.isNaN(dt.getTime())
        ? row.date
        : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        date: row.date,
        label,
        apiCalls: row.totalApiCalls,
        tokens: row.totalTokensUsed,
        actions: row.totalActionsRun,
      };
    });
  }, [daily]);

  const topProjectsData = useMemo(() => {
    return projects.slice(0, 10).map((p) => ({
      name: p.projectName || p.projectId || "Unknown",
      calls: p.totalApiCalls,
      tokens: p.totalTokensUsed,
    }));
  }, [projects]);

  const topActionsData = useMemo(() => {
    return actions.slice(0, 10).map((a) => ({
      name: a.actionName ? `${a.actionName} (${a.projectName})` : "Unknown",
      runs: a.totalRuns,
    }));
  }, [actions]);

  const isEmpty = overview && overview.totalApiCalls === 0 && overview.totalActionsRun === 0;

  return (
    <AppShell
      title="Analytics"
      subtitle="Insights into your AI usage over the last 30 days"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Analytics" },
      ]}
      actions={
        <Button
          variant="outline"
          onClick={() => setRefreshNonce((prev) => prev + 1)}
          disabled={isLoading || isRefreshing}
          className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
        >
          <RefreshCw size={16} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {isLoading && (
        <div className="space-y-4">
          <div className="skeleton-shimmer grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-[rgba(255,255,255,0.08)]" />
            ))}
          </div>
          <div className="skeleton-shimmer h-[320px] rounded-xl border border-[rgba(255,255,255,0.08)]" />
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
          <p className="text-sm text-gray-200">{errorMessage}</p>
          <Button
            variant="outline"
            onClick={() => setRefreshNonce((prev) => prev + 1)}
            className="mt-3 border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]"
          >
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !errorMessage && (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Credits Used",
                value: overview?.totalCreditsUsed?.toLocaleString() ?? "-",
                detail: "Last 30 days",
                icon: Zap,
              },
              {
                label: "API Calls",
                value: overview?.totalApiCalls?.toLocaleString() ?? "-",
                detail: "Total requests",
                icon: BarChart3,
              },
              {
                label: "Tokens Used",
                value: overview?.totalTokensUsed?.toLocaleString() ?? "-",
                detail: "Input + output",
                icon: LineChart,
              },
              {
                label: "Actions Run",
                value: overview?.totalActionsRun?.toLocaleString() ?? "-",
                detail: "Spec-based runs",
                icon: BarChart3,
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="card-hover rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                    <Icon size={14} />
                    {card.label}
                  </div>
                  <p className="text-2xl font-semibold text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{card.detail}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Daily Usage (Last 30 Days)</h3>
            <div className="h-[320px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={dailyChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" />
                  <YAxis stroke="rgba(255,255,255,0.45)" />
                  <Tooltip
                    contentStyle={{
                      background: "#0b0e12",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="apiCalls"
                    stroke="#c0c0c0"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="API Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="actions"
                    stroke="rgba(192,192,192,0.6)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Actions"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">Top Projects by API Calls</h3>
              <div className="h-[280px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProjectsData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.45)" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="rgba(255,255,255,0.45)"
                      width={70}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b0e12",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="calls" fill="rgba(192,192,192,0.65)" name="API Calls" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">Top Actions by Runs</h3>
              <div className="h-[280px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topActionsData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.45)" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="rgba(255,255,255,0.45)"
                      width={90}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b0e12",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="runs" fill="rgba(192,192,192,0.5)" name="Runs" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {isEmpty && (
            <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 text-center">
              <p className="text-gray-300">No usage yet - run actions in Playground to see analytics</p>
              <Button
                onClick={() => setLocation("/app/playground")}
                className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
              >
                Open Playground
              </Button>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
