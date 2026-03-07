import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Plus, Play, Trash2, Zap, Webhook, Bot, Send, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { API_BASE_URL } from "@/lib/api";

interface Workflow {
  id: string;
  name: string;
  workspaceId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: string;
  type: "trigger" | "action" | "output";
  order: number;
  config: Record<string, unknown>;
}

function getTriggerLabel(config: Record<string, unknown>): string {
  const kind = config.kind as string;
  if (kind === "webhook") return "Webhook";
  if (kind === "api_event") return `Event: ${(config.event as string) || "?"}`;
  if (kind === "schedule") return `Schedule: ${(config.cron as string) || "?"}`;
  return "Trigger";
}

function getActionLabel(config: Record<string, unknown>): string {
  const kind = config.kind as string;
  if (kind === "run_ai_action") return `AI: ${(config.actionName as string) || "?"}`;
  if (kind === "call_webhook") return "Call Webhook";
  return "Action";
}

function getOutputLabel(config: Record<string, unknown>): string {
  const kind = config.kind as string;
  if (kind === "send_webhook") return "Send Webhook";
  if (kind === "log_result") return "Log Result";
  return "Output";
}

export default function Workflows() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/workflows/:id?");
  const workflowId = params?.id ?? null;
  const { workspaces, currentWorkspace } = useWorkspace();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createWorkspaceId, setCreateWorkspaceId] = useState("");
  const [detail, setDetail] = useState<{ workflow: Workflow; steps: WorkflowStep[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean; workflows: Workflow[] }>("/api/workflows");
      setWorkflows(res.workflows ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      showErrorToast("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    if (workflowId) {
      setDetailLoading(true);
      apiRequest<{ ok: boolean; workflow: Workflow; steps: WorkflowStep[] }>(`/api/workflows/${workflowId}`)
        .then((res) => {
          setDetail({ workflow: res.workflow, steps: res.steps ?? [] });
        })
        .catch(() => {
          showErrorToast("Failed to load workflow");
          setDetail(null);
        })
        .finally(() => setDetailLoading(false));
    } else {
      setDetail(null);
    }
  }, [workflowId]);

  const handleCreate = async () => {
    const wsId = createWorkspaceId || currentWorkspace?.id;
    if (!wsId) {
      showErrorToast("Select a workspace");
      return;
    }
    try {
      const res = await apiRequest<{ ok: boolean; workflow: Workflow }>("/api/workflows", {
        method: "POST",
        body: { name: createName || "New Workflow", workspaceId: wsId },
      });
      showSuccessToast("Workflow created");
      setCreateOpen(false);
      setCreateName("");
      setCreateWorkspaceId("");
      void loadWorkflows();
      if (res.workflow?.id) setLocation(`/app/workflows/${res.workflow.id}`);
    } catch (e) {
      showErrorToast("Failed to create workflow");
    }
  };

  const handleExecute = async () => {
    if (!workflowId) return;
    setExecuting(true);
    try {
      const res = await apiRequest<{ ok: boolean; data: Record<string, unknown> }>(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        body: { triggerPayload: {} },
      });
      showSuccessToast("Workflow executed");
      console.log("Execution result:", res.data);
    } catch (e) {
      showErrorToast(e instanceof ApiError ? e.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const triggerUrl = workflowId
    ? `${API_BASE_URL || window.location.origin}/api/workflows/trigger/${workflowId}`
    : "";

  return (
    <AppShell
      title="Automation Builder"
      subtitle="Create workflows connecting triggers, AI actions, and outputs"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Workflows" },
      ]}
    >
      <div className="flex gap-6">
        <aside className="w-64 shrink-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Workflows</h3>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-1">
              {workflows.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setLocation(`/app/workflows/${w.id}`)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition flex items-center gap-2 ${
                    workflowId === w.id
                      ? "bg-accent/20 text-foreground border border-accent/40"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Zap size={14} />
                  <span className="truncate">{w.name}</span>
                  {w.enabled && (
                    <Badge variant="default" className="ml-auto text-[10px] px-1">
                      On
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {!workflowId ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              <Zap size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a workflow or create one to get started.</p>
            </div>
          ) : detailLoading ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{detail.workflow.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {detail.steps.length} step{detail.steps.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        apiRequest(`/api/workflows/${workflowId}`, {
                          method: "PATCH",
                          body: { enabled: !detail.workflow.enabled },
                        }).then(() => {
                          setDetail((d) => (d ? { ...d, workflow: { ...d.workflow, enabled: !d.workflow.enabled } } : null));
                          showSuccessToast(detail.workflow.enabled ? "Workflow disabled" : "Workflow enabled");
                        });
                      }}
                    >
                      {detail.workflow.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" onClick={handleExecute} disabled={executing}>
                      <Play size={14} className="mr-1" />
                      {executing ? "Running…" : "Run"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Steps</h3>
                <div className="space-y-2">
                  {detail.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step, i) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                      >
                        <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                        {step.type === "trigger" && <Webhook size={16} className="text-amber-500" />}
                        {step.type === "action" && <Bot size={16} className="text-blue-500" />}
                        {step.type === "output" && <Send size={16} className="text-green-500" />}
                        <span className="text-sm font-medium">
                          {step.type === "trigger" && getTriggerLabel(step.config)}
                          {step.type === "action" && getActionLabel(step.config)}
                          {step.type === "output" && getOutputLabel(step.config)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {step.type}
                        </Badge>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation(`/app/workflows/${workflowId}/edit`)}
                >
                  <Plus size={14} className="mr-2" />
                  Add Step
                </Button>
              </div>

              {(detail.steps.some((s) => s.type === "trigger") || detail.steps.length === 0) && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-2">Webhook Trigger URL</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    POST to this URL to trigger the workflow. No authentication required.
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={triggerUrl}
                      className="flex-1 rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(triggerUrl);
                        showSuccessToast("URL copied");
                      }}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
          <div
            className="rounded-xl border border-border bg-card p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create Workflow</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My Workflow"
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Workspace</label>
                <select
                  value={createWorkspaceId || currentWorkspace?.id}
                  onChange={(e) => setCreateWorkspaceId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
