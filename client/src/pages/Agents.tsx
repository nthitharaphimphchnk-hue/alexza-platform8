import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { ApiError, apiRequest } from "@/lib/api";
import { getProjects, listActions } from "@/lib/alexzaApi";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Bot, Plus, Play, Trash2, Zap, GitBranch, Webhook } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useTranslation } from "react-i18next";

type AgentTool = { type: "action"; projectId: string; actionName: string; label?: string } | { type: "workflow"; workflowId: string; label?: string } | { type: "webhook"; url: string; method?: string; label?: string };

interface Agent {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  tools: AgentTool[];
  memoryEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface Workflow {
  id: string;
  name: string;
}

function getToolLabel(t: AgentTool): string {
  if (t.type === "action") return t.label ?? `${t.actionName} (${t.projectId})`;
  if (t.type === "workflow") return t.label ?? t.workflowId;
  if (t.type === "webhook") return t.label ?? t.url;
  return "?";
}

export default function Agents() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/agents/:id?");
  const agentId = params?.id ?? null;
  const { workspaces, currentWorkspace } = useWorkspace();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createWorkspaceId, setCreateWorkspaceId] = useState("");
  const [createTools, setCreateTools] = useState<AgentTool[]>([]);
  const [createMemory, setCreateMemory] = useState(false);
  const [detail, setDetail] = useState<Agent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean; agents: Agent[] }>("/api/agents");
      setAgents(res.agents ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      showErrorToast("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list.map((p) => ({ id: p.id, name: p.name || p.id })));
    } catch {
      setProjects([]);
    }
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await apiRequest<{ ok: boolean; workflows: Workflow[] }>("/api/workflows");
      setWorkflows(res.workflows ?? []);
    } catch {
      setWorkflows([]);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    void loadProjects();
    void loadWorkflows();
  }, [loadProjects, loadWorkflows]);

  useEffect(() => {
    if (agentId) {
      setDetailLoading(true);
      apiRequest<{ ok: boolean; agent: Agent }>(`/api/agents/${agentId}`)
        .then((res) => setDetail(res.agent))
        .catch(() => {
          showErrorToast("Failed to load agent");
          setDetail(null);
        })
        .finally(() => setDetailLoading(false));
    } else {
      setDetail(null);
    }
  }, [agentId]);

  const handleCreate = async () => {
    const wsId = createWorkspaceId || currentWorkspace?.id;
    if (!wsId) {
      showErrorToast(t("agents.selectWorkspace"));
      return;
    }
    if (!createName.trim()) {
      showErrorToast(t("agents.nameRequired"));
      return;
    }
    try {
      const res = await apiRequest<{ ok: boolean; agent: Agent }>("/api/agents", {
        method: "POST",
        body: {
          name: createName.trim(),
          description: createDesc.trim(),
          workspaceId: wsId,
          tools: createTools,
          memoryEnabled: createMemory,
        },
      });
      showSuccessToast(t("agents.created"));
      setCreateOpen(false);
      setCreateName("");
      setCreateDesc("");
      setCreateWorkspaceId("");
      setCreateTools([]);
      setCreateMemory(false);
      void loadAgents();
      if (res.agent?.id) setLocation(`/app/agents/${res.agent.id}`);
    } catch (e) {
      showErrorToast(e instanceof ApiError ? e.message : "Failed to create agent");
    }
  };

  const handleRun = async () => {
    if (!agentId || !runInput.trim()) return;
    setRunning(true);
    setRunOutput("");
    try {
      const res = await apiRequest<{ ok: boolean; output: string; toolUsed?: string }>("/api/agents/run", {
        method: "POST",
        body: { agentId, input: runInput.trim(), sessionId: agentId },
      });
      setRunOutput(res.output ?? "");
      if (res.toolUsed) showSuccessToast(t("agents.ranWithTool", { tool: res.toolUsed }));
    } catch (e) {
      showErrorToast(e instanceof ApiError ? e.message : "Run failed");
      setRunOutput(`Error: ${e instanceof ApiError ? e.message : "Unknown error"}`);
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!agentId) return;
    if (!window.confirm(t("agents.confirmDelete"))) return;
    try {
      await apiRequest(`/api/agents/${agentId}`, { method: "DELETE" });
      showSuccessToast(t("agents.deleted"));
      setLocation("/app/agents");
      void loadAgents();
    } catch (e) {
      showErrorToast("Failed to delete agent");
    }
  };

  const addTool = (type: "action" | "workflow" | "webhook") => {
    if (type === "action") setCreateTools((t) => [...t, { type: "action", projectId: projects[0]?.id ?? "", actionName: "" }]);
    else if (type === "workflow") setCreateTools((t) => [...t, { type: "workflow", workflowId: workflows[0]?.id ?? "" }]);
    else setCreateTools((t) => [...t, { type: "webhook", url: "", method: "POST" }]);
  };

  const updateTool = (idx: number, upd: Partial<AgentTool>) => {
    setCreateTools((t) => {
      const next = [...t];
      const cur = next[idx];
      if (!cur) return t;
      next[idx] = { ...cur, ...upd } as AgentTool;
      return next;
    });
  };

  const removeTool = (idx: number) => setCreateTools((t) => t.filter((_, i) => i !== idx));

  return (
    <AppShell
      title={t("agents.title")}
      subtitle={t("agents.subtitle")}
      backHref="/app/dashboard"
      backLabel={t("common.back")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: t("navigation.agents") },
      ]}
    >
      <div className="flex gap-6">
        <aside className="w-64 shrink-0 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">{t("agents.agents")}</h3>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="border-[rgba(255,255,255,0.12)] text-white">
              <Plus size={14} />
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-1">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setLocation(`/app/agents/${a.id}`)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition flex items-center gap-2 ${
                    agentId === a.id ? "bg-[rgba(192,192,192,0.12)] text-white border border-[rgba(192,192,192,0.3)]" : "text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                  }`}
                >
                  <Bot size={14} />
                  <span className="truncate">{a.name}</span>
                  {a.memoryEnabled && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1 bg-[rgba(192,192,192,0.2)]">
                      Mem
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {!agentId ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center text-gray-400">
              <Bot size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t("agents.selectOrCreate")}</p>
            </div>
          ) : detailLoading ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-12 text-center text-gray-400">
              Loading...
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{detail.name}</h2>
                    {detail.description && <p className="text-sm text-gray-400 mt-1">{detail.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {detail.memoryEnabled && <Badge className="bg-[rgba(192,192,192,0.2)] text-[#c0c0c0]">Memory</Badge>}
                      <span className="text-xs text-gray-500">{detail.tools.length} tools</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDelete} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
                <h3 className="font-semibold text-white mb-4">{t("agents.tools")}</h3>
                <div className="space-y-2">
                  {detail.tools.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607] px-4 py-3">
                      {t.type === "action" && <Zap size={16} className="text-amber-500" />}
                      {t.type === "workflow" && <GitBranch size={16} className="text-blue-500" />}
                      {t.type === "webhook" && <Webhook size={16} className="text-green-500" />}
                      <span className="text-sm text-gray-300">{getToolLabel(t)}</span>
                      <span className="text-xs text-gray-500 capitalize">({t.type})</span>
                    </div>
                  ))}
                  {detail.tools.length === 0 && <p className="text-sm text-gray-500">{t("agents.noTools")}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
                <h3 className="font-semibold text-white mb-4">{t("agents.run")}</h3>
                <div className="space-y-3">
                  <textarea
                    placeholder={t("agents.inputPlaceholder")}
                    value={runInput}
                    onChange={(e) => setRunInput(e.target.value)}
                    className="w-full h-24 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 py-3 text-sm text-white placeholder:text-gray-500 resize-none"
                  />
                  <Button onClick={handleRun} disabled={running || !runInput.trim()} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
                    <Play size={14} className="mr-2" />
                    {running ? t("agents.running") : t("agents.run")}
                  </Button>
                  {runOutput && (
                    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
                      <p className="text-xs text-gray-500 mb-2">{t("agents.output")}</p>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{runOutput}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{t("agents.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">{t("agents.name")}</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="My Agent"
                className="mt-1 w-full h-10 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">{t("agents.description")}</label>
              <input
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Optional description"
                className="mt-1 w-full h-10 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-4 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">{t("agents.workspace")}</label>
              <Select value={(createWorkspaceId || currentWorkspace?.id) ?? ""} onValueChange={setCreateWorkspaceId}>
                <SelectTrigger className="mt-2 w-full border-[rgba(255,255,255,0.12)] bg-[#050607] text-white">
                  <SelectValue placeholder={t("agents.selectWorkspace")} />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">{t("agents.memory")}</label>
              <Switch checked={createMemory} onCheckedChange={setCreateMemory} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-400">{t("agents.tools")}</label>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => addTool("action")} className="text-xs border-[rgba(255,255,255,0.12)]">
                    + Action
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addTool("workflow")} className="text-xs border-[rgba(255,255,255,0.12)]">
                    + Workflow
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addTool("webhook")} className="text-xs border-[rgba(255,255,255,0.12)]">
                    + Webhook
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {createTools.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center rounded-lg border border-[rgba(255,255,255,0.06)] p-2">
                    {t.type === "action" && (
                      <>
                        <Select value={t.projectId} onValueChange={(v) => updateTool(i, { projectId: v })}>
                          <SelectTrigger className="flex-1 h-8 border-[rgba(255,255,255,0.08)] text-xs">
                            <SelectValue placeholder="Project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ActionSelect projectId={t.projectId} value={t.actionName} onChange={(v) => updateTool(i, { actionName: v })} />
                      </>
                    )}
                    {t.type === "workflow" && (
                      <Select value={t.workflowId} onValueChange={(v) => updateTool(i, { workflowId: v })}>
                        <SelectTrigger className="flex-1 h-8 border-[rgba(255,255,255,0.08)] text-xs">
                          <SelectValue placeholder="Workflow" />
                        </SelectTrigger>
                        <SelectContent>
                          {workflows.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {t.type === "webhook" && (
                      <input
                        value={t.url}
                        onChange={(e) => updateTool(i, { url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 h-8 rounded border border-[rgba(255,255,255,0.08)] bg-[#050607] px-2 text-xs text-white"
                      />
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeTool(i)} className="text-red-400 h-8 w-8 p-0">
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1 border-[rgba(255,255,255,0.12)] text-white">
                {t("common.cancel")}
              </Button>
              <Button onClick={() => void handleCreate()} className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
                {t("agents.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ActionSelect({ projectId, value, onChange }: { projectId: string; value: string; onChange: (v: string) => void }) {
  const [actions, setActions] = useState<{ actionName: string }[]>([]);
  useEffect(() => {
    if (!projectId) {
      setActions([]);
      return;
    }
    listActions(projectId)
      .then((a) => setActions(a.map((x) => ({ actionName: x.actionName }))))
      .catch(() => setActions([]));
  }, [projectId]);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="flex-1 h-8 border-[rgba(255,255,255,0.08)] text-xs min-w-[120px]">
        <SelectValue placeholder="Action" />
      </SelectTrigger>
      <SelectContent>
        {actions.map((a) => (
          <SelectItem key={a.actionName} value={a.actionName}>
            {a.actionName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
