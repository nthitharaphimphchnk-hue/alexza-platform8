import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { Bot, GitBranch, LayoutTemplate, Package, Star, Download, Users, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type AgentItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  authorUsername?: string;
};

type WorkflowItem = AgentItem;

type CreatorItem = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio: string;
  revenue: number;
  payoutAmount: number;
};

type PackItem = {
  id: string;
  name: string;
  description: string;
  templateCount: number;
  tags: string[];
};

type AppItem = {
  id: string;
  name: string;
  description: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  category?: string;
  tags: string[];
};

export default function Community() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [packs, setPacks] = useState<PackItem[]>([]);
  const [apps, setApps] = useState<AppItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [a, w, c, p, fa] = await Promise.all([
          apiRequest<{ ok: boolean; agents: AgentItem[] }>("/api/community/trending-agents"),
          apiRequest<{ ok: boolean; workflows: WorkflowItem[] }>("/api/community/popular-workflows"),
          apiRequest<{ ok: boolean; creators: CreatorItem[] }>("/api/community/top-creators"),
          apiRequest<{ ok: boolean; packs: PackItem[] }>("/api/community/new-packs"),
          apiRequest<{ ok: boolean; apps: AppItem[] }>("/api/community/featured-apps"),
        ]);
        setAgents(a.agents ?? []);
        setWorkflows(w.workflows ?? []);
        setCreators(c.creators ?? []);
        setPacks(p.packs ?? []);
        setApps(fa.apps ?? []);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        showErrorToast("Failed to load community feed", err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const skeleton = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-32 rounded-xl bg-[#0b0e12]/70 animate-pulse" />
      ))}
    </div>
  );

  return (
    <AppShell
      title="Community Hub"
      subtitle="Discover agents, workflows, templates, apps, and creators"
      backHref="/app/dashboard"
      backLabel={t("common.back")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: "Community" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
          onClick={() => (window.location.href = "/app/creators")}
        >
          <Sparkles size={16} className="mr-2" />
          Become a creator
        </Button>
      }
    >
      <div className="space-y-10">
        {/* Trending Agents */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bot size={18} className="text-[#c0c0c0]" />
              Trending Agents
            </h2>
            <a href="/app/agent-marketplace" className="text-xs text-[#c0c0c0] hover:underline">
              Browse all agents
            </a>
          </div>
          {loading ? (
            skeleton
          ) : agents.length === 0 ? (
            <p className="text-sm text-gray-500">No agents yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => (
                <div key={a.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
                  <h3 className="font-semibold text-white mb-1 truncate">{a.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{a.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Download size={12} /> {a.downloads}
                    </span>
                    {a.ratingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-[#c0c0c0] text-[#c0c0c0]" />
                        {a.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <a
                    href="/app/agent-marketplace"
                    className="mt-2 inline-flex text-xs text-[#c0c0c0] hover:underline"
                  >
                    View in Agent Marketplace
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Popular Workflows */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitBranch size={18} className="text-[#c0c0c0]" />
              Popular Workflows
            </h2>
            <a href="/app/workflow-marketplace" className="text-xs text-[#c0c0c0] hover:underline">
              Browse workflows
            </a>
          </div>
          {loading ? (
            skeleton
          ) : workflows.length === 0 ? (
            <p className="text-sm text-gray-500">No workflows yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((w) => (
                <div key={w.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
                  <h3 className="font-semibold text-white mb-1 truncate">{w.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{w.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Download size={12} /> {w.downloads}
                    </span>
                    {w.ratingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-[#c0c0c0] text-[#c0c0c0]" />
                        {w.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <a
                    href="/app/workflow-marketplace"
                    className="mt-2 inline-flex text-xs text-[#c0c0c0] hover:underline"
                  >
                    View in Workflow Marketplace
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Creators */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users size={18} className="text-[#c0c0c0]" />
              Top Creators
            </h2>
            <a href="/app/creators" className="text-xs text-[#c0c0c0] hover:underline">
              View all creators
            </a>
          </div>
          {loading ? (
            skeleton
          ) : creators.length === 0 ? (
            <p className="text-sm text-gray-500">No creators yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((c) => (
                <a
                  key={c.id}
                  href={`/app/creators/${c.username}`}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 flex gap-4 hover:border-[rgba(192,192,192,0.3)] transition-all"
                >
                  <div className="rounded-full h-12 w-12 bg-[#c0c0c0]/20 flex items-center justify-center overflow-hidden shrink-0">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users size={20} className="text-[#c0c0c0]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{c.displayName}</h3>
                    <p className="text-xs text-gray-500">@{c.username}</p>
                    {c.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.bio}</p>}
                    <div className="mt-2 text-xs text-gray-500">
                      ${c.revenue.toFixed(2)} total revenue
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* New Packs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <LayoutTemplate size={18} className="text-[#c0c0c0]" />
              New Packs
            </h2>
            <a href="/app/packs" className="text-xs text-[#c0c0c0] hover:underline">
              Browse packs
            </a>
          </div>
          {loading ? (
            skeleton
          ) : packs.length === 0 ? (
            <p className="text-sm text-gray-500">No packs yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((p) => (
                <a
                  key={p.id}
                  href="/app/packs"
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all"
                >
                  <h3 className="font-semibold text-white mb-1 truncate">{p.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{p.description}</p>
                  <div className="text-xs text-gray-500">{p.templateCount} templates</div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Featured Apps */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package size={18} className="text-[#c0c0c0]" />
              Featured Apps
            </h2>
            <a href="/app/store" className="text-xs text-[#c0c0c0] hover:underline">
              Browse apps
            </a>
          </div>
          {loading ? (
            skeleton
          ) : apps.length === 0 ? (
            <p className="text-sm text-gray-500">No apps yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <a
                  key={app.id}
                  href="/app/store"
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all"
                >
                  <h3 className="font-semibold text-white mb-1 truncate">{app.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{app.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Download size={12} /> {app.downloads}
                    </span>
                    {app.ratingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-[#c0c0c0] text-[#c0c0c0]" />
                        {app.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

