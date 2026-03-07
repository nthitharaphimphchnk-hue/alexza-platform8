import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Package, Search, Download, User, Upload, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

interface App {
  id: string;
  name: string;
  description: string;
  author: string;
  permissions: string[];
  category?: string;
  tags: string[];
  version: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

interface SectionsResponse {
  ok: boolean;
  sections: {
    trending: App[];
    popular: App[];
    new: App[];
  };
}

function AppCard({
  app,
  onInstall,
}: {
  app: App;
  onInstall: (app: App) => void;
}) {
  return (
    <div className="group rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="rounded-lg bg-[#c0c0c0]/10 p-2">
          <Package size={20} className="text-[#c0c0c0]" />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {app.category && (
            <span className="rounded px-1.5 py-0.5 bg-[rgba(255,255,255,0.06)] capitalize">
              {app.category.replace(/_/g, " ")}
            </span>
          )}
          <span className="text-gray-500">v{app.version}</span>
          <Download size={12} />
          {app.downloads}
        </div>
      </div>
      <h3 className="font-semibold text-white mb-1">{app.name}</h3>
      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{app.description}</p>
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <User size={12} />
        {app.author}
      </div>
      {app.permissions?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {app.permissions.slice(0, 3).map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs bg-[rgba(255,255,255,0.06)] text-gray-500"
            >
              <Shield size={10} />
              {p.replace(":", " ")}
            </span>
          ))}
        </div>
      )}
      {app.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {app.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded px-1.5 py-0.5 text-xs bg-[rgba(255,255,255,0.06)] text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onInstall(app)}
        className="w-full border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
      >
        Install
      </Button>
    </div>
  );
}

