import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  User,
  Search,
  Star,
  Download,
  Bot,
  GitBranch,
  LayoutTemplate,
  Package,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface CreatorSummary {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar?: string;
  userId: string;
  totalAgents: number;
  totalWorkflows: number;
  totalTemplates: number;
  totalApps: number;
  downloads: number;
  rating: number;
  ratingCount: number;
  followers: number;
}

interface CreatorDetail extends CreatorSummary {
  isFollowing?: boolean;
  agents: { id: string; name: string; description: string; category?: string; tags: string[]; downloads: number; rating: number; ratingCount: number }[];
  workflows: { id: string; name: string; description: string; category?: string; tags: string[]; downloads: number; rating: number; ratingCount: number }[];
  templates: { id: string; name: string; description: string; category?: string; tags: string[]; downloads: number; rating: number; ratingCount: number }[];
  apps: { id: string; name: string; description: string; category?: string; tags: string[]; downloads: number; rating: number; ratingCount: number }[];
}

function CreatorCard({
  c,
  onClick,
}: {
  c: CreatorSummary;
  onClick: () => void;
}) {
  const totalItems = c.totalAgents + c.totalWorkflows + c.totalTemplates + c.totalApps;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-full h-14 w-14 bg-[#c0c0c0]/20 flex items-center justify-center shrink-0 overflow-hidden">
          {c.avatar ? (
            <img src={c.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={28} className="text-[#c0c0c0]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{c.displayName}</h3>
          <p className="text-sm text-gray-500">@{c.username}</p>
          {c.bio && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{c.bio}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Download size={12} />
              {c.downloads} downloads
            </span>
            {c.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-[#c0c0c0] text-[#c0c0c0]" />
                {c.rating.toFixed(1)} ({c.ratingCount})
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {c.followers} followers
            </span>
            <span>{totalItems} items</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ContentSection({
  title,
  icon: Icon,
  items,
  getHref,
}: {
  title: string;
  icon: React.ElementType;
  items: { id: string; name: string; description: string; tags: string[]; downloads: number; rating: number; ratingCount: number }[];
  getHref: (id: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Icon size={20} className="text-[#c0c0c0]" />
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={getHref(item.id)}
            className="block rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4 hover:border-[rgba(192,192,192,0.3)] transition-all"
          >
            <h3 className="font-medium text-white truncate">{item.name}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">{item.description || "—"}</p>
            <div className="flex gap-2 mt-2 text-xs text-gray-500">
              <span>{item.downloads} downloads</span>
              {item.ratingCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star size={10} className="fill-[#c0c0c0] text-[#c0c0c0]" />
                  {item.rating.toFixed(1)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Creators() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const username = location.startsWith("/app/creators/") && location !== "/app/creators"
    ? location.replace(/^\/app\/creators\//, "").split("/")[0]
    : null;

  const [list, setList] = useState<CreatorSummary[]>([]);
  const [detail, setDetail] = useState<CreatorDetail | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (search.trim()) params.set("search", search.trim());
      const data = await apiRequest<{ ok: boolean; creators: CreatorSummary[] }>(
        `/api/creators?${params.toString()}`
      );
      setList(data.creators ?? []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load creators", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  const loadDetail = useCallback(async (u: string) => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{
        ok: boolean;
        creator: CreatorDetail;
        agents: CreatorDetail["agents"];
        workflows: CreatorDetail["workflows"];
        templates: CreatorDetail["templates"];
        apps: CreatorDetail["apps"];
      }>(`/api/creators/${encodeURIComponent(u)}`);
      setDetail({
        ...data.creator,
        agents: data.agents ?? [],
        workflows: data.workflows ?? [],
        templates: data.templates ?? [],
        apps: data.apps ?? [],
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setDetail(null);
      } else if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      } else {
        showErrorToast("Failed to load profile", error instanceof Error ? error.message : "Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) {
      void loadDetail(username);
    } else {
      void loadList();
    }
  }, [username, loadList, loadDetail]);

  const handleFollow = async () => {
    if (!detail) return;
    setFollowLoading(true);
    try {
      await apiRequest<{ ok: boolean; following: boolean; followers: number }>(
        `/api/creators/${encodeURIComponent(detail.username)}/follow`,
        { method: "POST" }
      );
      setDetail((d) => (d ? { ...d, isFollowing: true, followers: (d.followers ?? 0) + 1 } : null));
      showSuccessToast("Following", `You are now following @${detail.username}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to follow", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!detail) return;
    setFollowLoading(true);
    try {
      await apiRequest<{ ok: boolean; following: boolean; followers: number }>(
        `/api/creators/${encodeURIComponent(detail.username)}/follow`,
        { method: "DELETE" }
      );
      setDetail((d) => (d ? { ...d, isFollowing: false, followers: Math.max(0, (d.followers ?? 0) - 1) } : null));
      showSuccessToast("Unfollowed", `You unfollowed @${detail.username}`);
    } catch (error) {
      showErrorToast("Failed to unfollow", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setFollowLoading(false);
    }
  };

  if (username) {
    return (
      <AppShell
        title={detail ? detail.displayName : "Creator"}
        subtitle={detail ? `@${detail.username}` : ""}
        backHref="/app/creators"
        backLabel={t("common.back")}
        breadcrumbs={[
          { label: t("navigation.dashboard"), href: "/app/dashboard" },
          { label: "Creators", href: "/app/creators" },
          ...(detail ? [{ label: detail.displayName }] : []),
        ]}
      >
        {isLoading && !detail ? (
          <div className="space-y-6">
            <div className="h-32 rounded-xl bg-[#0b0e12]/70 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-[#0b0e12]/70 animate-pulse" />
              ))}
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="rounded-full h-24 w-24 bg-[#c0c0c0]/20 flex items-center justify-center shrink-0 overflow-hidden">
                {detail.avatar ? (
                  <img src={detail.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={48} className="text-[#c0c0c0]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white">{detail.displayName}</h1>
                <p className="text-gray-500">@{detail.username}</p>
                {detail.bio && <p className="text-gray-400 mt-2">{detail.bio}</p>}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download size={16} />
                    {detail.downloads} total downloads
                  </span>
                  {detail.ratingCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={16} className="fill-[#c0c0c0] text-[#c0c0c0]" />
                      {detail.rating.toFixed(1)} ({detail.ratingCount} ratings)
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    {detail.followers ?? 0} followers
                  </span>
                  <span>{detail.totalAgents} agents · {detail.totalWorkflows} workflows · {detail.totalTemplates} templates · {detail.totalApps} apps</span>
                </div>
                {detail.isFollowing !== undefined && (
                  <div className="mt-4">
                    {detail.isFollowing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleUnfollow()}
                        disabled={followLoading}
                        className="border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
                      >
                        Unfollow
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void handleFollow()}
                        disabled={followLoading}
                        className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                      >
                        Follow
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <ContentSection
              title="Agents"
              icon={Bot}
              items={detail.agents}
              getHref={() => "/app/agent-marketplace"}
            />
            <ContentSection
              title="Workflows"
              icon={GitBranch}
              items={detail.workflows}
              getHref={() => "/app/workflow-marketplace"}
            />
            <ContentSection
              title="Templates"
              icon={LayoutTemplate}
              items={detail.templates}
              getHref={() => "/app/marketplace"}
            />
            <ContentSection
              title="Apps"
              icon={Package}
              items={detail.apps}
              getHref={() => "/app/store"}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
            <User size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">Creator not found.</p>
            <Button
              variant="outline"
              className="mt-4 border-[rgba(255,255,255,0.12)] text-white"
              onClick={() => setLocation("/app/creators")}
            >
              Back to Creators
            </Button>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Creators"
      subtitle="Discover developers and AI builders"
      backHref="/app/dashboard"
      backLabel={t("common.back")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: "Creators" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadList()}
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] pl-9 pr-4 text-sm text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void loadList()}
            disabled={isLoading}
            className="border-[rgba(255,255,255,0.12)] text-white"
          >
            {t("common.search")}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[#0b0e12]/70 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
            <User size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No creators found.</p>
            <p className="mt-1 text-sm text-gray-500">Publish agents, workflows, or templates to appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <CreatorCard
                key={c.id}
                c={c}
                onClick={() => setLocation(`/app/creators/${c.username}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
