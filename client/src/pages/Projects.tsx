import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Folder,
  Clock,
  AlertCircle,
  RefreshCw,
  Activity,
  KeyRound,
  Settings,
  Play,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@/hooks/useForm";
import { validateProjectForm, getFieldError, hasFieldError } from "@/lib/validation";
import Modal from "@/components/Modal";
import { showErrorToast, showProjectCreatedToast } from "@/lib/toast";
import { API_BASE_URL, ApiError, apiRequest } from "@/lib/api";
import { useLocation } from "wouter";
import AppShell from "@/components/app/AppShell";

interface ProjectFormData {
  name: string;
  description: string;
  model: string;
}

interface Project {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  model: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type ProjectsApiResponse = { ok?: boolean; projects?: unknown[] } | unknown[];
type ProjectCardLike = Project & { _id?: string };

function normalizeObjectId(input: unknown): string {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const maybeOid = (input as { $oid?: unknown }).$oid;
    if (typeof maybeOid === "string") return maybeOid;
  }
  return "";
}

function normalizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const id = normalizeObjectId(obj.id ?? obj._id);
  if (!id) return null;

  const ownerUserId = normalizeObjectId(obj.ownerUserId);
  const name = typeof obj.name === "string" ? obj.name : "";
  const description = typeof obj.description === "string" ? obj.description : "";
  const model = typeof obj.model === "string" ? obj.model : "";
  const status = typeof obj.status === "string" ? obj.status : "active";
  const createdAt =
    typeof obj.createdAt === "string"
      ? obj.createdAt
      : obj.createdAt instanceof Date
        ? obj.createdAt.toISOString()
        : "";
  const updatedAt =
    typeof obj.updatedAt === "string"
      ? obj.updatedAt
      : obj.updatedAt instanceof Date
        ? obj.updatedAt.toISOString()
        : createdAt;

  return {
    id,
    ownerUserId,
    name,
    description,
    model,
    status,
    createdAt,
    updatedAt,
  };
}

