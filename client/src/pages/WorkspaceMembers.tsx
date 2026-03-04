import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Loader2, Mail, Plus, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

interface Member {
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

export default function WorkspaceMembers() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/workspaces/:id/members");
  const workspaceId = params?.id ?? "";
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("developer");
  const [isInviting, setIsInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [wsRes, membersRes] = await Promise.all([
        apiRequest<{ ok: boolean; workspace: { name: string } }>(`/api/workspaces/${workspaceId}`),
        apiRequest<{ ok: boolean; members: Member[] }>(`/api/workspaces/${workspaceId}/members`),
      ]);
      setWorkspaceName(wsRes?.workspace?.name ?? "Workspace");
      setMembers(membersRes?.members ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setIsInviting(true);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        body: { email, role: inviteRole },
      });
      showSuccessToast("Invite sent");
      setInviteEmail("");
      await load();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) showErrorToast("User already a member or invite pending");
        else showErrorToast(e.message);
      } else {
        showErrorToast("Failed to send invite");
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/members/${userId}/role`, {
        method: "PATCH",
        body: { role: newRole },
      });
      showSuccessToast("Role updated");
      await load();
    } catch (e) {
      showErrorToast("Failed to update role");
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm("Remove this member from the workspace?")) return;
    setRemoving(userId);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
      });
      showSuccessToast("Member removed");
      await load();
    } catch (e) {
      showErrorToast("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <AppShell
      title={`Members - ${workspaceName}`}
      subtitle="Invite and manage workspace members"
      backHref="/app/workspaces"
      backLabel="Back to Workspaces"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Workspaces", href: "/app/workspaces" },
        { label: workspaceName },
        { label: "Members" },
      ]}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#c0c0c0]" />
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Invite by email</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white placeholder:text-gray-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white"
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button
                onClick={handleInvite}
                disabled={isInviting}
                className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
              >
                <Plus size={16} className="mr-2" />
                Invite
              </Button>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Members</h3>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 overflow-hidden">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-4 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[rgba(192,192,192,0.2)] p-2">
                      {m.email ? <Mail size={16} className="text-[#c0c0c0]" /> : <User size={16} className="text-[#c0c0c0]" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.name || m.email || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "owner" ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-[rgba(192,192,192,0.2)] text-[#c0c0c0]">
                        Owner
                      </span>
                    ) : (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.userId, e.target.value)}
                          disabled={changingRole === m.userId}
                          className="rounded border border-[rgba(255,255,255,0.08)] bg-[#050607] px-2 py-1 text-xs text-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="developer">Developer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(m.userId)}
                          disabled={removing === m.userId}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
