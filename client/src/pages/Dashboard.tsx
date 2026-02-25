import { useTranslation } from "react-i18next";
import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import ApiKeysWidget from "@/components/dashboard/ApiKeysWidget";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import StatusWidget from "@/components/dashboard/StatusWidget";
import UsageAnalyticsWidget from "@/components/dashboard/UsageAnalyticsWidget";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/hooks/useWallet";
import { Activity, Gauge, Plus, Server, TriangleAlert } from "lucide-react";
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
  const { balanceCredits, tokensPerCredit, isLoading: loading, error: creditsError, refetch: refetchCredits } = useWalletBalance();

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
          <Button
            onClick={() => setLocation("/app/projects")}
            className="bg-[#c0c0c0] text-black font-semibold hover:bg-[#a8a8a8] transition-all"
          >
            <Plus size={16} className="mr-2" />
            {t("navigation.newProject")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/app/usage")}
            className="border-[rgba(255,255,255,0.08)] text-gray-300 hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(192,192,192,0.4)] hover:text-white transition-all"
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
            {
              label: t("dashboard.creditsRemaining"),
              value: creditsError ? (
                <span className="flex flex-col gap-1">
                  <span className="text-sm text-gray-300">{creditsError}</span>
                  <Button variant="outline" size="sm" onClick={() => void refetchCredits()} className="w-fit border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]">
                    Retry
                  </Button>
                </span>
              ) : (
                <span>
                  <AnimatedCounter value={balanceCredits} /> credits
                </span>
              ),
              icon: TriangleAlert,
              state: creditsError ? "" : `1 credit = ${tokensPerCredit.toLocaleString()} tokens`,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            const glows = [
              { border: "hover:border-[rgba(192,192,192,0.4)]", shadow: "", icon: "text-[#c0c0c0]" },
              { border: "hover:border-[rgba(192,192,192,0.4)]", shadow: "", icon: "text-[#c0c0c0]" },
              { border: "hover:border-[rgba(192,192,192,0.4)]", shadow: "", icon: "text-[#c0c0c0]" },
              { border: "hover:border-[rgba(192,192,192,0.4)]", shadow: "", icon: "text-[#c0c0c0]" },
            ];
            const g = glows[idx] || glows[0];
            return (
              <div
                key={idx}
                className={`group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-black p-5 transition-all duration-300 ${g.border} ${g.shadow} before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100 before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-transparent`}
              >
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{item.label}</p>
                    <div className={`rounded-lg bg-[rgba(255,255,255,0.06)] p-2 transition-colors group-hover:bg-[rgba(255,255,255,0.1)] ${g.icon}`}>
                      <Icon size={16} className="text-current" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{item.value}</p>
                  {item.state && (
                    <span className="mt-2 inline-block rounded-full bg-[rgba(255,255,255,0.08)] px-2.5 py-0.5 text-xs text-gray-400 border border-[rgba(255,255,255,0.06)]">
                      {item.state}
                    </span>
                  )}
                </div>
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
        <section className="group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 transition-all duration-300 hover:border-[rgba(192,192,192,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("dashboard.systemStatus")}</h2>
              <span className="rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-3 py-1 text-xs font-medium text-white">{t("dashboard.allSystemsNormal")}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Inference Queue", value: "42 jobs", pill: "JOBS", pillClass: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]" },
                { label: "Error Rate", value: "0.06%", pill: "LOW", pillClass: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]" },
                { label: "Throughput", value: "4.3k rpm", pill: "RPM", pillClass: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 p-4 transition hover:border-[rgba(255,255,255,0.12)]">
                  <span className={m.pillClass}>{m.pill}</span>
                  <p className="mt-2 text-xl font-bold text-white">{m.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 transition-all duration-300 hover:border-[rgba(192,192,192,0.4)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("dashboard.activityFeed")}</h2>
            <div className="relative space-y-0 pl-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[rgba(192,192,192,0.4)] via-[rgba(192,192,192,0.2)] to-transparent" />
              {activityFeed.map((item) => {
                const pillClasses = {
                  ok: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]",
                  info: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]",
                  warning: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]",
                  danger: "rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]",
                };
                const dotColors = { ok: "bg-[#c0c0c0]", info: "bg-[#c0c0c0]", warning: "bg-[#c0c0c0]", danger: "bg-[#c0c0c0]" };
                const dot = dotColors[item.tone as keyof typeof dotColors] || "bg-gray-400";
                const pill = pillClasses[item.tone as keyof typeof pillClasses] || pillClasses.info;
                return (
                  <div key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${dot}`} />
                    <div className="flex-1 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 p-3 transition hover:border-[rgba(255,255,255,0.12)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <span className={pill}>
                          {item.tone.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