export default function AppStore() {
  const [, setLocation] = useLocation();
  const { workspaces } = useWorkspace();
  const [sections, setSections] = useState<SectionsResponse["sections"] | null>(null);
  const [allApps, setAllApps] = useState<App[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [applyWorkspaceId, setApplyWorkspaceId] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishName, setPublishName] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishPermissions, setPublishPermissions] = useState<string[]>([]);
  const [publishCategory, setPublishCategory] = useState("");
  const [publishTags, setPublishTags] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const workspacesWithManage = workspaces.filter((w) => w.role === "owner" || w.role === "admin");

  const loadSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<SectionsResponse>("/api/apps/sections?limit=6");
      setSections(data.sections ?? { trending: [], popular: [], new: [] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load app store", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSearch = useCallback(async () => {
    if (!search.trim()) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ q: search.trim(), limit: "50" });
      const data = await apiRequest<{ ok: boolean; apps: App[] }>(`/api/apps?${params.toString()}`);
      setAllApps(data.apps ?? []);
      setSearchMode(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Search failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const handlePublish = async () => {
    if (!publishName.trim()) return;
    setIsPublishing(true);
    try {
      const tags = publishTags.split(",").map((t) => t.trim()).filter(Boolean);
      await apiRequest<{ ok: boolean }>("/api/apps/publish", {
        method: "POST",
        body: {
          name: publishName.trim(),
          description: publishDesc.trim(),
          permissions: publishPermissions,
          category: publishCategory || undefined,
          tags,
          visibility: "public",
        },
      });
      showSuccessToast("Published", "App published to store");
      setPublishOpen(false);
      setPublishName("");
      setPublishDesc("");
      setPublishPermissions([]);
      setPublishCategory("");
      setPublishTags("");
      void loadSections();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Publish failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleInstall = async () => {
    if (!selectedApp || !applyWorkspaceId) return;
    setIsInstalling(true);
    try {
      await apiRequest<{ ok: boolean; install: { workspaceId: string } }>(
        `/api/apps/${selectedApp.id}/install`,
        {
          method: "POST",
          body: { workspaceId: applyWorkspaceId },
        }
      );
      showSuccessToast("Installed", "App installed to workspace");
      setDrawerOpen(false);
      setSelectedApp(null);
      setApplyWorkspaceId("");
      setLocation(`/app/workspaces`);
      void loadSections();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = error instanceof ApiError ? error.message : "Install failed";
      showErrorToast("Install failed", msg);
    } finally {
      setIsInstalling(false);
    }
  };

  const openInstallDrawer = (app: App) => {
    setSelectedApp(app);
    setApplyWorkspaceId(workspacesWithManage[0]?.id ?? "");
    setDrawerOpen(true);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchMode(false);
    void loadSections();
  };

  const PERMISSIONS = [
    { id: "run:actions", label: "Run Actions" },
    { id: "read:projects", label: "Read Projects" },
    { id: "manage:webhooks", label: "Manage Webhooks" },
    { id: "manage:workflows", label: "Manage Workflows" },
  ];

  const togglePermission = (id: string) => {
    setPublishPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <AppShell
      title="App Store"
      subtitle="Install apps and plugins into your workspace"
      backHref="/app/dashboard"
      backLabel="Back"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "App Store" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPublishOpen(true)}
          className="border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
        >
          <Upload size={16} className="mr-2" />
          Publish App
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadSearch()}
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] pl-9 pr-4 text-sm text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void loadSearch()}
            disabled={isLoading || !search.trim()}
            className="border-[rgba(255,255,255,0.12)] text-white"
          >
            Search
          </Button>
          {searchMode && (
            <Button variant="ghost" size="sm" onClick={clearSearch} className="text-gray-400">
              Clear
            </Button>
          )}
        </div>

        {isLoading && !searchMode ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 animate-pulse"
              />
            ))}
          </div>
        ) : searchMode ? (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Search Results ({allApps.length})</h2>
            {allApps.length === 0 ? (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
                <Package size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No apps found</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allApps.map((app) => (
                  <AppCard key={app.id} app={app} onInstall={openInstallDrawer} />
                ))}
              </div>
            )}
          </div>
        ) : sections ? (
          <>
            {sections.trending.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-[#c0c0c0]">↑</span> Trending
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.trending.map((app) => (
                    <AppCard key={app.id} app={app} onInstall={openInstallDrawer} />
                  ))}
                </div>
              </section>
            )}

            {sections.popular.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Download size={18} className="text-[#c0c0c0]" /> Popular
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.popular.map((app) => (
                    <AppCard key={app.id} app={app} onInstall={openInstallDrawer} />
                  ))}
                </div>
              </section>
            )}

            {sections.new.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-[#c0c0c0]">◆</span> New
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.new.map((app) => (
                    <AppCard key={app.id} app={app} onInstall={openInstallDrawer} />
                  ))}
                </div>
              </section>
            )}

            {sections.trending.length === 0 && sections.popular.length === 0 && sections.new.length === 0 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
                <Package size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No apps yet</p>
                <p className="mt-1 text-sm text-gray-500">Be the first to publish an app</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">Install App</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Install &quot;{selectedApp.name}&quot; into a workspace. You need workspace manage permission.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Workspace</label>
                <Select value={applyWorkspaceId} onValueChange={setApplyWorkspaceId}>
                  <SelectTrigger className="bg-[#050607] border-[rgba(255,255,255,0.12)] text-white">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspacesWithManage.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedApp.permissions?.length > 0 && (
                <div className="rounded-lg border border-[rgba(255,255,255,0.08)] p-3">
                  <p className="text-xs font-medium text-gray-400 mb-2">This app requests:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedApp.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded px-1.5 py-0.5 text-xs bg-[rgba(255,255,255,0.06)] text-gray-500"
                      >
                        {p.replace(":", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={handleInstall}
                disabled={isInstalling || !applyWorkspaceId}
                className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
              >
                {isInstalling ? "Installing..." : "Install"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Publish App</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
              <input
                value={publishName}
                onChange={(e) => setPublishName(e.target.value)}
                placeholder="My Awesome App"
                className="w-full px-4 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={publishDesc}
                onChange={(e) => setPublishDesc(e.target.value)}
                placeholder="What does your app do?"
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {PERMISSIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePermission(p.id)}
                    className={`rounded px-3 py-1.5 text-xs border transition ${
                      publishPermissions.includes(p.id)
                        ? "border-[#c0c0c0] bg-[rgba(192,192,192,0.1)] text-white"
                        : "border-[rgba(255,255,255,0.12)] text-gray-400 hover:border-[rgba(255,255,255,0.2)]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={publishCategory}
                onChange={(e) => setPublishCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm"
              >
                <option value="">Select...</option>
                <option value="productivity">Productivity</option>
                <option value="automation">Automation</option>
                <option value="analytics">Analytics</option>
                <option value="integrations">Integrations</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
              <input
                value={publishTags}
                onChange={(e) => setPublishTags(e.target.value)}
                placeholder="ai, workflow, automation"
                className="w-full px-4 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm"
              />
            </div>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !publishName.trim()}
              className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
