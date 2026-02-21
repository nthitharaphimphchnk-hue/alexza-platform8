import { Button } from "@/components/ui/button";
import {
  Bell,
  Home,
  MessageSquare,
  Settings,
  Zap,
  Send,
  Plus,
  Copy,
  Code,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { itemVariants } from "@/lib/animations";
import { useLocation } from "wouter";
import { ApiError } from "@/lib/api";
import { getProjects, createThread, listThreads, listMessages, sendMessage, listActions, applyAction, getFriendlyMessage } from "@/lib/alexzaApi";
import type { Project, PublicProposedAction } from "@/lib/alexzaApi";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ProposedAction {
  actionName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  instruction?: string;
}

interface SavedAction {
  id: string;
  actionName: string;
  description: string;
}

function stripProviderFields(a: PublicProposedAction): ProposedAction {
  const { provider, model, gateway, ...rest } = a as PublicProposedAction & Record<string, unknown>;
  return rest as ProposedAction;
}

export default function ChatBuilder() {
  const [location, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [proposedActions, setProposedActions] = useState<ProposedAction[]>([]);
  const [savedActions, setSavedActions] = useState<SavedAction[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isApplying, setIsApplying] = useState<string | null>(null);

  const projectId = useMemo(() => {
    const match = location.match(/^\/app\/projects\/([^/]+)\/ai/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [location]);

  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
    } catch {
      setProjects([]);
    }
  }, []);

  const loadThreads = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await listThreads(projectId);
      setThreads(list);
      if (list.length && !threadId) {
        setThreadId(list[0].id);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      showErrorToast("Failed to load threads");
    }
  }, [projectId, threadId, setLocation]);

  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    try {
      const list = await listMessages(threadId);
      setMessages(list);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      showErrorToast("Failed to load messages");
    }
  }, [threadId, setLocation]);

  const loadActions = useCallback(async () => {
    if (!projectId) return;
    try {
      const list = await listActions(projectId);
      setSavedActions(list.map((a) => ({ id: a.id, actionName: a.actionName, description: a.description })));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
    }
  }, [projectId, setLocation]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    void loadMessages();
    setProposedActions([]);
  }, [loadMessages]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const handleNewThread = async () => {
    if (!projectId) return;
    try {
      const thread = await createThread(projectId);
      setThreadId(thread.id);
      setMessages([]);
      setProposedActions([]);
      void loadThreads();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      showErrorToast("Failed to create thread");
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !threadId || !projectId || isSending) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() },
    ]);
    setIsSending(true);
    setProposedActions([]);

    try {
      const { message, proposedActions: acts } = await sendMessage(threadId, content);
      setMessages((prev) => [
        ...prev,
        {
          id: message.id || `a-${Date.now()}`,
          role: "assistant",
          content: message.content,
          createdAt: message.createdAt || new Date().toISOString(),
        },
      ]);
      if (acts?.length) {
        setProposedActions(acts.map(stripProviderFields));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      showErrorToast("Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  const handleApply = async (action: ProposedAction) => {
    if (!projectId || isApplying) return;
    setIsApplying(action.actionName);
    try {
      await applyAction(projectId, {
        actionName: action.actionName,
        description: action.description,
        inputSchema: action.inputSchema,
        outputSchema: action.outputSchema,
        promptTemplate: action.instruction || `User: {{input}}`,
      });
      showSuccessToast("Action saved", `${action.actionName} applied`);
      setProposedActions((prev) => prev.filter((a) => a.actionName !== action.actionName));
      void loadActions();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setLocation("/login");
        return;
      }
      showErrorToast("Failed to apply action", getFriendlyMessage(e));
    } finally {
      setIsApplying(null);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <p>Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground flex">
      <aside className="w-64 bg-[#0b0e12] border-r border-[rgba(255,255,255,0.06)] p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c0c0c0] to-[#a8a8a8] flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-bold text-white">ALEXZA</span>
        </div>

        <nav className="space-y-2 flex-1">
          <a
            href="/app/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition"
          >
            <Home size={20} />
            <span className="text-sm font-medium">Dashboard</span>
          </a>
          <a
            href={`/app/projects/${projectId}/ai`}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#c0c0c0] text-black transition"
          >
            <MessageSquare size={20} />
            <span className="text-sm font-medium">Chat Builder</span>
          </a>
          <a
            href={`/app/projects/${projectId}`}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition"
          >
            <Zap size={20} />
            <span className="text-sm font-medium">Project</span>
          </a>
          <a
            href="/app/settings"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition"
          >
            <Settings size={20} />
            <span className="text-sm font-medium">Settings</span>
          </a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="border-b border-[rgba(255,255,255,0.06)] bg-[#050607]/80 backdrop-blur-md px-8 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Chat Builder</h1>
            <select
              value={projectId}
              onChange={(e) => {
                const id = e.target.value;
                if (id) setLocation(`/app/projects/${id}/ai`);
              }}
              className="bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-white min-w-[180px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id}
                </option>
              ))}
              {projects.length === 0 && <option value={projectId}>{projectId || "Select project"}</option>}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              onClick={handleNewThread}
            >
              <Plus size={16} className="mr-1" /> New chat
            </Button>
          </div>
          <button className="p-2 rounded-lg hover:bg-[#0b0e12] transition">
            <Bell size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#050607]">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-8 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Chat Thread</h2>
                <p className="text-xs text-gray-400">
                  {threads.find((t) => t.id === threadId)?.title || "Select or create thread"}
                </p>
              </div>
              <div className="flex gap-2">
                {threads.length > 0 && (
                  <select
                    value={threadId || ""}
                    onChange={(e) => setThreadId(e.target.value || null)}
                    className="bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {threads.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-6">
              {messages.length === 0 && !threadId && (
                <p className="text-gray-500 text-center py-8">Create a thread to start.</p>
              )}
              {messages.length === 0 && threadId && (
                <p className="text-gray-500 text-center py-8">
                  สวัสดีครับ ผมคือ Builder AI ช่วยออกแบบ API Actions ให้คุณได้ บอกความต้องการของคุณได้เลย
                </p>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={`max-w-md px-6 py-3 rounded-lg whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#c0c0c0] text-black rounded-br-none"
                        : "bg-[#0b0e12] text-gray-300 border border-[rgba(255,255,255,0.06)] rounded-bl-none"
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </motion.div>
                </motion.div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="px-6 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
                    <Loader2 size={20} className="animate-spin text-[#c0c0c0]" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.06)] px-8 py-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="พิมพ์ข้อความ..."
                  disabled={!threadId || isSending}
                  className="flex-1 bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c0c0c0] transition disabled:opacity-50"
                />
                <Button
                  onClick={handleSend}
                  disabled={!threadId || isSending || !input.trim()}
                  className="p-3 rounded-lg bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black transition disabled:opacity-50"
                >
                  <Send size={20} />
                </Button>
              </div>
            </div>
          </div>

          <div className="w-96 flex flex-col border-l border-[rgba(255,255,255,0.06)] bg-[#0b0e12]">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">API Actions</h2>
              <Code size={18} className="text-gray-400" />
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {proposedActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Proposed (จาก AI)</p>
                  {proposedActions.map((action) => (
                    <motion.div
                      key={action.actionName}
                      className="p-4 rounded-lg bg-gradient-to-br from-[#c0c0c0]/20 to-[#a8a8a8]/20 border border-[#c0c0c0]"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <code className="text-xs text-[#c0c0c0] font-mono">{action.actionName}</code>
                          <p className="text-xs text-gray-400 mt-1">{action.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleApply(action)}
                          disabled={isApplying === action.actionName}
                          className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black text-xs"
                        >
                          {isApplying === action.actionName ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Plus size={14} className="mr-1" /> Apply
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {savedActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Saved Actions</p>
                  {savedActions.map((action) => (
                    <motion.div
                      key={action.id}
                      className="p-4 rounded-lg bg-gradient-to-br from-[#a8a8a8]/20 to-[#c0c0c0]/20 border border-[#a8a8a8]"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <code className="text-xs text-[#a8a8a8] font-mono">{action.actionName}</code>
                          <p className="text-xs text-gray-400 mt-1">{action.description}</p>
                        </div>
                        <button
                          className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `POST /v1/projects/${projectId}/run/${action.actionName}`
                            );
                            showSuccessToast("Copied endpoint");
                          }}
                        >
                          <Copy size={14} className="text-gray-400" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        POST /v1/projects/{projectId}/run/{action.actionName}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {proposedActions.length === 0 && savedActions.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  คุยกับ AI เพื่อสร้าง API Actions แล้วกด Apply เพื่อบันทึก
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
