import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiKeys from "@/pages/ApiKeys";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import { ArrowLeft, AlertCircle, Pencil, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showProjectDeletedToast, showSuccessToast } from "@/lib/toast";

interface ProjectDetailData {
  id: string;
  name: string;
  description: string;
  model: string;
  status: "active" | "paused";
  createdAt: string;
  updatedAt: string;
}

export default function ProjectDetail() {
  const [location, setLocation] = useLocation();
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");

  const projectId = useMemo(() => {
    const match = location.match(/^\/app\/projects\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [location]);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setLocation("/app/projects");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest<{ ok: true; project: Record<string, unknown> }>(
        `/api/projects/${projectId}`
      );

      const raw = response.project || {};
      setProject({
        id: String(raw.id ?? ""),
        name: typeof raw.name === "string" ? raw.name : "Untitled",
        description: typeof raw.description === "string" ? raw.description : "",
        model: typeof raw.model === "string" ? raw.model : "",
        status: raw.status === "paused" ? "paused" : "active",
        createdAt: String(raw.createdAt ?? ""),
        updatedAt: String(raw.updatedAt ?? ""),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setLocation("/login");
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        showErrorToast("Project not found or no access");
        setLocation("/app/projects");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load project";
      showErrorToast("Unable to load project", message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setLocation]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const canDelete = Boolean(
    project && deleteConfirmName.trim() === (project.name || "").trim()
  );
  const canSaveEdit = editName.trim().length >= 2 && !isSavingEdit;

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!canDelete) {
      showErrorToast("Confirmation failed", "Project name does not match.");
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest<{ ok: true }>(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      showProjectDeletedToast(project.name);
      setShowDeleteConfirm(false);
      setDeleteConfirmName("");
      setLocation("/app/projects");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setLocation("/login");
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        showErrorToast("Project not found or no access");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to delete project";
      showErrorToast("Unable to delete project", message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditModel(project.model || "");
    setEditStatus(project.status === "paused" ? "paused" : "active");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!project) return;
    if (editName.trim().length < 2) return;

    setIsSavingEdit(true);
    try {
      await apiRequest<{ ok: true; project: Record<string, unknown> }>(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: {
          name: editName.trim(),
          description: editDescription,
          model: editModel,
          status: editStatus,
        },
      });

      showSuccessToast(`Project "${editName.trim()}" updated`);
      setShowEditModal(false);
      await loadProject();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setLocation("/login");
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        showErrorToast("Project not found or no access");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to update project";
      showErrorToast("Unable to update project", message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/app/projects")}
              className="border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{project?.name || "Project Detail"}</h1>
              <p className="text-gray-400 mt-1">{project?.description || "Loading project..."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (!project) return;
                setLocation(`/app/projects/${project.id}/playground`);
              }}
              disabled={!project || isLoading}
              className="border-[rgba(255,255,255,0.16)] text-white hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-50"
            >
              <Play size={16} className="mr-2" />
              Playground
            </Button>
            <Button
              variant="outline"
              onClick={openEditModal}
              disabled={!project || isLoading}
              className="border-[rgba(255,255,255,0.16)] text-white hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-50"
            >
              <Pencil size={16} className="mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!project || isLoading}
              className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
            >
              <Trash2 size={16} className="mr-2" />
              Delete Project
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {isLoading && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6">
              <p className="text-gray-400">Loading project...</p>
            </div>
          )}

          {!isLoading && !project && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-400" />
              <p className="text-red-300">Project data is unavailable.</p>
            </div>
          )}

          {!isLoading && project && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-[#0b0e12] border border-[rgba(255,255,255,0.08)]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="keys">API Keys</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400">Project Information</h3>
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-white mt-1">{project.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="text-white mt-1">{project.description || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Model</p>
                      <p className="text-white mt-1">{project.model || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-white mt-1 capitalize">{project.status || "active"}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400">Timestamps</h3>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-white mt-1">{formatDate(project.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Updated</p>
                      <p className="text-white mt-1">{formatDate(project.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Project ID</p>
                      <p className="text-white mt-1 font-mono text-sm break-all">{project.id}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="keys">
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#050607] p-6">
                  <ApiKeys projectId={project.id} embedded />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setDeleteConfirmName("");
        }}
        title="Delete Project"
        description={
          project
            ? `Type "${project.name}" to confirm deletion.`
            : "Type project name to confirm deletion."
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        confirmDisabled={!canDelete}
        onConfirm={handleDeleteProject}
      >
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Project Name</label>
          <input
            type="text"
            value={deleteConfirmName}
            onChange={(event) => setDeleteConfirmName(event.target.value)}
            placeholder={project?.name || ""}
            className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
          />
        </div>
      </ConfirmDialog>

      <Modal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title="Edit Project"
        description="Update your project details"
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSavingEdit}
              onClick={() => setShowEditModal(false)}
              className="border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.08)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={!canSaveEdit}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black disabled:opacity-50"
            >
              {isSavingEdit ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
            />
            {editName.trim().length > 0 && editName.trim().length < 2 && (
              <p className="text-xs text-red-400">Name must be at least 2 characters.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Description</label>
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Model</label>
            <input
              type="text"
              value={editModel}
              onChange={(event) => setEditModel(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Status</label>
            <select
              value={editStatus}
              onChange={(event) => setEditStatus(event.target.value === "paused" ? "paused" : "active")}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
