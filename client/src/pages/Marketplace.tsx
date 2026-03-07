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
import { getProjects, listActions } from "@/lib/alexzaApi";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Store, Search, Star, Download, User, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  templateId: string;
  category?: string;
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface SectionsResponse {
  ok: boolean;
  sections: {
    trending: MarketplaceTemplate[];
    popular: MarketplaceTemplate[];
    new: MarketplaceTemplate[];
  };
}

function StarRating({ rating, count, interactive, onRate }: { rating: number; count: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  const display = interactive && hover > 0 ? hover : rating;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(i)}
          className={`${interactive ? "cursor-pointer" : "cursor-default"} p-0.5`}
        >
          <Star
            size={14}
            className={i <= display ? "fill-[#c0c0c0] text-[#c0c0c0]" : "text-gray-600"}
          />
        </button>
      ))}
      {count > 0 && <span className="ml-1 text-xs text-gray-500">({count})</span>}
    </div>
  );
}

function TemplateCard({
  t,
  onInstall,
  onRate,
}: {
  t: MarketplaceTemplate;
  onInstall: (t: MarketplaceTemplate) => void;
  onRate?: (id: string, rating: number) => void;
}) {
  return (
    <div className="group rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="rounded-lg bg-[#c0c0c0]/10 p-2">
          <Store size={20} className="text-[#c0c0c0]" />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {t.category && (
            <span className="rounded px-1.5 py-0.5 bg-[rgba(255,255,255,0.06)] capitalize">
              {t.category.replace(/_/g, " ")}
            </span>
          )}
          <Download size={12} />
          {t.downloads}
        </div>
      </div>
      <h3 className="font-semibold text-white mb-1">{t.name}</h3>
      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{t.description}</p>
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <User size={12} />
        {t.author}
      </div>
      <div className="mb-3">
        <StarRating
          rating={t.rating}
          count={t.ratingCount}
          interactive
          onRate={(r) => onRate?.(t.id, r)}
        />
      </div>
      {t.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {t.tags.slice(0, 3).map((tag) => (
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
        onClick={() => onInstall(t)}
        className="w-full border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
      >
        Install
      </Button>
    </div>
  );
}

export default function Marketplace() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [sections, setSections] = useState<SectionsResponse["sections"] | null>(null);
  const [allTemplates, setAllTemplates] = useState<MarketplaceTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [applyProjectId, setApplyProjectId] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishProjectId, setPublishProjectId] = useState("");
  const [publishActions, setPublishActions] = useState<{ actionName: string; description: string }[]>([]);
  const [publishActionName, setPublishActionName] = useState("");
  const [publishTags, setPublishTags] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const loadSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<SectionsResponse>("/api/marketplace/sections?limit=6");
      setSections(data.sections ?? { trending: [], popular: [], new: [] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load marketplace", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSearch = useCallback(async () => {
    if (!search.trim()) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ q: search.trim(), limit: "50" });
      const data = await apiRequest<{ ok: boolean; templates: MarketplaceTemplate[] }>(
        `/api/marketplace?${params.toString()}`
      );
      setAllTemplates(data.templates ?? []);
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

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list.map((p) => ({ id: p.id, name: p.name || p.id })));
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadPublishActions = useCallback(async (projectId: string) => {
    if (!projectId) {
      setPublishActions([]);
      return;
    }
    try {
      const actions = await listActions(projectId);
      setPublishActions(actions.map((a) => ({ actionName: a.actionName, description: a.description || "" })));
      setPublishActionName(actions[0]?.actionName ?? "");
    } catch {
      setPublishActions([]);
    }
  }, []);

  useEffect(() => {
    if (publishOpen) {
      if (!publishProjectId && projects[0]) setPublishProjectId(projects[0].id);
      if (publishProjectId) void loadPublishActions(publishProjectId);
    } else {
      setPublishProjectId("");
    }
  }, [publishOpen, publishProjectId, projects, loadPublishActions]);

  const handlePublish = async () => {
    if (!publishProjectId || !publishActionName) return;
    setIsPublishing(true);
    try {
      const tags = publishTags.split(",").map((t) => t.trim()).filter(Boolean);
      await apiRequest<{ ok: boolean }>("/api/marketplace/publish", {
        method: "POST",
        body: { projectId: publishProjectId, actionName: publishActionName, tags },
      });
      showSuccessToast("Published", "Template published to marketplace");
      setPublishOpen(false);
      setPublishActionName("");
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
    if (!selectedTemplate || !applyProjectId) return;
    setIsInstalling(true);
    try {
      const res = await apiRequest<{ ok: boolean; action: { actionName: string; projectId: string } }>(
        `/api/marketplace/${selectedTemplate.id}/install`,
        {
          method: "POST",
          body: { projectId: applyProjectId },
        }
      );
      showSuccessToast("Installed", `Action "${res.action?.actionName}" created`);
      setDrawerOpen(false);
      setSelectedTemplate(null);
      setApplyProjectId("");
      setLocation(`/app/projects/${applyProjectId}`);
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

  const handleRate = async (id: string, rating: number) => {
    try {
      await apiRequest<{ ok: boolean; rating: number; ratingCount: number }>(
        `/api/marketplace/${id}/rate`,
        { method: "POST", body: { rating } }
      );
      void loadSections();
      if (searchMode) {
        const params = new URLSearchParams({ q: search.trim(), limit: "50" });
        const data = await apiRequest<{ ok: boolean; templates: MarketplaceTemplate[] }>(
          `/api/marketplace?${params.toString()}`
        );
        setAllTemplates(data.templates ?? []);
      }
    } catch {
      showErrorToast("Failed to submit rating");
    }
  };

  const openInstallDrawer = (tmpl: MarketplaceTemplate) => {
    setSelectedTemplate(tmpl);
    setApplyProjectId(projects[0]?.id ?? "");
    setDrawerOpen(true);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchMode(false);
    void loadSections();
  };

  return (
    <AppShell
      title={t("marketplace.title")}
      subtitle={t("marketplace.subtitle")}
      backHref="/app/dashboard"
      backLabel={t("common.back")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: t("navigation.marketplace") },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPublishOpen(true)}
          className="border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
        >
          <Upload size={16} className="mr-2" />
          {t("marketplace.publish")}
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={t("marketplace.searchPlaceholder")}
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
            {t("common.search")}
          </Button>
          {searchMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="text-gray-400"
            >
              {t("marketplace.clearSearch")}
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
            <h2 className="text-lg font-semibold text-white mb-4">
              {t("marketplace.searchResults")} ({allTemplates.length})
            </h2>
            {allTemplates.length === 0 ? (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
                <Store size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">{t("marketplace.noResults")}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allTemplates.map((tmpl) => (
                  <TemplateCard
                    key={tmpl.id}
                    t={tmpl}
                    onInstall={openInstallDrawer}
                    onRate={handleRate}
                  />
                ))}
              </div>
            )}
          </div>
        ) : sections ? (
          <>
            {/* Trending */}
            {sections.trending.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-[#c0c0c0]">↑</span> {t("marketplace.trending")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.trending.map((tmpl) => (
                    <TemplateCard
                      key={tmpl.id}
                      t={tmpl}
                      onInstall={openInstallDrawer}
                      onRate={handleRate}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Popular */}
            {sections.popular.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Download size={18} className="text-[#c0c0c0]" /> {t("marketplace.popular")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.popular.map((tmpl) => (
                    <TemplateCard
                      key={tmpl.id}
                      t={tmpl}
                      onInstall={openInstallDrawer}
                      onRate={handleRate}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* New */}
            {sections.new.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-[#c0c0c0]">◆</span> {t("marketplace.new")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.new.map((tmpl) => (
                    <TemplateCard
                      key={tmpl.id}
                      t={tmpl}
                      onInstall={openInstallDrawer}
                      onRate={handleRate}
                    />
                  ))}
                </div>
              </section>
            )}

            {sections.trending.length === 0 && sections.popular.length === 0 && sections.new.length === 0 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
                <Store size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">{t("marketplace.empty")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("marketplace.emptyHint")}</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Install Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">{t("marketplace.install")}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">{t("marketplace.template")}</p>
                <p className="font-medium text-white">{selectedTemplate.name}</p>
                <p className="text-xs text-gray-500 mt-1">by {selectedTemplate.author}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">{t("marketplace.project")}</span>
                <Select value={applyProjectId} onValueChange={setApplyProjectId}>
                  <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
                    <SelectValue placeholder={t("marketplace.selectProject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 border-[rgba(255,255,255,0.12)] text-white"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void handleInstall()}
                  disabled={!applyProjectId || isInstalling}
                  className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                >
                  {isInstalling ? t("marketplace.installing") : t("marketplace.install")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">{t("marketplace.publish")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-400">{t("marketplace.project")}</span>
              <Select value={publishProjectId} onValueChange={(v) => { setPublishProjectId(v); setPublishActionName(""); }}>
                <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
                  <SelectValue placeholder={t("marketplace.selectProject")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-sm text-gray-400">{t("marketplace.action")}</span>
              <Select value={publishActionName} onValueChange={setPublishActionName}>
                <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
                  <SelectValue placeholder={t("marketplace.selectAction")} />
                </SelectTrigger>
                <SelectContent>
                  {publishActions.map((a) => (
                    <SelectItem key={a.actionName} value={a.actionName}>
                      {a.actionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-sm text-gray-400">{t("marketplace.tags")}</span>
              <input
                type="text"
                placeholder="summarize, text, ai"
                value={publishTags}
                onChange={(e) => setPublishTags(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPublishOpen(false)}
                className="flex-1 border-[rgba(255,255,255,0.12)] text-white"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handlePublish()}
                disabled={!publishProjectId || !publishActionName || isPublishing}
                className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
              >
                {isPublishing ? t("marketplace.publishing") : t("marketplace.publish")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
