import { useTranslation } from "react-i18next";
import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import ApiKeysWidget from "@/components/dashboard/ApiKeysWidget";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import StatusWidget from "@/components/dashboard/StatusWidget";
import UsageAnalyticsWidget from "@/components/dashboard/UsageAnalyticsWidget";
import { Button } from "@/components/ui/button";
import { getCreditsBalance } from "@/lib/alexzaApi";
import { Activity, Gauge, Plus, Server, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const activityFeed = [
  { id: "a1", title: "API call completed", detail: "Customer Support Bot • 208ms", tone: "ok" },
  { id: "a2", title: "New key created", detail: "Project: Document AI", tone: "info" },
  { id: "a3", title: "Credits deducted", detail: "2,500 ALEXZA Credits • Managed Runtime", tone: "warning" },
  { id: "a4", title: "Gateway warning", detail: "Latency spike on us-east", tone: "danger" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const bal = await getCreditsBalance();
        if (!cancelled) setCredits(bal);
      } catch {
        if (!cancelled) setCredits(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <AppShell
      title={t("dashboard.title")}
      subtitle={t("dashboard.subtitle")}
      backHref="/app/projects"
      backLabel={t("navigation.backToProjects")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: t("dashboard.overview") },
      ]}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/app/projects")} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
            <Plus size={16} className="mr-2" />
            {t("navigation.newProject")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/app/usage")}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
            {t("navigation.openUsage")}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`dashboard-skeleton-${idx}`} className="skeleton-shimmer h-32 rounded-xl border border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      ) : (
        <>
        <OnboardingChecklist />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t("dashboard.apiLatency"), value: "172ms", icon: Gauge, state: t("dashboard.healthy") },
            { label: t("dashboard.gatewayHealth"), value: "99.98%", icon: Server, state: t("dashboard.operational") },
            { label: t("dashboard.modelCluster"), value: "12/12", icon: Activity, state: t("dashboard.online") },
            { label: t("dashboard.creditsRemaining"), value: credits !== null ? <AnimatedCounter value={credits} /> : "—", icon: TriangleAlert, state: t("dashboard.budgetSafe") },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-5 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-gray-400">{item.label}</p>
                  <Icon size={16} className="text-[#c0c0c0]" />
                </div>
                <p className="text-3xl font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-xs text-gray-500">{item.state}</p>
              </div>
            );
          })}
        </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <ApiKeysWidget />
        <StatusWidget />
        <UsageAnalyticsWidget />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t("dashboard.systemStatus")}</h2>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">{t("dashboard.allSystemsNormal")}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-4">
              <p className="text-xs text-gray-500">Inference Queue</p>
              <p className="mt-1 text-xl font-semibold text-white">42 jobs</p>
            </div>
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-4">
              <p className="text-xs text-gray-500">Error Rate</p>
              <p className="mt-1 text-xl font-semibold text-white">0.06%</p>
            </div>
            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-4">
              <p className="text-xs text-gray-500">Throughput</p>
              <p className="mt-1 text-xl font-semibold text-white">4.3k rpm</p>
            </div>
          </div>
        </section>

        <section className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-6 backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("dashboard.activityFeed")}</h2>
          <div className="space-y-3">
            {activityFeed.map((item) => (
              <div key={item.id} className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-3">
                <p className="text-sm text-white">{item.title}</p>
                <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
