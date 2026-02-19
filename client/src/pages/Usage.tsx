import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Download, LineChart, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "7d" | "14d" | "30d" | "90d";
const TOKENS_PER_CREDIT = 1000;

interface UsageMetricRow {
  calls: number;
  errors: number;
  avgLatencyMs: number;
}

interface UsageSummaryResponse {
  ok: boolean;
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: UsageMetricRow & {
    errorRate: number;
  };
  totalsTokens: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  byDay: Array<
    UsageMetricRow & {
      date: string;
    }
  >;
  byDayTokens: Array<{
    date: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }>;
  byModel: Array<{
    model: string;
    calls: number;
    totalTokens: number;
    errors: number;
  }>;
  byProvider: Array<{
    provider: string;
    calls: number;
    totalTokens: number;
    errors: number;
  }>;
}

interface UsageChartPoint {
  date: string;
  label: string;
  calls: number;
  errors: number;
  avgLatencyMs: number;
}

interface TokenChartPoint {
  date: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function exportCsv(points: UsageChartPoint[], tokenPoints: TokenChartPoint[]) {
  const header = "date,calls,errors,avgLatencyMs,inputTokens,outputTokens,totalTokens\n";
  const tokenByDate = new Map(
    tokenPoints.map((row) => [row.date, { inputTokens: row.inputTokens, outputTokens: row.outputTokens, totalTokens: row.totalTokens }])
  );
  const body = points
    .map((row) => {
      const token = tokenByDate.get(row.date) ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      return `${row.date},${row.calls},${row.errors},${row.avgLatencyMs.toFixed(2)},${token.inputTokens},${token.outputTokens},${token.totalTokens}`;
    })
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "usage-analytics.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showSuccessToast("Usage CSV exported");
}

export default function Usage() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<UsageSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadUsage = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const response = await apiRequest<UsageSummaryResponse>(`/api/usage/summary?period=${period}`);
      setData(response);
      setHasLoadedOnce(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load usage analytics";
      setErrorMessage(message);
      showErrorToast("Unable to load usage analytics", message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce, period]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage, refreshNonce]);

  const chartData = useMemo<UsageChartPoint[]>(() => {
    if (!data) return [];
    return data.byDay.map((row) => {
      const dt = new Date(row.date);
      const label = Number.isNaN(dt.getTime())
        ? row.date
        : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        date: row.date,
        label,
        calls: row.calls,
        errors: row.errors,
        avgLatencyMs: row.avgLatencyMs,
      };
    });
  }, [data]);

  const tokenChartData = useMemo<TokenChartPoint[]>(() => {
    if (!data) return [];
    return data.byDayTokens.map((row) => {
      const dt = new Date(row.date);
      const label = Number.isNaN(dt.getTime())
        ? row.date
        : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        date: row.date,
        label,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        totalTokens: row.totalTokens,
      };
    });
  }, [data]);

  const totals = data?.totals;
  const totalsTokens = data?.totalsTokens;
  const estimatedCreditsSpent = totalsTokens ? Math.ceil(totalsTokens.totalTokens / TOKENS_PER_CREDIT) : 0;
  const avgTokensPerCall = totals && totals.calls > 0 && totalsTokens ? Math.round(totalsTokens.totalTokens / totals.calls) : 0;
  const isEmpty = Boolean(totals && totals.calls === 0);

  return (
    <AppShell
      title="Usage Analytics"
      subtitle="Track API usage, error rates and credits trends"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Usage" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRefreshNonce((prev) => prev + 1)}
            disabled={isLoading || isRefreshing}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
            <RefreshCw size={16} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => exportCsv(chartData, tokenChartData)}
            disabled={!chartData.length}
            className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8] disabled:opacity-50"
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["7d", "14d", "30d", "90d"] as Period[]).map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`ripple-btn rounded-lg px-3 py-1.5 text-sm ${
                period === item
                  ? "bg-[rgba(192,192,192,0.18)] text-white border border-[rgba(192,192,192,0.35)]"
                  : "bg-[#050607] text-gray-400 border border-[rgba(255,255,255,0.08)] hover:text-white"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
          {data && (
            <p className="ml-auto text-xs text-gray-500">
              {new Date(data.range.from).toLocaleDateString()} -{" "}
              {new Date(data.range.to).toLocaleDateString()}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-3">
            <div className="skeleton-shimmer h-[320px] rounded-lg border border-[rgba(255,255,255,0.08)]" />
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-sm text-red-200">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => setRefreshNonce((prev) => prev + 1)}
              className="mt-3 border-red-300/40 text-red-100 hover:bg-red-500/15"
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !errorMessage && (
          <div className="h-[320px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c0c0c0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c0c0c0" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#c0c0c0"
                  fill="url(#requestsGradient)"
                  strokeWidth={2}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Calls",
            value: totals ? totals.calls.toLocaleString() : "-",
            detail: "Across all endpoints",
          },
          {
            label: "Error Rate",
            value: totals ? `${totals.errorRate.toFixed(2)}%` : "-",
            detail: "4xx + 5xx responses",
          },
          {
            label: "Avg Latency",
            value: totals ? `${totals.avgLatencyMs.toFixed(2)} ms` : "-",
            detail: "Request-response time",
          },
          {
            label: "Errors",
            value: totals ? totals.errors.toLocaleString() : "-",
            detail: "Failed requests",
          },
          {
            label: "Total Tokens",
            value: totalsTokens ? totalsTokens.totalTokens.toLocaleString() : "-",
            detail: "Input + output tokens",
          },
          {
            label: "Avg Tokens / Call",
            value: totalsTokens ? avgTokensPerCall.toLocaleString() : "-",
            detail: "Token density per request",
          },
          {
            label: "Credits Spent (est.)",
            value: totalsTokens ? estimatedCreditsSpent.toLocaleString() : "-",
            detail: `${TOKENS_PER_CREDIT} tokens per credit`,
          },
        ].map((card, idx) => (
          <div key={idx} className="card-hover rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <LineChart size={14} />
              {card.label}
            </div>
            <p className="text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.detail}</p>
          </div>
        ))}
      </section>

      {!isLoading && !errorMessage && (
        <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Tokens by Day</h3>
          </div>
          <div className="h-[280px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenChartData}>
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
                <Bar dataKey="inputTokens" stackId="tokens" fill="rgba(192,192,192,0.65)" />
                <Bar dataKey="outputTokens" stackId="tokens" fill="rgba(192,192,192,0.35)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {!isLoading && !errorMessage && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Top Models</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)] text-left text-gray-500">
                    <th className="px-2 py-2">Model</th>
                    <th className="px-2 py-2">Calls</th>
                    <th className="px-2 py-2">Tokens</th>
                    <th className="px-2 py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byModel ?? []).map((row) => (
                    <tr key={`model-${row.model}`} className="border-b border-[rgba(255,255,255,0.05)] text-gray-200">
                      <td className="px-2 py-2">{row.model || "-"}</td>
                      <td className="px-2 py-2">{row.calls.toLocaleString()}</td>
                      <td className="px-2 py-2">{row.totalTokens.toLocaleString()}</td>
                      <td className="px-2 py-2">{row.errors.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(data?.byModel?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-4 text-center text-gray-500">
                        No model data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Top Providers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)] text-left text-gray-500">
                    <th className="px-2 py-2">Provider</th>
                    <th className="px-2 py-2">Calls</th>
                    <th className="px-2 py-2">Tokens</th>
                    <th className="px-2 py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byProvider ?? []).map((row) => (
                    <tr
                      key={`provider-${row.provider}`}
                      className="border-b border-[rgba(255,255,255,0.05)] text-gray-200"
                    >
                      <td className="px-2 py-2">{row.provider || "-"}</td>
                      <td className="px-2 py-2">{row.calls.toLocaleString()}</td>
                      <td className="px-2 py-2">{row.totalTokens.toLocaleString()}</td>
                      <td className="px-2 py-2">{row.errors.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(data?.byProvider?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-4 text-center text-gray-500">
                        No provider data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {!isLoading && !errorMessage && isEmpty && (
        <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 text-center">
          <p className="text-gray-300">No usage yet - run Playground to generate logs</p>
          <Button
            onClick={() => setLocation("/app/playground")}
            className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
          >
            Open Playground
          </Button>
        </section>
      )}
    </AppShell>
  );
}
