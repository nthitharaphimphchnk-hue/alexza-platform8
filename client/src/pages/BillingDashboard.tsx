import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import {
  BarChart3,
  KeyRound,
  Layers,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailyUsageItem {
  date: string;
  credits: number;
}

interface UsageByProject {
  projectId: string;
  projectName: string;
  credits: number;
}

interface UsageByApiKey {
  apiKeyId: string;
  keyPrefix: string;
  credits: number;
}

interface UsageByAction {
  actionName: string;
  credits: number;
}

interface BillingUsageResponse {
  ok: boolean;
  totalCreditsUsed: number;
  creditsRemaining: number;
  dailyUsage: DailyUsageItem[];
  usageByProject: UsageByProject[];
  usageByApiKey: UsageByApiKey[];
  usageByAction: UsageByAction[];
  range?: { days: number; from: string; to: string };
}

const TIME_RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const CHART_COLORS = [
  "rgba(192,192,192,0.7)",
  "rgba(160,160,160,0.7)",
  "rgba(128,128,128,0.7)",
  "rgba(96,96,96,0.7)",
  "rgba(64,64,64,0.7)",
];

export default function BillingDashboard() {
  const [, setLocation] = useLocation();
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<BillingUsageResponse>(
        `/api/billing/usage?days=${days}`
      );
      setUsage(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load usage";
      showErrorToast("Unable to load billing usage", message);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const dailyChartData = useMemo(() => {
    if (!usage?.dailyUsage?.length) return [];
    return usage.dailyUsage.map((row) => {
      const dt = new Date(row.date);
      const label = Number.isNaN(dt.getTime())
        ? row.date
        : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return {
        date: row.date,
        label,
        credits: row.credits,
      };
    });
  }, [usage?.dailyUsage]);

  const projectChartData = useMemo(() => {
    if (!usage?.usageByProject?.length) return [];
    return usage.usageByProject.slice(0, 10).map((p) => ({
      name: p.projectName || p.projectId || "Unknown",
      value: p.credits,
    }));
  }, [usage?.usageByProject]);

  const apiKeyChartData = useMemo(() => {
    if (!usage?.usageByApiKey?.length) return [];
    return usage.usageByApiKey.slice(0, 10).map((k) => ({
      name: `${k.keyPrefix}...`,
      value: k.credits,
    }));
  }, [usage?.usageByApiKey]);

  const actionChartData = useMemo(() => {
    if (!usage?.usageByAction?.length) return [];
    return usage.usageByAction.slice(0, 10).map((a) => ({
      name: a.actionName || "unknown",
      value: a.credits,
    }));
  }, [usage?.usageByAction]);

  return (
    <AppShell
      title="Billing Dashboard"
      subtitle="Credit usage and costs across your workspace"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Billing" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/app/billing/credits")}
          className="border-[rgba(255,255,255,0.08)] text-gray-300"
        >
          <Zap size={14} className="mr-2" />
          Add Credits
        </Button>
      }
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
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-xl border border-[rgba(255,255,255,0.06)]" />
            ))}
          </div>
        )}

        {!isLoading && usage && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <BarChart3 size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Credits Used</p>
                    <p className="text-2xl font-semibold text-white">
                      {usage.totalCreditsUsed.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <Zap size={20} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Credits Remaining</p>
                    <p className="text-2xl font-semibold text-white">
                      {usage.creditsRemaining.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Daily Usage</h3>
              {dailyChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                        formatter={(value: number) => [value.toLocaleString(), "Credits"]}
                      />
                      <Bar
                        dataKey="credits"
                        fill="rgba(192,192,192,0.5)"
                        radius={[4, 4, 0, 0]}
                        name="Credits"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No usage data in this period</p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Layers size={18} />
                  Usage by Project
                </h3>
                {projectChartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                        >
                          {projectChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0b0e12",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [value.toLocaleString(), "Credits"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No project usage</p>
                )}
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <KeyRound size={18} />
                  Usage by API Key
                </h3>
                {apiKeyChartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={apiKeyChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                        >
                          {apiKeyChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0b0e12",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [value.toLocaleString(), "Credits"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No API key usage</p>
                )}
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={18} />
                  Usage by Action
                </h3>
                {actionChartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={actionChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                        >
                          {actionChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0b0e12",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [value.toLocaleString(), "Credits"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No action usage</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Usage Tables</h3>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500 mb-2">By Project</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {usage.usageByProject.slice(0, 5).map((p) => (
                      <div key={p.projectId} className="flex justify-between text-sm">
                        <span className="text-gray-300 truncate max-w-[120px]">{p.projectName}</span>
                        <span className="text-white font-medium">{p.credits}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">By API Key</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {usage.usageByApiKey.slice(0, 5).map((k) => (
                      <div key={k.apiKeyId} className="flex justify-between text-sm">
                        <span className="text-gray-300 truncate max-w-[120px]">{k.keyPrefix}...</span>
                        <span className="text-white font-medium">{k.credits}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">By Action</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {usage.usageByAction.slice(0, 5).map((a) => (
                      <div key={a.actionName} className="flex justify-between text-sm">
                        <span className="text-gray-300 truncate max-w-[120px]">{a.actionName}</span>
                        <span className="text-white font-medium">{a.credits}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
