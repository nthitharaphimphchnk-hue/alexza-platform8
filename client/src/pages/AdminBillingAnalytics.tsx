/**
 * Billing Analytics Dashboard - admin-only
 * Revenue, cost, margin from billing ledger
 */

import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Cpu,
  Users,
  FolderOpen,
  BarChart3,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BillingAnalyticsData {
  ok: boolean;
  summary: {
    totalCredits: number;
    totalCostUsd: number;
    totalRevenueUsd: number;
    totalMarginUsd: number;
    transactionCount: number;
  };
  byModel: { model: string; credits: number; cost: number; revenue: number; margin: number; count: number }[];
  byDay: { date: string; credits: number; cost: number; revenue: number; margin: number; count: number }[];
  topUsers: { userId: string; credits: number; cost: number; revenue: number; margin: number; count: number }[];
  topProjects: { projectId: string; credits: number; cost: number; revenue: number; margin: number; count: number }[];
  periodDays: number;
}

export default function AdminBillingAnalytics() {
  const [adminKey, setAdminKey] = useState("");
  const [data, setData] = useState<BillingAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const adminHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (adminKey.trim()) headers["x-admin-key"] = adminKey.trim();
    return headers;
  }, [adminKey]);

  const loadAnalytics = useCallback(async () => {
    if (!adminKey.trim()) {
      showErrorToast("Please enter Admin Key");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiRequest<BillingAnalyticsData>(`/api/admin/billing/analytics?days=${days}`, {
        headers: adminHeaders,
      });
      setData(res);
    } catch (error) {
      const msg =
        error instanceof ApiError && error.status === 403
          ? "Invalid or missing admin key"
          : error instanceof ApiError && error.status === 503
            ? "Admin API key not configured"
            : error instanceof Error
              ? error.message
              : "Failed to load billing analytics";
      setErrorMessage(msg);
      showErrorToast("Unable to load billing analytics", msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [adminKey, adminHeaders, days]);

  const dailyChartData = useMemo(() => {
    if (!data?.byDay) return [];
    return data.byDay.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));
  }, [data]);

  const metricCards = [
    { label: "Credits Charged", value: (data?.summary.totalCredits ?? 0).toLocaleString(), icon: CreditCard },
    { label: "Revenue (USD)", value: `$${(data?.summary.totalRevenueUsd ?? 0).toFixed(2)}`, icon: DollarSign },
    { label: "Cost (USD)", value: `$${(data?.summary.totalCostUsd ?? 0).toFixed(2)}`, icon: TrendingUp },
    { label: "Margin (USD)", value: `$${(data?.summary.totalMarginUsd ?? 0).toFixed(2)}`, icon: TrendingUp },
    { label: "Transactions", value: (data?.summary.transactionCount ?? 0).toLocaleString(), icon: BarChart3 },
  ];

  return (
    <AppShell
      title="Billing Analytics"
      subtitle="Revenue, cost, margin from billing ledger (admin only)"
      backHref="/app/admin/tools"
      backLabel="Back to Admin Tools"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin/tools" },
        { label: "Billing" },
      ]}
    >
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Admin Access</h2>
        <p className="text-sm text-gray-400 mb-4">
          Enter your x-admin-key to load billing analytics. Data comes from the billing ledger (usage-based charges).
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="x-admin-key"
            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white w-64"
          />
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button
            onClick={() => void loadAnalytics()}
            disabled={!adminKey.trim() || isLoading}
            className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Loading..." : "Load Billing"}
          </Button>
        </div>
        {errorMessage && <p className="mt-3 text-sm text-red-400">{errorMessage}</p>}
      </section>

      {!data && !isLoading && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/50 p-12 text-center text-gray-400">
          Enter admin key and click Load Billing to view revenue, cost, and margin analytics.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            {metricCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4"
                >
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Icon size={16} />
                    {card.label}
                  </div>
                  <div className="text-xl font-semibold text-white">{card.value}</div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Daily Revenue vs Cost</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b0e12", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v: number, name: string) => [`$${v.toFixed(4)}`, name === "revenue" ? "Revenue" : name === "cost" ? "Cost" : "Margin"]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} name="revenue" />
                    <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} name="cost" />
                    <Line type="monotone" dataKey="margin" stroke="#c0c0c0" strokeWidth={2} dot={false} name="margin" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Daily Credits Charged</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b0e12", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v: number) => [v.toLocaleString(), "Credits"]}
                    />
                    <Bar dataKey="credits" fill="#c0c0c0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Cpu size={16} />
                By Model
              </h3>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-[rgba(255,255,255,0.06)]">
                      <th className="text-left py-2">Model</th>
                      <th className="text-right py-2">Credits</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Cost</th>
                      <th className="text-right py-2">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byModel ?? []).map((m, i) => (
                      <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-2 text-gray-300 truncate max-w-[180px]" title={m.model}>{m.model}</td>
                        <td className="py-2 text-right text-gray-300">{m.credits.toLocaleString()}</td>
                        <td className="py-2 text-right text-green-400">${m.revenue.toFixed(4)}</td>
                        <td className="py-2 text-right text-red-400">${m.cost.toFixed(4)}</td>
                        <td className="py-2 text-right text-gray-300">${m.margin.toFixed(4)}</td>
                      </tr>
                    ))}
                    {(!data.byModel || data.byModel.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Users size={16} />
                Top Users (by credits)
              </h3>
              <ul className="space-y-2 max-h-80 overflow-auto">
                {(data.topUsers ?? []).map((u, i) => (
                  <li key={i} className="flex justify-between text-sm py-1 border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-gray-300 font-mono truncate max-w-[140px]" title={u.userId}>{u.userId.slice(0, 8)}...</span>
                    <span className="text-gray-400 shrink-0">{u.credits.toLocaleString()} cr · ${u.revenue.toFixed(2)}</span>
                  </li>
                ))}
                {(!data.topUsers || data.topUsers.length === 0) && (
                  <li className="text-gray-500 text-sm">No data</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FolderOpen size={16} />
              Top Projects (by credits)
            </h3>
            <ul className="space-y-2 max-h-60 overflow-auto">
              {(data.topProjects ?? []).map((p, i) => (
                <li key={i} className="flex justify-between text-sm py-1 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-gray-300 font-mono truncate max-w-[140px]" title={p.projectId}>{p.projectId.slice(0, 8)}...</span>
                  <span className="text-gray-400 shrink-0">{p.credits.toLocaleString()} cr · ${p.revenue.toFixed(2)}</span>
                </li>
              ))}
              {(!data.topProjects || data.topProjects.length === 0) && (
                <li className="text-gray-500 text-sm">No data</li>
              )}
            </ul>
          </div>
        </>
      )}
    </AppShell>
  );
}
