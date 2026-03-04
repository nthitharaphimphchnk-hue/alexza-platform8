import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function WorkspaceInviteAccept() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<{ workspaceName: string; role: string; invitedBy: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") ?? "";
    setToken(t);
  }, []);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{
        ok: boolean;
        workspaceName: string;
        role: string;
        invitedBy: string;
        email: string;
      }>(`/api/workspaces/invites/${token}`);
      setInvite({
        workspaceName: res?.workspaceName ?? "Workspace",
        role: res?.role ?? "developer",
        invitedBy: res?.invitedBy ?? "",
        email: res?.email ?? "",
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setInvite(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      const res = await apiRequest<{ ok: boolean; workspaceId: string }>(`/api/workspaces/invites/${token}/accept`, {
        method: "POST",
      });
      setAccepted(true);
      showSuccessToast("You've joined the workspace");
      setTimeout(() => {
        setLocation("/app/workspaces");
      }, 1500);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          const next = encodeURIComponent(`/app/workspaces/invite?token=${token}`);
          window.location.href = `/login?next=${next}`;
          return;
        }
        if (e.status === 403 && (e as ApiError & { code?: string }).code === "EMAIL_MISMATCH") {
          showErrorToast("Invite was sent to a different email. Please log in with that account.");
          return;
        }
      }
      showErrorToast("Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  if (!token) {
    return (
      <AppShell
        title="Invalid invite"
        subtitle="No invite token provided"
        backHref="/app/dashboard"
        breadcrumbs={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Invite" }]}
      >
        <p className="text-gray-400">This invite link is invalid. Please request a new invite.</p>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell
        title="Loading invite..."
        backHref="/app/dashboard"
        breadcrumbs={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Invite" }]}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#c0c0c0]" />
        </div>
      </AppShell>
    );
  }

  if (!invite) {
    return (
      <AppShell
        title="Invite expired"
        subtitle="This invite is no longer valid"
        backHref="/app/dashboard"
        breadcrumbs={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Invite" }]}
      >
        <p className="text-gray-400">This invite has expired or was already used. Please request a new invite.</p>
      </AppShell>
    );
  }

  if (accepted) {
    return (
      <AppShell
        title="Welcome!"
        subtitle="You've joined the workspace"
        backHref="/app/workspaces"
        breadcrumbs={[{ label: "Workspaces", href: "/app/workspaces" }]}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <CheckCircle size={48} className="text-green-500 mb-4" />
          <p className="text-gray-300">Redirecting to workspaces...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Invite to ${invite.workspaceName}`}
      subtitle={`You've been invited as ${invite.role}`}
      backHref="/app/dashboard"
      breadcrumbs={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Invite" }]}
    >
      <div className="mx-auto max-w-md rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
        <p className="text-gray-300">
          <strong>{invite.invitedBy || "Someone"}</strong> invited you to join <strong>{invite.workspaceName}</strong> as{" "}
          <strong>{invite.role}</strong>.
        </p>
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="mt-6 w-full bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
        >
          {isAccepting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          Accept invite
        </Button>
      </div>
    </AppShell>
  );
}
