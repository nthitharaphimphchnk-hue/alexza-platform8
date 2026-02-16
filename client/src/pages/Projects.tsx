import { Button } from "@/components/ui/button";

/**
 * ALEXZA AI Projects Page
 * Design: Monochrome metallic theme
 * - List and manage all projects
 * - Create project modal with validation + toast
 * - Delete project confirmation dialog + toast
 */
import { Plus, Search, Folder, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";
import { useForm } from "@/hooks/useForm";
import { validateProjectForm, getFieldError, hasFieldError } from "@/lib/validation";
import Modal from "@/components/Modal";
import { showErrorToast, showProjectCreatedToast } from "@/lib/toast";
import { API_BASE_URL, ApiError, apiRequest } from "@/lib/api";
import { useLocation } from "wouter";

/**
 * ALEXZA AI Projects Page
 * Design: Monochrome metallic theme
 * - List and manage all projects
 * - Create project modal with validation
 * - Delete project confirmation dialog
 */

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
}: {
  project: ProjectCardLike;
  onOpen: (projectId: string) => void;
}) {
  const name = project.name || "Untitled";
  const status = project.status || "active";
  const description = project.description || "";
  const createdAt = project.createdAt || new Date().toISOString();
  const updatedAt = project.updatedAt || createdAt;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, a, [data-no-nav='true']")) {
          return;
        }
        onOpen(project.id || project._id || "");
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(project.id || project._id || "");
        }
      }}
      className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[#c0c0c0]/10">
            <Folder size={20} className="text-[#c0c0c0]" />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-[#c0c0c0] transition">
              {name}
            </h3>
            <p className="text-xs text-gray-500 capitalize">{status}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-4">{description}</p>

      <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock size={14} />
            {formatDateSafe(createdAt)}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Updated: <span className="text-gray-300">{formatDateSafe(updatedAt)}</span>
        </div>
        <div className="text-xs text-gray-500">
          Model: <span className="text-gray-300">{project.model || "-"}</span>
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
    if (isDev) {
      console.log("[Projects] load start");
    }
    try {
      const data = await apiRequest<ProjectsApiResponse>("/api/projects");
      const nextProjects = parseProjectsPayload(data);

      if (requestId === loadRequestIdRef.current) {
        setProjects(nextProjects);
        setLastProjectsStatus(200);
        setLastProjectsLength(nextProjects.length);
      }

      if (isDev) {
        console.log("[Projects] load end:", {
          status: 200,
          length: nextProjects.length,
          first: nextProjects[0] ?? null,
        });
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
      if (isDev) {
        console.log("[Projects] load end:", { status: status ?? 0, length: "unchanged", first: null });
      }
      return [];
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isDev]);

  useEffect(() => {
    void (async () => {
      await loadProjects();
    })();
  }, []);

  const form = useForm<ProjectFormData>({
    initialValues: {
      name: "",
      description: "",
      model: "GPT-4",
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
        });

        console.log("[Projects] POST /api/projects response:", response);
        const createdProject = normalizeProject(
          typeof response === "object" && response !== null && "project" in response
            ? (response as { project?: unknown }).project
            : response
        );
        if (!createdProject) {
          throw new Error("Invalid create project response");
        }

        const refreshed = await loadProjects();
        if (isDev) {
          console.log("[Projects] create success:", {
            id: createdProject.id,
            name: createdProject.name,
            reloadedLength: refreshed.length,
          });
        }
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
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {isDev && (
        <div className="fixed top-4 right-4 z-50 rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#0b0e12]/95 px-3 py-2 text-xs text-gray-300 backdrop-blur">
          <div>
            API: <span className="text-white">{API_BASE_URL}</span>
          </div>
          <div>
            /api/projects: <span className="text-white">{lastProjectsStatus ?? "-"}</span>
          </div>
          <div>
            length: <span className="text-white">{lastProjectsLength}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto flex justify-between items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-gray-400 mt-2">Manage all your AI projects</p>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2"
            >
              <Plus size={18} /> New Project
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Search */}
          <motion.div className="flex items-center gap-3" variants={itemVariants}>
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
              onClick={() => {
                void loadProjects();
              }}
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <RefreshCw size={14} className="mr-2" />
              Reload Projects
            </Button>
          </motion.div>

          {isDev && debugOpen && (
            <motion.div
              className="rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.08)] p-4 space-y-3"
              variants={itemVariants}
            >
              <div className="space-y-3 text-sm text-gray-300">
                <p>
                  API Base URL: <span className="text-white">{API_BASE_URL || "(same-origin)"}</span>
                </p>
                <p>
                  Last /api/projects status:{" "}
                  <span className="text-white">{lastProjectsStatus ?? "-"}</span>
                </p>
                <p>
                  Last projects length: <span className="text-white">{lastProjectsLength}</span>
                </p>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="h-44 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] animate-pulse"
                />
              ))}
            </div>
          )}

          {!isLoading && (
            <>
              {isDev && (
                <div className="text-xs text-gray-400">
                  renderCount: {filteredProjects.length} | first: {filteredProjects[0]?.name || "-"}
                </div>
              )}

              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 min-h-[120px]">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={(project as ProjectCardLike)._id ?? project.id}
                    project={project as ProjectCardLike}
                    onOpen={(projectId) => {
                      if (!projectId) return;
                      setLocation(`/app/projects/${projectId}`);
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {!isLoading && projects.length === 0 && (
            <motion.div className="text-center py-12" variants={itemVariants}>
              <p className="text-gray-300 text-lg font-medium">No projects yet</p>
              <p className="text-gray-500 mt-2">Create your first project to get started.</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold"
              >
                <Plus size={16} className="mr-2" />
                Create Project
              </Button>
            </motion.div>
          )}

          {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
            <motion.div className="text-center py-12" variants={itemVariants}>
              <p className="text-gray-400">No projects match your search</p>
            </motion.div>
          )}

        </motion.div>
      </div>

      {/* Create Project Modal */}
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
              onClick={(e) => form.handleSubmit(e as any)}
            >
              {form.isSubmitting ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit} className="space-y-4">
          {/* Name */}
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

          {/* Description */}
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

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">AI Model</label>
            <select
              name="model"
              value={form.values.model}
              onChange={form.handleChange}
              disabled={form.isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition disabled:opacity-50"
            >
              <option>GPT-4</option>
              <option>GPT-3.5</option>
              <option>Claude 3</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
