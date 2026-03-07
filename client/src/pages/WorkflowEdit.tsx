import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";

interface WorkflowStep {
  id: string;
  type: "trigger" | "action" | "output";
  order: number;
  config: Record<string, unknown>;
}

const TRIGGER_KINDS = [
  { value: "webhook", label: "Webhook" },
  { value: "api_event", label: "API Event" },
  { value: "schedule", label: "Schedule" },
];

const ACTION_KINDS = [
  { value: "run_ai_action", label: "Run AI Action" },
  { value: "call_webhook", label: "Call Webhook" },
];

const OUTPUT_KINDS = [
  { value: "send_webhook", label: "Send Webhook" },
  { value: "log_result", label: "Log Result" },
];

const API_EVENTS = [
  "action.run.succeeded",
  "action.run.failed",
  "auth.user.created",
  "wallet.topup.succeeded",
  "wallet.low_balance",
];

export default function WorkflowEdit() {
  const [, params] = useRoute("/app/workflows/:id/edit");
  const [, setLocation] = useLocation();
  const workflowId = params?.id ?? "";
  const [workflow, setWorkflow] = useState<{ id: string; name: string } | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStepType, setAddStepType] = useState<"trigger" | "action" | "output" | null>(null);

  const load = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const [wfRes, projRes] = await Promise.all([
        apiRequest<{ ok: boolean; workflow: { id: string; name: string }; steps: WorkflowStep[] }>(
          `/api/workflows/${workflowId}`
        ),
        apiRequest<{ ok: boolean; projects: { id: string; name: string }[] }>("/api/projects"),
      ]);
      setWorkflow(wfRes.workflow);
      setSteps(wfRes.steps ?? []);
      setProjects(projRes.projects ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      showErrorToast("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addStep = async (type: "trigger" | "action" | "output", config: Record<string, unknown>) => {
    try {
      const order = steps.length;
      const res = await apiRequest<{ ok: boolean; step: WorkflowStep }>(`/api/workflows/${workflowId}/steps`, {
        method: "POST",
        body: { type, order, config },
      });
      setSteps((s) => [...s, res.step]);
      setAddStepType(null);
      showSuccessToast("Step added");
    } catch (e) {
      showErrorToast("Failed to add step");
    }
  };

  const removeStep = async (stepId: string) => {
    try {
      await apiRequest(`/api/workflows/${workflowId}/steps/${stepId}`, { method: "DELETE" });
      setSteps((s) => s.filter((st) => st.id !== stepId));
      showSuccessToast("Step removed");
    } catch (e) {
      showErrorToast("Failed to remove step");
    }
  };

  if (!workflowId) return null;

  return (
    <AppShell
      title={workflow?.name ?? "Edit Workflow"}
      subtitle="Add and configure steps"
      backHref={`/app/workflows/${workflowId}`}
      backLabel="Back to Workflow"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Workflows", href: "/app/workflows" },
        { label: workflow?.name ?? "Edit" },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Steps</h3>
              <div className="space-y-3">
                {steps
                  .sort((a, b) => a.order - b.order)
                  .map((step, i) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
                    >
                      <span className="text-sm">
                        {i + 1}. {step.type} – {JSON.stringify((step.config as { kind?: string }).kind ?? step.config)}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => removeStep(step.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
              </div>

              {addStepType ? (
                <div className="mt-4 p-4 rounded-lg border border-border bg-muted/20 space-y-4">
                  <h4 className="font-medium">Add {addStepType}</h4>
                  {addStepType === "trigger" && (
                    <TriggerForm
                      onAdd={(config) => addStep("trigger", config)}
                      onCancel={() => setAddStepType(null)}
                    />
                  )}
                  {addStepType === "action" && (
                    <ActionForm
                      projects={projects}
                      onAdd={(config) => addStep("action", config)}
                      onCancel={() => setAddStepType(null)}
                    />
                  )}
                  {addStepType === "output" && (
                    <OutputForm
                      onAdd={(config) => addStep("output", config)}
                      onCancel={() => setAddStepType(null)}
                    />
                  )}
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAddStepType("trigger")}>
                    <Plus size={14} className="mr-1" />
                    Trigger
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAddStepType("action")}>
                    <Plus size={14} className="mr-1" />
                    Action
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAddStepType("output")}>
                    <Plus size={14} className="mr-1" />
                    Output
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function TriggerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState("webhook");
  const [event, setEvent] = useState("action.run.succeeded");
  const [cron, setCron] = useState("0 * * * *");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "webhook") onAdd({ kind: "webhook" });
    else if (kind === "api_event") onAdd({ kind: "api_event", event });
    else if (kind === "schedule") onAdd({ kind: "schedule", cron });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm">Trigger type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
          {TRIGGER_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {kind === "api_event" && (
        <div>
          <label className="text-sm">Event</label>
          <select value={event} onChange={(e) => setEvent(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
            {API_EVENTS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      )}
      {kind === "schedule" && (
        <div>
          <label className="text-sm">Cron (e.g. 0 * * * * = hourly)</label>
          <input
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="0 * * * *"
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Add
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ActionForm({
  projects,
  onAdd,
  onCancel,
}: {
  projects: { id: string; name: string }[];
  onAdd: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState("run_ai_action");
  const [projectId, setProjectId] = useState("");
  const [actionName, setActionName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "run_ai_action") onAdd({ kind, projectId, actionName, input: {} });
    else onAdd({ kind, url, method: "POST" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm">Action type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
          {ACTION_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {kind === "run_ai_action" && (
        <>
          <div>
            <label className="text-sm">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm">Action name</label>
            <input
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              placeholder="summarize_text"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </>
      )}
      {kind === "call_webhook" && (
        <div>
          <label className="text-sm">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Add
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function OutputForm({
  onAdd,
  onCancel,
}: {
  onAdd: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState("send_webhook");
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "send_webhook") onAdd({ kind, url, method: "POST" });
    else onAdd({ kind, level: "info" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm">Output type</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
          {OUTPUT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {kind === "send_webhook" && (
        <div>
          <label className="text-sm">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Add
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
