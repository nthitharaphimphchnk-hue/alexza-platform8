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
import { getProjects } from "@/lib/alexzaApi";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Package, Search, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

interface Pack {
  id: string;
  name: string;
  description: string;
  templateCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

function PackCard({
  pack,
  onInstall,
}: {
  pack: Pack;
  onInstall: (pack: Pack) => void;
}) {
  return (
    <div className="group rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="rounded-lg bg-[#c0c0c0]/10 p-2">
          <Package size={20} className="text-[#c0c0c0]" />
        </div>
        <span className="text-xs text-gray-500">{pack.templateCount} templates</span>
      </div>
      <h3 className="font-semibold text-white mb-1">{pack.name}</h3>
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{pack.description}</p>
      {pack.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {pack.tags.slice(0, 4).map((tag) => (
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
        onClick={() => onInstall(pack)}
        className="w-full border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
      >
        <Download size={14} className="mr-2" />
        Install Pack
      </Button>
    </div>
  );
}

export default function Packs() {
  const [, setLocation] = useLocation();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filteredPacks, setFilteredPacks] = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [applyProjectId, setApplyProjectId] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadPacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ ok: boolean; packs: Pack[] }>("/api/packs?limit=50");
      const list = data.packs ?? [];
      setPacks(list);
      setFilteredPacks(list);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load packs", error instanceof Error ? error.message : "Unknown error");
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
    void loadPacks();
  }, [loadPacks]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredPacks(packs);
      return;
    }
    const q = search.toLowerCase();
    setFilteredPacks(
      packs.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    );
  }, [search, packs]);

  const handleInstall = async () => {
    if (!selectedPack || !applyProjectId) return;
    setIsInstalling(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        installed: { actionName: string; templateName: string }[];
        skipped: { actionName: string; reason: string }[];
      }>(`/api/packs/${selectedPack.id}/install`, {
        method: "POST",
        body: { projectId: applyProjectId },
      });
      const installed = res.installed?.length ?? 0;
      const skipped = res.skipped?.length ?? 0;
      showSuccessToast(
        "Pack installed",
        `${installed} templates added${skipped > 0 ? `, ${skipped} skipped` : ""}`
      );
      setDrawerOpen(false);
      setSelectedPack(null);
      setApplyProjectId(projects[0]?.id ?? "");
      setLocation(`/app/projects/${applyProjectId}`);
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

  const openInstallDrawer = (pack: Pack) => {
    setSelectedPack(pack);
    setApplyProjectId(projects[0]?.id ?? "");
    setDrawerOpen(true);
  };

  return (
    <AppShell
      title="Starter Packs"
      subtitle="Install groups of templates, agents, and workflows at once"
      backHref="/app/dashboard"
      backLabel="Back"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Starter Packs" },
      ]}
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search packs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] pl-9 pr-4 text-sm text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void loadPacks()}
            disabled={isLoading}
            className="border-[rgba(255,255,255,0.12)] text-white"
          >
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 animate-pulse"
              />
            ))}
          </div>
        ) : filteredPacks.length === 0 ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
            <Package size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No packs found</p>
            <p className="mt-1 text-sm text-gray-500">
              Run <code className="text-gray-500">pnpm exec tsx scripts/seed-packs.ts</code> to create starter packs
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPacks.map((pack) => (
              <PackCard key={pack.id} pack={pack} onInstall={openInstallDrawer} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">Install Pack</DialogTitle>
          </DialogHeader>
          {selectedPack && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Install &quot;{selectedPack.name}&quot; ({selectedPack.templateCount} templates) into a project.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
                <Select value={applyProjectId} onValueChange={setApplyProjectId}>
                  <SelectTrigger className="bg-[#050607] border-[rgba(255,255,255,0.12)] text-white">
                    <SelectValue placeholder="Select project" />
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
              {projects.length === 0 && (
                <p className="text-xs text-gray-500">Create a project first to install packs.</p>
              )}
              <Button
                onClick={handleInstall}
                disabled={isInstalling || !applyProjectId}
                className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
              >
                {isInstalling ? "Installing..." : "Install Pack"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
