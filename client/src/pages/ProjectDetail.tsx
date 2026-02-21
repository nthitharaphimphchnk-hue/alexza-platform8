import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiKeys from "@/pages/ApiKeys";
import UsageSummaryPanel from "@/components/usage/UsageSummaryPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import { ArrowLeft, AlertCircle, Pencil, Play, Trash2, Copy, Terminal, PlayCircle, MessageSquare, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ApiError, apiRequest, API_BASE_URL } from "@/lib/api";
import { listActions, deleteAction, runAction } from "@/lib/alexzaApi";
import { generateSamplePayload, validatePayloadLight } from "@/lib/payloadFromSchema";
import type { PublicAction } from "@/lib/alexzaApi";
import { showErrorToast, showProjectDeletedToast, showSuccessToast, showCopyToClipboardToast } from "@/lib/toast";

type RoutingMode = "cheap" | "balanced" | "quality";

interface ProjectDetailData {
  id: string;
  name: string;
  description: string;
  model: string;
  status: "active" | "paused";
  routingMode: RoutingMode;
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
  const [actions, setActions] = useState<PublicAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testAction, setTestAction] = useState<PublicAction | null>(null);
  const [testPayload, setTestPayload] = useState('{"input": "Hello"}');
  const [testApiKey, setTestApiKey] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    output: string;
    requestId?: string;
    creditsCharged?: number;
    latencyMs?: number;
    usage?: unknown;
  } | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [deleteActionName, setDeleteActionName] = useState<string | null>(null);
  const [isDeletingAction, setIsDeletingAction] = useState(false);
  const [routingModeSaving, setRoutingModeSaving] = useState(false);

  const projectId = useMemo(() => {
    const match = location.match(/^\/app\/projects\/([^/]+)(?:\/|$)/);
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
      const rm = raw.routingMode;
      const routingMode: RoutingMode =
        rm === "cheap" || rm === "balanced" || rm === "quality" ? rm : "quality";
      setProject({
        id: String(raw.id ?? ""),
        name: typeof raw.name === "string" ? raw.name : "Untitled",
        description: typeof raw.description === "string" ? raw.description : "",
        model: typeof raw.model === "string" ? raw.model : "",
        status: raw.status === "paused" ? "paused" : "active",
        routingMode,
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

  const loadActions = useCallback(async () => {
    if (!projectId) return;
    setActionsLoading(true);
    setActionsError(null);
    try {
      const list = await listActions(projectId);
      setActions(list);
      if (process.env.NODE_ENV === "development") {
        console.log("[UI] fetchActions projectId=", projectId, "status=ok count=", list.length);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      setActions([]);
      setActionsError("Failed to load actions");
      if (process.env.NODE_ENV === "development") {
        console.log("[UI] fetchActions projectId=", projectId, "status=error");
      }
    } finally {
      setActionsLoading(false);
    }
  }, [projectId, setLocation]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const tab = params.get("tab");
    if (tab === "keys" || tab === "actions" || tab === "overview" || tab === "usage") {
      setActiveTab(tab);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && activeTab === "actions") void loadActions();
  }, [projectId, activeTab, loadActions]);

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

  const copyEndpoint = (actionName: string) => {
    const url = `${API_BASE_URL}/v1/projects/${projectId}/run/${encodeURIComponent(actionName)}`;
    navigator.clipboard.writeText(url);
    showCopyToClipboardToast();
  };

  const copySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    showCopyToClipboardToast();
  };

  const handleDeleteAction = async () => {
    if (!projectId || !deleteActionName) return;
    setIsDeletingAction(true);
    try {
      await deleteAction(projectId, deleteActionName);
      showSuccessToast("Action deleted", deleteActionName);
      setDeleteActionName(null);
      void loadActions();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      showErrorToast("Failed to delete action");
    } finally {
      setIsDeletingAction(false);
    }
  };

  const openTestModal = (action: PublicAction) => {
    setTestAction(action);
    setTestPayload(generateSamplePayload(action.inputSchema));
    setTestApiKey("");
    setTestResult(null);
    setValidateError(null);
    setShowTestModal(true);
  };

  const handleValidatePayload = () => {
    const result = validatePayloadLight(testPayload);
    if (result.valid) {
      setValidateError(null);
      showSuccessToast("Payload is valid");
    } else {
      setValidateError(result.error);
      showErrorToast(result.error);
    }
  };

  const handleTestRun = async () => {
    if (!projectId || !testAction || !testApiKey.trim()) {
      showErrorToast("Enter your API key to test");
      return;
    }
    const validation = validatePayloadLight(testPayload);
    if (!validation.valid) {
      setValidateError(validation.error);
      showErrorToast(validation.error);
      return;
    }
    setValidateError(null);
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await runAction(projectId, testAction.actionName, validation.payload, testApiKey.trim());
      setTestResult({
        output: res.output,
        requestId: res.requestId,
        creditsCharged: res.usage?.creditsCharged,
        latencyMs: res.latencyMs,
        usage: res.usage,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        showErrorToast("Invalid API key");
        return;
      }
      showErrorToast("Test failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setTestRunning(false);
    }
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
    <div className="min-h-screen text-foreground">
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
              onClick={() => {
                if (!project) return;
                setLocation(`/app/projects/${project.id}/ai`);
              }}
              disabled={!project || isLoading}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black disabled:opacity-50"
            >
              <MessageSquare size={16} className="mr-2" />
              Open ChatBuilder
            </Button>
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
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="actions">Actions / APIs</TabsTrigger>
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
                      <p className="text-xs text-gray-500">Runtime</p>
                      <p className="text-white mt-1">ALEXZA Managed Runtime</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Routing Mode</p>
                      <select
                        value={project.routingMode ?? "quality"}
                        onChange={async (e) => {
                          const mode = e.target.value as RoutingMode;
                          if (!projectId || routingModeSaving) return;
                          setRoutingModeSaving(true);
                          try {
                            await apiRequest<{ ok: true; project: Record<string, unknown> }>(
                              `/api/projects/${projectId}/settings`,
                              { method: "PATCH", body: { routingMode: mode } }
                            );
                            setProject((p) => (p ? { ...p, routingMode: mode } : p));
                            showSuccessToast("Routing mode updated");
                          } catch (err) {
                            showErrorToast("Failed to update routing mode");
                          } finally {
                            setRoutingModeSaving(false);
                          }
                        }}
                        disabled={routingModeSaving}
                        className="mt-1 w-full max-w-xs px-3 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
                      >
                        <option value="quality">Quality (Best results)</option>
                        <option value="balanced">Balanced (Cost / Quality)</option>
                        <option value="cheap">Cheap (Lowest cost)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Quality: Best models with fallback. Balanced: Mid-tier models. Cheap: Lowest cost, simpler models.
                      </p>
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

              <TabsContent value="usage">
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#050607] p-6">
                  <UsageSummaryPanel
                    projectId={project.id}
                    onUnauthorized={() => {
                      setLocation("/login");
                    }}
                    onProjectNotFound={() => {
                      setLocation("/app/projects");
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="actions">
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#050607] p-6 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400">Actions / APIs</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Actions are created in Chat Builder and called via the runtime endpoint.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadActions()}
                      disabled={actionsLoading}
                      className="border-[rgba(255,255,255,0.12)] text-gray-400 hover:bg-[rgba(255,255,255,0.06)] shrink-0"
                    >
                      <RefreshCw size={14} className={`mr-1 ${actionsLoading ? "animate-spin" : ""}`} />
                      {actionsLoading ? "Loading..." : "Reload"}
                    </Button>
                  </div>
                  {actionsError ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
                      <p className="text-sm text-amber-200">{actionsError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadActions()}
                        className="border-amber-300/50 text-amber-100 hover:bg-amber-500/15"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : actionsLoading && actions.length === 0 ? (
                    <p className="text-gray-500">Loading actions...</p>
                  ) : actions.length === 0 ? (
                    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-8 text-center space-y-4">
                      <p className="text-gray-400">No actions yet.</p>
                      <Button
                        onClick={() => setLocation(`/app/projects/${project.id}/ai`)}
                        className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
                      >
                        Create Action in ChatBuilder
                      </Button>
                      <p className="text-sm">
                        <button
                          type="button"
                          onClick={() => setLocation(`/app/projects/${project.id}/ai`)}
                          className="text-[#c0c0c0] hover:underline"
                        >
                          Open ChatBuilder
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {actions.map((action) => {
                        const endpoint = `POST ${API_BASE_URL}/v1/projects/${project.id}/run/${encodeURIComponent(action.actionName)}`;
                        const samplePayloadStr = generateSamplePayload(action.inputSchema);
                        const curlSnippet = `curl -X POST "${API_BASE_URL}/v1/projects/${project.id}/run/${encodeURIComponent(action.actionName)}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '${samplePayloadStr.replace(/'/g, "'\\''")}'`;
                        const jsBody = samplePayloadStr.replace(/\n/g, " ").replace(/\s+/g, " ");
                        const jsSnippet = `const res = await fetch("${API_BASE_URL}/v1/projects/${project.id}/run/${encodeURIComponent(action.actionName)}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  },
  body: JSON.stringify(${jsBody})
});
const data = await res.json();`;
                        return (
                          <div
                            key={action.id}
                            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-mono text-white font-medium">{action.actionName}</p>
                                <p className="text-xs text-gray-500 mt-1">{action.description || "-"}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Updated: {formatDate(action.updatedAt)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                                  onClick={() => openTestModal(action)}
                                >
                                  <PlayCircle size={14} className="mr-1" /> Test
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                                  onClick={() => copyEndpoint(action.actionName)}
                                >
                                  <Copy size={14} className="mr-1" /> Copy endpoint
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                  onClick={() => setDeleteActionName(action.actionName)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 font-medium">Endpoint</p>
                              <code className="block text-xs text-gray-300 bg-[#050607] p-2 rounded font-mono break-all">
                                {endpoint}
                              </code>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[rgba(255,255,255,0.12)] text-gray-400 hover:bg-[rgba(255,255,255,0.06)]"
                                  onClick={() => copySnippet(curlSnippet)}
                                >
                                  <Terminal size={12} className="mr-1" /> cURL
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[rgba(255,255,255,0.12)] text-gray-400 hover:bg-[rgba(255,255,255,0.06)]"
                                  onClick={() => copySnippet(jsSnippet)}
                                >
                                  <Copy size={12} className="mr-1" /> JS fetch
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!actionsError && actions.length > 0 && (
                    <p className="text-sm">
                      <button
                        type="button"
                        onClick={() => setLocation(`/app/projects/${project.id}/ai`)}
                        className="text-[#c0c0c0] hover:underline"
                      >
                        Open ChatBuilder
                      </button>
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteActionName}
        onOpenChange={(open) => {
          if (!open) setDeleteActionName(null);
        }}
        title="Delete Action"
        description={`Delete action "${deleteActionName}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeletingAction}
        onConfirm={handleDeleteAction}
      />

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
        open={showTestModal}
        onOpenChange={(open) => {
          setShowTestModal(open);
          if (!open) {
            setTestAction(null);
            setTestResult(null);
          }
        }}
        title={testAction ? `Test: ${testAction.actionName}` : "Test Action"}
        description="Run the action with a JSON payload. Use an API key from this project."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowTestModal(false)}
              disabled={testRunning}
              className="border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.08)]"
            >
              Close
            </Button>
            <Button
              onClick={handleTestRun}
              disabled={testRunning || !testApiKey.trim()}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black disabled:opacity-50"
            >
              {testRunning ? "Running..." : "Run"}
            </Button>
          </>
        }
      >
        {testAction && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">API Key</label>
              <input
                type="password"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                placeholder="Paste your project API key"
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">JSON Payload</label>
              <div className="flex gap-2">
                <textarea
                  value={testPayload}
                  onChange={(e) => {
                    setTestPayload(e.target.value);
                    setValidateError(null);
                  }}
                  rows={6}
                  className="flex-1 px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
                  placeholder='{"input": {"text": "Hello"}}'
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidatePayload}
                  className="border-[rgba(255,255,255,0.12)] text-gray-400 hover:bg-[rgba(255,255,255,0.06)] self-start shrink-0"
                >
                  Validate
                </Button>
              </div>
              {validateError && (
                <p className="text-xs text-amber-400">{validateError}</p>
              )}
            </div>
            {testResult && (
              <div className="space-y-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-medium text-gray-400">Output</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    {testResult.requestId && <span>Request ID: {testResult.requestId}</span>}
                    {testResult.creditsCharged != null && <span>Credits: {testResult.creditsCharged}</span>}
                    {testResult.latencyMs != null && <span>Latency: {testResult.latencyMs} ms</span>}
                  </div>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words font-mono">
                  {testResult.output}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

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
