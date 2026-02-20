import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import ApiKeysWidget from "@/components/dashboard/ApiKeysWidget";
import UsageAnalyticsWidget from "@/components/dashboard/UsageAnalyticsWidget";
import { Button } from "@/components/ui/button";
import { Activity, Gauge, Plus, Server, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const activityFeed = [
  { id: "a1", title: "API call completed", detail: "Customer Support Bot • 208ms", tone: "ok" },
  { id: "a2", title: "New key created", detail: "Project: Document AI", tone: "info" },
  { id: "a3", title: "Credits deducted", detail: "2,500 credits • GPT-4 Inference", tone: "warning" },
  { id: "a4", title: "Gateway warning", detail: "Latency spike on us-east", tone: "danger" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [credits] = useState(270750);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Real-time AI orchestration visibility"
      backHref="/app/projects"
      backLabel="Back to Projects"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Overview" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/app/projects")} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
            <Plus size={16} className="mr-2" />
            New Project
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/app/usage")}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
            Open Usage
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "API Latency", value: "172ms", icon: Gauge, state: "Healthy" },
            { label: "Gateway Health", value: "99.98%", icon: Server, state: "Operational" },
            { label: "Model Cluster", value: "12/12", icon: Activity, state: "Online" },
            { label: "Credits Remaining", value: <AnimatedCounter value={credits} />, icon: TriangleAlert, state: "Budget Safe" },
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
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ApiKeysWidget />
        <UsageAnalyticsWidget />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">System Status</h2>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">All Systems Normal</span>
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
          <h2 className="mb-4 text-lg font-semibold text-white">Activity Feed</h2>
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