function formatDateSafe(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function ProjectCard({
  project,
  onOpen,
  onRun,
  onKeys,
  onUsage,
  onSettings,
}: {
  project: ProjectCardLike;
  onOpen: (projectId: string) => void;
  onRun: (projectId: string) => void;
  onKeys: (projectId: string) => void;
  onUsage: (projectId: string) => void;
  onSettings: (projectId: string) => void;
}) {
  const name = project.name || "Untitled";
  const status = (project.status || "active").toLowerCase();
  const description = project.description || "No description provided.";
  const createdAt = project.createdAt || new Date().toISOString();
  const updatedAt = project.updatedAt || createdAt;
  const projectId = project.id || project._id || "";
  const apiCallsToday = Math.floor((name.length * 1234) % 20000) + 120;
  const creditsUsed = Math.floor((description.length * 245) % 9000) + 90;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, a, [data-no-nav='true']")) return;
        onOpen(projectId);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(projectId);
        }
      }}
      className="card-hover group relative cursor-pointer overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(192,192,192,0.13),transparent_40%)]" />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#c0c0c0]/10 p-3">
              <Folder size={20} className="text-[#c0c0c0]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{name}</h3>
              <p className="mt-0.5 text-xs text-gray-500">Model: {project.model || "-"}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              status === "running" || status === "active"
                ? "bg-emerald-500/20 text-emerald-300"
                : status === "paused"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-500/20 text-slate-300"
            }`}
          >
            {status === "active" ? "Running" : status === "paused" ? "Paused" : "Draft"}
          </span>
        </div>

        <p className="mb-4 text-sm text-gray-400">{description}</p>

        <div className="grid grid-cols-2 gap-3 border-t border-[rgba(255,255,255,0.06)] pt-4">
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/70 p-3">
            <p className="text-[11px] text-gray-500">API Calls Today</p>
            <p className="mt-1 text-sm font-semibold text-white">{apiCallsToday.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/70 p-3">
            <p className="text-[11px] text-gray-500">Credits Used</p>
            <p className="mt-1 text-sm font-semibold text-white">{creditsUsed.toLocaleString()}</p>
          </div>
          <div className="col-span-2 flex items-center gap-2 text-xs text-gray-400">
            <Clock size={13} />
            Last activity {formatDateSafe(updatedAt)} • Created {formatDateSafe(createdAt)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button data-no-nav="true" onClick={() => onRun(projectId)} className="ripple-btn rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]/75 p-2 text-gray-200 hover:text-white">
            <Play size={14} className="mx-auto" />
          </button>
          <button data-no-nav="true" onClick={() => onKeys(projectId)} className="ripple-btn rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]/75 p-2 text-gray-200 hover:text-white">
            <KeyRound size={14} className="mx-auto" />
          </button>
          <button data-no-nav="true" onClick={() => onUsage(projectId)} className="ripple-btn rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]/75 p-2 text-gray-200 hover:text-white">
            <Activity size={14} className="mx-auto" />
          </button>
          <button data-no-nav="true" onClick={() => onSettings(projectId)} className="ripple-btn rounded-md border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]/75 p-2 text-gray-200 hover:text-white">
            <Settings size={14} className="mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const isDev = import.meta.env.DEV;
  const [lastProjectsStatus, setLastProjectsStatus] = useState<number | null>(null);
  const [lastProjectsLength, setLastProjectsLength] = useState(0);
  const loadRequestIdRef = useRef(0);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const name = (project.name || "").toLowerCase();
      const description = (project.description || "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [projects, searchQuery]);

  const parseProjectsPayload = (data: ProjectsApiResponse): Project[] => {
    if (Array.isArray(data)) {
      return data.map(normalizeProject).filter((project): project is Project => Boolean(project));
    }

    if (data && typeof data === "object" && "projects" in data) {
      const fromKey = (data as { projects?: unknown }).projects;
      if (!Array.isArray(fromKey)) {
        throw new Error("Invalid projects response shape");
      }
      return fromKey
        .map(normalizeProject)
        .filter((project): project is Project => Boolean(project));
    }

    throw new Error("Invalid projects response payload");
  };

  const loadProjects = useCallback(async (): Promise<Project[]> => {
    const requestId = ++loadRequestIdRef.current;
    try {
      const data = await apiRequest<ProjectsApiResponse>("/api/projects");
      const nextProjects = parseProjectsPayload(data);

      if (requestId === loadRequestIdRef.current) {
        setProjects(nextProjects);
        setLastProjectsStatus(200);
        setLastProjectsLength(nextProjects.length);
      }
      return nextProjects;
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null;
      if (requestId === loadRequestIdRef.current) {
        setLastProjectsStatus(status);
      }

      if (status === 401) {
        showErrorToast("Session expired", "Please login again");
        window.location.href = "/login";
        return [];
      }

      const message = error instanceof Error ? error.message : "Failed to load projects";
      showErrorToast("Unable to load projects", message);
      return [];
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const form = useForm<ProjectFormData>({
    initialValues: {
      name: "",
      description: "",
      model: "ALEXZA",
    },
    validate: validateProjectForm,
    onSubmit: async (values) => {
      try {
        const response = await apiRequest<{ ok?: boolean; project?: unknown } | unknown>(
          "/api/projects",
          {
            method: "POST",
            body: {
              name: values.name,
              description: values.description,
              model: values.model,
            },
          }
        );

        const createdProject = normalizeProject(
          typeof response === "object" && response !== null && "project" in response
            ? (response as { project?: unknown }).project
            : response
        );
        if (!createdProject) throw new Error("Invalid create project response");

        await loadProjects();
        showProjectCreatedToast(values.name);
        setShowCreateModal(false);
        form.reset();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          window.location.href = "/login";
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to create project";
        showErrorToast("Project creation failed", message);
      }
    },
  });

  return (
    <>
      <AppShell
        title="Projects"
        subtitle="Design, deploy and monitor AI workflows"
        backHref="/app/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: "Dashboard", href: "/app/dashboard" },
          { label: "Projects" },
        ]}
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2"
          >
            <Plus size={18} /> New Project
          </Button>
        }
      >
        {isDev && (
          <div className="rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#0b0e12]/95 px-3 py-2 text-xs text-gray-300">
            <div>API: <span className="text-white">{API_BASE_URL}</span></div>
            <div>/api/projects: <span className="text-white">{lastProjectsStatus ?? "-"}</span></div>
            <div>length: <span className="text-white">{lastProjectsLength}</span></div>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
              />
            </div>
            {isDev && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDebugOpen((prev) => !prev)}
                className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                Debug
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadProjects()}
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <RefreshCw size={14} className="mr-2" />
              Reload Projects
            </Button>
          </div>

          {isDev && debugOpen && (
            <div className="rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.08)] p-4 space-y-2 text-sm text-gray-300">
              <p>API Base URL: <span className="text-white">{API_BASE_URL || "(same-origin)"}</span></p>
              <p>Last status: <span className="text-white">{lastProjectsStatus ?? "-"}</span></p>
              <p>Last projects length: <span className="text-white">{lastProjectsLength}</span></p>
            </div>
          )}

          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="skeleton-shimmer h-52 rounded-xl border border-[rgba(255,255,255,0.06)]" />
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 min-h-[120px]">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={(project as ProjectCardLike)._id ?? project.id}
                  project={project as ProjectCardLike}
                  onOpen={(projectId) => projectId && setLocation(`/app/projects/${projectId}`)}
                  onRun={(projectId) => projectId && setLocation(`/app/projects/${projectId}/playground`)}
                  onKeys={(projectId) => projectId && setLocation(`/app/projects/${projectId}/keys`)}
                  onUsage={() => setLocation("/app/usage")}
                  onSettings={() => setLocation("/app/settings")}
                />
              ))}
            </div>
          )}

          {!isLoading && projects.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(192,192,192,0.12)]">
                  <Sparkles className="text-[#c0c0c0]" />
                </div>
                <p className="text-xl font-semibold text-white">Create your first AI workflow</p>
                <p className="mt-2 text-sm text-gray-500">
                  No project found. Start by creating a project to orchestrate your models and APIs.
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold"
                >
                  <Plus size={16} className="mr-2" />
                  Create Project
                </Button>
              </div>
            </div>
          )}

          {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No projects match your search</p>
            </div>
          )}
        </div>
      </AppShell>

      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create Project"
        description="Start building your next AI solution"
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={form.isSubmitting}
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={form.isSubmitting}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => form.handleSubmit(e as never)}
            >
              {form.isSubmitting ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Project Name</label>
            <input
              type="text"
              name="name"
              value={form.values.name}
              onChange={form.handleChange}
              placeholder="My AI Project"
              disabled={form.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg bg-[#050607] border transition text-white placeholder-gray-600 focus:outline-none ${
                hasFieldError(form.errors, "name")
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
              } disabled:opacity-50`}
            />
            {hasFieldError(form.errors, "name") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "name")}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description (Optional)</label>
            <textarea
              name="description"
              value={form.values.description}
              onChange={form.handleChange}
              placeholder="What is this project for?"
              disabled={form.isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition resize-none h-20 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">AI Model</label>
            <select
              name="model"
              value={form.values.model}
              onChange={form.handleChange}
              disabled={form.isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition disabled:opacity-50"
            >
              <option>ALEXZA</option>
            </select>
          </div>
        </form>
      </Modal>
    </>
  );
}
