import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { BarChart3, CheckCircle2, XCircle, Zap, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailyUsageItem {
  date: string;
  requests: number;
  credits: number;
}

interface ApiKeyUsageResponse {
  ok: boolean;
  totalRequests: number;
  creditsUsed: number;
  success: number;
  failed: number;
  dailyUsage: DailyUsageItem[];
  range?: { days: number; from: string; to: string };
  key?: { name: string; prefix: string; projectId: string };
}

const TIME_RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export default function ApiKeyUsage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const keyId = params?.id ?? "";
  const [usage, setUsage] = useState<ApiKeyUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const keyInfo = usage?.key ?? null;

  const loadUsage = useCallback(async () => {
    if (!keyId) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<ApiKeyUsageResponse>(
        `/api/api-keys/${keyId}/usage?days=${days}`
      );
      setUsage(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setLocation("/app/projects");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load usage";
      showErrorToast("Unable to load usage", message);
    } finally {
      setIsLoading(false);
    }
  }, [keyId, days, setLocation]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const chartData = useMemo(() => {
    if (!usage?.dailyUsage?.length) return [];
    return usage.dailyUsage.map((row) => {
      const dt = new Date(row.date);
      const label = Number.isNaN(dt.getTime())
        ? row.date
        : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        date: row.date,
        label,
        requests: row.requests,
        credits: row.credits,
      };
    });
  }, [usage?.dailyUsage]);

  const breadcrumbs = useMemo(() => {
    const items: Array<{ label: string; href?: string }> = [
      { label: "Dashboard", href: "/app/dashboard" },
      { label: "Projects", href: "/app/projects" },
    ];
    if (keyInfo?.projectId) {
      items.push({ label: "Project", href: `/app/projects/${keyInfo.projectId}` });
      items.push({ label: "API Keys", href: `/app/projects/${keyInfo.projectId}/keys` });
    }
    items.push({ label: keyInfo?.name || "Usage" });
    return items;
  }, [keyInfo]);

  const backHref = keyInfo?.projectId ? `/app/projects/${keyInfo.projectId}/keys` : "/app/projects";

  return (
    <AppShell
      title="API Key Usage"
      subtitle={keyInfo ? `${keyInfo.prefix || "axza_"}...` : "Usage analytics"}
      backHref={backHref}
      backLabel="Back to API Keys"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {TIME_RANGES.map((r) => (
              <Button
                key={r.days}
                variant={days === r.days ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(r.days)}
                className={
                  days === r.days
                    ? "bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                    : "border-[rgba(255,255,255,0.08)] text-gray-300"
                }
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadUsage()}
            disabled={isLoading}
            className="border-[rgba(255,255,255,0.08)] text-gray-300"
          >
            <RefreshCw size={14} className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-xl border border-[rgba(255,255,255,0.06)]" />
            ))}
          </div>
        )}

        {!isLoading && usage && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#c0c0c0]/10 p-3">
                    <BarChart3 size={20} className="text-[#c0c0c0]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Requests</p>
                    <p className="text-2xl font-semibold text-white">
                      {usage.totalRequests.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#c0c0c0]/10 p-3">
                    <Zap size={20} className="text-[#c0c0c0]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Credits Used</p>
                    <p className="text-2xl font-semibold text-white">
                      {usage.creditsUsed.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <CheckCircle2 size={20} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Success</p>
                    <p className="text-2xl font-semibold text-white">
                      {usage.success.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <XCircle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-2xl font-semibold text-white">
                      {usage.failed.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Daily Usage</h3>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="label"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={12}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0b0e12",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#c0c0c0" }}
                        formatter={(value: number) => [value.toLocaleString(), ""]}
                        labelFormatter={(label, payload) => {
                          const p = payload[0]?.payload;
                          return p
                            ? `${p.date}: ${p.requests} requests, ${p.credits} credits`
                            : label;
                        }}
                      />
                      <Bar
                        dataKey="requests"
                        fill="rgba(192,192,192,0.5)"
                        radius={[4, 4, 0, 0]}
                        name="Requests"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No usage data in this period</p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
