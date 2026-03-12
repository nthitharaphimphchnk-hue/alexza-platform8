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
import { Bot, Search, Star, Download, User, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface AgentMarketplaceItem {
  id: string;
  name: string;
  description: string;
  author?: string;
  authorUsername?: string;
  authorUserId: string;
  agentId: string;
  category?: string;
  tags: string[];
  price?: number;
  billingType?: "one-time" | "monthly";
  currency?: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
}

interface SectionsResponse {
  ok: boolean;
  sections: {
    trending: AgentMarketplaceItem[];
    popular: AgentMarketplaceItem[];
    new: AgentMarketplaceItem[];
  };
}

function StarRating({
  rating,
  count,
  interactive,
  onRate,
}: {
  rating: number;
  count: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
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

function AgentCard({
  item,
  onInstall,
  onRate,
  onPurchase,
}: {
  item: AgentMarketplaceItem;
  onInstall: (item: AgentMarketplaceItem) => void;
  onRate?: (id: string, rating: number) => void;
  onPurchase?: (item: AgentMarketplaceItem) => void;
}) {
  const price = typeof item.price === "number" ? item.price : 0;
  const billing = item.billingType === "monthly" ? "monthly" : "one-time";
  return (
    <div className="group rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="rounded-lg bg-[#c0c0c0]/10 p-2">
          <Bot size={20} className="text-[#c0c0c0]" />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {item.category && (
            <span className="rounded px-1.5 py-0.5 bg-[rgba(255,255,255,0.06)] capitalize">
              {item.category.replace(/_/g, " ")}
            </span>
          )}
          <Download size={12} />
          {item.downloads}
        </div>
      </div>
      <h3 className="font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{item.description}</p>
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <User size={12} />
        {item.authorUsername ? (
          <a href={`/app/creators/${item.authorUsername}`} className="text-[#c0c0c0] hover:underline">
            {item.author ?? "Anonymous"}
          </a>
        ) : (
          (item.author ?? "Anonymous")
        )}
      </div>
      <div className="mb-3">
        <StarRating
          rating={item.rating}
          count={item.ratingCount}
          interactive
          onRate={(r) => onRate?.(item.id, r)}
        />
      </div>
      {price > 0 && (
        <div className="mb-3 text-sm text-white">
          ${price.toFixed(2)}{billing === "monthly" ? " / mo" : ""}
        </div>
      )}
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {item.tags.slice(0, 3).map((tag) => (
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
        onClick={() => (price > 0 ? onPurchase?.(item) : onInstall(item))}
        className="w-full border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
      >
        {price > 0 ? `Purchase $${price.toFixed(2)}` : "Install"}
      </Button>
    </div>
  );
}

export default function AgentMarketplace() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { workspaces } = useWorkspace();
  const [sections, setSections] = useState<SectionsResponse["sections"] | null>(null);
  const [allItems, setAllItems] = useState<AgentMarketplaceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AgentMarketplaceItem | null>(null);
  const [applyWorkspaceId, setApplyWorkspaceId] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAgentId, setPublishAgentId] = useState("");
  const [publishAgents, setPublishAgents] = useState<{ id: string; name: string }[]>([]);
  const [publishName, setPublishName] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishCategory, setPublishCategory] = useState("");
  const [publishTags, setPublishTags] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const workspaceOptions: WorkspaceOption[] = workspaces.map((w) => ({ id: w.id, name: w.name || w.id }));

  const loadSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<SectionsResponse>("/api/agent-marketplace/sections?limit=6");
      setSections(data.sections ?? { trending: [], popular: [], new: [] });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load agent marketplace", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiRequest<{ ok: boolean; categories: string[] }>("/api/agent-marketplace/categories");
      setCategories(data.categories ?? []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadSearch = useCallback(async () => {
    if (!search.trim()) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ search: search.trim(), limit: "50" });
      if (selectedCategory) params.set("category", selectedCategory);
      const data = await apiRequest<{ ok: boolean; items: AgentMarketplaceItem[] }>(
        `/api/agent-marketplace?${params.toString()}`
      );
      setAllItems(data.items ?? []);
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
  }, [search, selectedCategory]);

  const loadAgents = useCallback(async () => {
    try {
      const res = await apiRequest<{ ok: boolean; agents: { id: string; name: string }[] }>("/api/agents");
      setPublishAgents((res.agents ?? []).map((a) => ({ id: a.id, name: a.name })));
      if (!publishAgentId && res.agents?.[0]) setPublishAgentId(res.agents[0].id);
    } catch {
      setPublishAgents([]);
    }
  }, [publishAgentId]);

  useEffect(() => {
    void loadSections();
    void loadCategories();
  }, [loadSections, loadCategories]);

  useEffect(() => {
    if (publishOpen) void loadAgents();
  }, [publishOpen, loadAgents]);

  const handleInstall = async () => {
    if (!selectedItem || !applyWorkspaceId) return;
    setIsInstalling(true);
    try {
      const res = await apiRequest<{ ok: boolean; agent: { id: string; name: string; workspaceId: string } }>(
        `/api/agent-marketplace/${selectedItem.id}/install`,
        { method: "POST", body: { workspaceId: applyWorkspaceId } }
      );
      showSuccessToast("Installed", `Agent "${res.agent?.name}" added to workspace`);
      setInstallDialogOpen(false);
      setSelectedItem(null);
      setApplyWorkspaceId(workspaceOptions[0]?.id ?? "");
      setLocation("/app/agents");
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

  const handlePurchase = async (item: AgentMarketplaceItem) => {
    try {
      const res = await apiRequest<{ ok: boolean; url: string | null }>(`/api/agent-marketplace/${item.id}/purchase`, { method: "POST" });
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      showErrorToast("Purchase failed", "No checkout URL returned");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Purchase failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleRate = async (id: string, rating: number) => {
    try {
      await apiRequest<{ ok: boolean; rating: number; ratingCount: number }>(
        `/api/agent-marketplace/${id}/rate`,
        { method: "POST", body: { rating } }
      );
      void loadSections();
      if (searchMode) {
        const params = new URLSearchParams({ search: search.trim(), limit: "50" });
        if (selectedCategory) params.set("category", selectedCategory);
        const data = await apiRequest<{ ok: boolean; items: AgentMarketplaceItem[] }>(
          `/api/agent-marketplace?${params.toString()}`
        );
        setAllItems(data.items ?? []);
      }
    } catch {
      showErrorToast("Failed to submit rating");
    }
  };

  const handlePublish = async () => {
    if (!publishAgentId) return;
    setIsPublishing(true);
    try {
      const tags = publishTags.split(",").map((t) => t.trim()).filter(Boolean);
      await apiRequest<{ ok: boolean }>("/api/agent-marketplace/publish", {
        method: "POST",
        body: {
          agentId: publishAgentId,
          name: publishName.trim() || undefined,
          description: publishDesc.trim() || undefined,
          category: publishCategory.trim() || undefined,
          tags,
        },
      });
      showSuccessToast("Published", "Agent published to marketplace");
      setPublishOpen(false);
      setPublishAgentId("");
      setPublishName("");
      setPublishDesc("");
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

  const openInstallDialog = (item: AgentMarketplaceItem) => {
    setSelectedItem(item);
    setApplyWorkspaceId(workspaceOptions[0]?.id ?? "");
    setInstallDialogOpen(true);
  };

  const clearSearch = () => {
    setSearch("");
    setSelectedCategory("");
    setSearchMode(false);
    void loadSections();
  };

  return (
    <AppShell
      title="AI Agent Marketplace"
      subtitle="Browse and install community agents"
      backHref="/app/dashboard"
      backLabel={t("common.back")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: "Agent Marketplace" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPublishOpen(true)}
          className="border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
        >
          <Upload size={16} className="mr-2" />
          Publish Agent
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadSearch()}
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] pl-9 pr-4 text-sm text-white placeholder:text-gray-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 text-sm text-white"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => void loadSearch()}
            disabled={isLoading || !search.trim()}
            className="border-[rgba(255,255,255,0.12)] text-white"
          >
            {t("common.search")}
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
            <h2 className="text-lg font-semibold text-white mb-4">
              Search results ({allItems.length})
            </h2>
            {allItems.length === 0 ? (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
                <Bot size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No agents found.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allItems.map((item) => (
                  <AgentCard
                    key={item.id}
                    item={item}
                    onInstall={openInstallDialog}
                    onRate={handleRate}
                    onPurchase={handlePurchase}
                  />
                ))}
              </div>
            )}
          </div>
        ) : sections ? (
          <>
            {sections.trending.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-[#c0c0c0]">↑</span> Trending Agents
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.trending.map((item) => (
                    <AgentCard
                      key={item.id}
                      item={item}
                      onInstall={openInstallDialog}
                      onRate={handleRate}
                      onPurchase={handlePurchase}
                    />
                  ))}
                </div>
              </section>
            )}
            {sections.popular.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Download size={18} className="text-[#c0c0c0]" /> Popular Agents
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.popular.map((item) => (
                    <AgentCard
                      key={item.id}
                      item={item}
                      onInstall={openInstallDialog}
                      onRate={handleRate}
                      onPurchase={handlePurchase}
                    />
                  ))}
                </div>
              </section>
            )}
            {sections.new.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-[#c0c0c0]">◆</span> New Agents
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.new.map((item) => (
                    <AgentCard
                      key={item.id}
                      item={item}
                      onInstall={openInstallDialog}
                      onRate={handleRate}
                      onPurchase={handlePurchase}
                    />
                  ))}
                </div>
              </section>
            )}
            {categories.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c);
                        setSearch("");
                        setSearchMode(true);
                        setAllItems([]);
                        setIsLoading(true);
                        apiRequest<{ ok: boolean; items: AgentMarketplaceItem[] }>(
                          `/api/agent-marketplace?category=${encodeURIComponent(c)}&limit=50`
                        )
                          .then((data) => setAllItems(data.items ?? []))
                          .catch(() => setAllItems([]))
                          .finally(() => setIsLoading(false));
                        setSearchMode(true);
                      }}
                      className="rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#0b0e12]/70 px-4 py-2 text-sm text-gray-300 hover:bg-[rgba(192,192,192,0.1)]"
                    >
                      {c.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {sections.trending.length === 0 && sections.popular.length === 0 && sections.new.length === 0 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
                <Bot size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No agents in the marketplace yet.</p>
                <p className="mt-1 text-sm text-gray-500">Publish your first agent to get started.</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">Install Agent</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Agent</p>
                <p className="font-medium text-white">{selectedItem.name}</p>
                <p className="text-xs text-gray-500 mt-1">by {selectedItem.author ?? "Anonymous"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Workspace</span>
                <Select value={applyWorkspaceId} onValueChange={setApplyWorkspaceId}>
                  <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceOptions.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setInstallDialogOpen(false)}
                  className="flex-1 border-[rgba(255,255,255,0.12)] text-white"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void handleInstall()}
                  disabled={!applyWorkspaceId || isInstalling}
                  className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                >
                  {isInstalling ? "Installing…" : "Install"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">Publish Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-400">Agent</span>
              <Select value={publishAgentId} onValueChange={setPublishAgentId}>
                <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {publishAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-sm text-gray-400">Display name (optional)</span>
              <input
                type="text"
                placeholder="Marketplace name"
                value={publishName}
                onChange={(e) => setPublishName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <span className="text-sm text-gray-400">Description (optional)</span>
              <textarea
                placeholder="Short description"
                value={publishDesc}
                onChange={(e) => setPublishDesc(e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 py-2 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <span className="text-sm text-gray-400">Category (optional)</span>
              <input
                type="text"
                placeholder="e.g. support, automation"
                value={publishCategory}
                onChange={(e) => setPublishCategory(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <span className="text-sm text-gray-400">Tags (comma-separated)</span>
              <input
                type="text"
                placeholder="ai, assistant, workflow"
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
                disabled={!publishAgentId || isPublishing}
                className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
              >
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
