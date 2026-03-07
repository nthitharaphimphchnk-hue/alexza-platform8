/**
 * Platform Analytics Dashboard - admin-only
 * Requires x-admin-key for API access
 */

import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import {
  BarChart3,
  Users,
  Activity,
  Zap,
  DollarSign,
  LayoutTemplate,
  Bot,
  Package,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
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

interface AdminAnalyticsData {
  ok: boolean;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    apiRequests: number;
    tokenUsage: number;
    revenue: number;
  };
  topTemplates: { name: string; downloads: number }[];
  topAgents: { name: string }[];
  topApps: { name: string; downloads: number }[];
  charts: {
    dailyRequests: { date: string; count: number }[];
    dailyTokens: { date: string; tokens: number }[];
    dailyNewUsers: { date: string; count: number }[];
  };
  periodDays: number;
}

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const [adminKey, setAdminKey] = useState("");
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
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
      const res = await apiRequest<AdminAnalyticsData>(`/api/admin/analytics?days=${days}`, {
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
              : "Failed to load analytics";
      setErrorMessage(msg);
      showErrorToast("Unable to load analytics", msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [adminKey, adminHeaders, days]);

  const requestsChartData = useMemo(() => {
    if (!data?.charts.dailyRequests) return [];
    return data.charts.dailyRequests.map((r) => ({
      ...r,
      label: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));
  }, [data]);

  const tokensChartData = useMemo(() => {
    if (!data?.charts.dailyTokens) return [];
    return data.charts.dailyTokens.map((t) => ({
      ...t,
      label: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));
  }, [data]);

  const usersChartData = useMemo(() => {
    if (!data?.charts.dailyNewUsers) return [];
    return data.charts.dailyNewUsers.map((u) => ({
      ...u,
      label: new Date(u.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));
  }, [data]);

  const metricCards = [
    { label: "Total Users", value: data?.metrics.totalUsers ?? 0, icon: Users },
    { label: "Active Users", value: data?.metrics.activeUsers ?? 0, icon: Activity },
    { label: "API Requests", value: data?.metrics.apiRequests ?? 0, icon: Zap },
    { label: "Token Usage", value: (data?.metrics.tokenUsage ?? 0).toLocaleString(), icon: BarChart3 },
    { label: "Revenue (USD)", value: `$${(data?.metrics.revenue ?? 0).toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <AppShell
      title="Platform Analytics"
      subtitle="Internal usage and growth metrics (admin only)"
      backHref="/app/admin/tools"
      backLabel="Back to Admin Tools"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin/tools" },
        { label: "Analytics" },
      ]}
    >
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Admin Access</h2>
        <p className="text-sm text-gray-400 mb-4">
          Enter your x-admin-key to load platform analytics. Data is aggregated from usage logs, audit logs, and wallet transactions.
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
            {isLoading ? "Loading..." : "Load Analytics"}
          </Button>
        </div>
        {errorMessage && (
          <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
        )}
      </section>

      {!data && !isLoading && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/50 p-12 text-center text-gray-400">
          Enter admin key and click Load Analytics to view platform metrics.
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
                  <div className="text-xl font-semibold text-white">
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Daily API Requests</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestsChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b0e12", border: "1px solid rgba(255,255,255,0.1)" }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    <Bar dataKey="count" fill="#c0c0c0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Daily Token Usage</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tokensChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b0e12", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v: number) => [v.toLocaleString(), "Tokens"]}
                    />
                    <Line type="monotone" dataKey="tokens" stroke="#c0c0c0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">New Users (daily signups)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usersChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0b0e12", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <Bar dataKey="count" fill="rgba(192,192,192,0.6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <LayoutTemplate size={16} />
                Top Templates (Marketplace)
              </h3>
              <ul className="space-y-2">
                {(data.topTemplates ?? []).slice(0, 5).map((t, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300 truncate">{t.name || "—"}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{t.downloads ?? 0}</span>
                  </li>
                ))}
                {(!data.topTemplates || data.topTemplates.length === 0) && (
                  <li className="text-gray-500 text-sm">No data</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Bot size={16} />
                Top Agents (recent)
              </h3>
              <ul className="space-y-2">
                {(data.topAgents ?? []).slice(0, 5).map((a, i) => (
                  <li key={i} className="text-sm text-gray-300 truncate">
                    {a.name || "—"}
                  </li>
                ))}
                {(!data.topAgents || data.topAgents.length === 0) && (
                  <li className="text-gray-500 text-sm">No data</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Package size={16} />
                Top Apps (App Store)
              </h3>
              <ul className="space-y-2">
                {(data.topApps ?? []).slice(0, 5).map((a, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300 truncate">{a.name || "—"}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{a.downloads ?? 0}</span>
                  </li>
                ))}
                {(!data.topApps || data.topApps.length === 0) && (
                  <li className="text-gray-500 text-sm">No data</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
