import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { useEffect, useState } from "react";

interface LaunchSummary {
  readiness: {
    status: "PASS" | "WARN" | "FAIL";
    healthStatus: number;
  };
  totals: {
    users: number;
    activeUsers24h: number;
    requestVolume24h: number;
    errorCount24h: number;
    webhookFailures24h: number;
    billingEvents24h: number;
  };
  featured: {
    templates: number;
    agents: number;
    workflows: number;
    packs: number;
    apps: number;
  };
}

export default function AdminLaunch() {
  const [data, setData] = useState<LaunchSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean } & LaunchSummary>("/api/admin/launch", {
        headers: {
          // x-admin-key is expected to be injected via proxy or browser extension in real prod use.
        },
      });
      if (!res.ok) {
        throw new Error("Launch endpoint returned not ok");
      }
      setData(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load launch summary";
      showErrorToast("Launch dashboard error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell
      title="Launch Dashboard"
      subtitle="Soft launch readiness and live metrics"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin" },
        { label: "Launch" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Production Readiness</h2>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Readiness</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading ? "…" : data?.readiness.status ?? "N/A"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Health endpoint status: {isLoading ? "…" : data?.readiness.healthStatus ?? "N/A"}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Total Users</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading ? "…" : data?.totals.users.toLocaleString() ?? "0"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Active (24h):{" "}
              {isLoading ? "…" : data?.totals.activeUsers24h.toLocaleString() ?? "0"}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Requests (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading ? "…" : data?.totals.requestVolume24h.toLocaleString() ?? "0"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Errors (24h):{" "}
              {isLoading ? "…" : data?.totals.errorCount24h.toLocaleString() ?? "0"}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Webhooks (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading ? "…" : data?.totals.webhookFailures24h.toLocaleString() ?? "0"}
            </div>
            <div className="mt-1 text-xs text-gray-500">Failed deliveries</div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Billing (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading ? "…" : data?.totals.billingEvents24h.toLocaleString() ?? "0"}
            </div>
            <div className="mt-1 text-xs text-gray-500">Wallet / billing events</div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Featured Content</div>
            <div className="mt-1 text-sm text-gray-300 space-y-1">
              <div>
                Templates:{" "}
                {isLoading ? "…" : data?.featured.templates.toLocaleString() ?? "0"}
              </div>
              <div>
                Agents: {isLoading ? "…" : data?.featured.agents.toLocaleString() ?? "0"}
              </div>
              <div>
                Workflows:{" "}
                {isLoading ? "…" : data?.featured.workflows.toLocaleString() ?? "0"}
              </div>
              <div>
                Packs: {isLoading ? "…" : data?.featured.packs.toLocaleString() ?? "0"}
              </div>
              <div>
                Apps: {isLoading ? "…" : data?.featured.apps.toLocaleString() ?? "0"}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Note: This dashboard uses the same admin API key protection as other admin analytics
          routes. Ensure <code className="text-[#c0c0c0]">ADMIN_API_KEY</code> is configured and
          supplied via <code className="text-[#c0c0c0]">x-admin-key</code> when calling{" "}
          <code className="text-[#c0c0c0]">/api/admin/launch</code>.
        </p>
      </div>
    </AppShell>
  );
}

