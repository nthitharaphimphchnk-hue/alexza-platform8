import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Building2, Plus, Settings, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "wouter";

export default function Workspaces() {
  const [, setLocation] = useLocation();
  const { workspaces, currentWorkspace, setCurrentWorkspace, refetch } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (name.length < 2) {
      setError("Workspace name must be at least 2 characters");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: boolean; workspace: { id: string; name: string } }>("/api/workspaces", {
        method: "POST",
        body: { name },
      });
      showSuccessToast("Workspace created");
      setNewName("");
      await refetch();
      if (res?.workspace) {
        setCurrentWorkspace({
          id: res.workspace.id,
          name: res.workspace.name,
          ownerUserId: "",
          role: "owner",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to create workspace", e instanceof Error ? e.message : "Unknown error");
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setIsCreating(false);
    }
  }, [newName, refetch, setCurrentWorkspace]);

  return (
    <AppShell
      title="Workspaces"
      subtitle="Manage your teams and projects"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Workspaces" },
      ]}
      actions={
        <Button
          onClick={() => setLocation("/app/playground")}
          variant="outline"
          className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
        >
          Open Playground
        </Button>
      }
    >
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">Create workspace</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Workspace name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[rgba(192,192,192,0.4)] focus:outline-none"
          />
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
          >
            <Plus size={16} className="mr-2" />
            Create
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">Your workspaces</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className={`card-hover rounded-xl border p-5 transition-all ${
                currentWorkspace?.id === ws.id
                  ? "border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.08)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[rgba(192,192,192,0.15)] p-2">
                    <Building2 size={20} className="text-[#c0c0c0]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{ws.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{ws.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation(`/app/workspaces/${ws.id}/members`)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Users size={16} />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setLocation("/app/projects");
                  }}
                  className="border-[rgba(255,255,255,0.08)] text-gray-300 hover:bg-[rgba(255,255,255,0.06)]"
                >
                  Use workspace
                </Button>
                {ws.role === "owner" || ws.role === "admin" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/app/workspaces/${ws.id}/members`)}
                    className="border-[rgba(255,255,255,0.08)] text-gray-300 hover:bg-[rgba(255,255,255,0.06)]"
                  >
                    <Settings size={14} className="mr-1" />
                    Members
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {workspaces.length === 0 && (
          <p className="py-8 text-center text-gray-400">No workspaces yet. Create one above.</p>
        )}
      </section>
    </AppShell>
  );
}
