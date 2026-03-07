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
import { FileText, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "summarize", label: "Summarize" },
  { value: "translate", label: "Translate" },
  { value: "extraction", label: "Extraction" },
  { value: "writing", label: "Writing" },
  { value: "support", label: "Support" },
  { value: "content", label: "Content" },
  { value: "marketing", label: "Marketing" },
  { value: "data_extraction", label: "Data Extraction" },
  { value: "productivity", label: "Productivity" },
  { value: "agents", label: "Agents" },
  { value: "other", label: "Other" },
];

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  promptTemplate: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function Templates() {
  const [, setLocation] = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [applyProjectId, setApplyProjectId] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("q", search);
      const data = await apiRequest<{ ok: boolean; templates: Template[] }>(
        `/api/templates?${params.toString()}`
      );
      setTemplates(data.templates ?? []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load templates", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [category, search]);

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list.map((p) => ({ id: p.id, name: p.name || p.id })));
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleApply = async () => {
    if (!selectedTemplate || !applyProjectId) return;
    setIsApplying(true);
    try {
      const res = await apiRequest<{ ok: boolean; action: { actionName: string; projectId: string } }>(
        `/api/templates/${selectedTemplate.id}/apply`,
        {
          method: "POST",
          body: { projectId: applyProjectId },
        }
      );
      showSuccessToast("Template applied", `Action "${res.action?.actionName}" created`);
      setDrawerOpen(false);
      setSelectedTemplate(null);
      setApplyProjectId("");
      setLocation(`/app/projects/${applyProjectId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = error instanceof ApiError ? error.message : "Apply failed";
      showErrorToast("Apply failed", msg);
    } finally {
      setIsApplying(false);
    }
  };

  const openApplyDrawer = (t: Template) => {
    setSelectedTemplate(t);
    setApplyProjectId(projects[0]?.id ?? "");
    setDrawerOpen(true);
  };

  return (
    <AppShell
      title="Templates"
      subtitle="Add high-quality Actions to your project"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Templates" },
      ]}
    >
      <div className="space-y-6">
        {/** Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadTemplates()}
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] pl-9 pr-4 text-sm text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[200px] border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value || "all"} value={c.value || "all"}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => void loadTemplates()}
            disabled={isLoading}
            className="border-[rgba(255,255,255,0.12)] text-white"
          >
            Search
          </Button>
        </div>

        {/** Template grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 animate-pulse"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No templates found</p>
            <p className="mt-1 text-sm text-gray-500">Try adjusting filters or run the seed script.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="group rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 hover:border-[rgba(192,192,192,0.3)] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="rounded-lg bg-[#c0c0c0]/10 p-2">
                    <Sparkles size={20} className="text-[#c0c0c0]" />
                  </div>
                  <span className="rounded-full border border-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs text-gray-400 capitalize">
                    {t.category}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1">{t.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">{t.description}</p>
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
                  onClick={() => openApplyDrawer(t)}
                  className="w-full border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
                >
                  Apply to Project
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/** Apply Drawer */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Apply to Project
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Template</p>
                <p className="font-medium text-white">{selectedTemplate.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Project</span>
                <Select value={applyProjectId} onValueChange={setApplyProjectId}>
                  <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 border-[rgba(255,255,255,0.12)] text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleApply()}
                  disabled={!applyProjectId || isApplying}
                  className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                >
                  {isApplying ? "Applying..." : "Apply"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
