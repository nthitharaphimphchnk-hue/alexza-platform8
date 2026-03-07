import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest, getSamlLoginUrl } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Shield, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface SamlConfig {
  samlEntryPoint: string;
  samlIssuer: string;
  samlCertificate: string;
}

export default function SettingsSso() {
  const [, setLocation] = useLocation();
  const { workspaces, currentWorkspace } = useWorkspace();
  const [config, setConfig] = useState<SamlConfig>({
    samlEntryPoint: "",
    samlIssuer: "",
    samlCertificate: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  const workspacesWithManage = workspaces.filter((w) => w.role === "owner" || w.role === "admin");
  const selectedWorkspace = workspaceId
    ? workspacesWithManage.find((w) => w.id === workspaceId)
    : workspacesWithManage[0] ?? currentWorkspace;

  useEffect(() => {
    if (selectedWorkspace) {
      setWorkspaceId(selectedWorkspace.id);
    }
  }, [selectedWorkspace?.id]);

  useEffect(() => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ ok: boolean; saml: SamlConfig }>(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/saml`
        );
        if (cancelled) return;
        setConfig(res.saml ?? { samlEntryPoint: "", samlIssuer: "", samlCertificate: "" });
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          setConfig({ samlEntryPoint: "", samlIssuer: "", samlCertificate: "" });
        } else if (error instanceof ApiError && error.status === 401) {
          window.location.href = "/login";
        } else {
          showErrorToast("Failed to load SAML config");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setIsSaving(true);
    try {
      await apiRequest(`/api/workspaces/${encodeURIComponent(workspaceId)}/saml`, {
        method: "PATCH",
        body: config,
      });
      showSuccessToast("SAML configuration saved");
    } catch (error) {
      showErrorToast("Failed to save", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  const loginUrl = workspaceId && config.samlEntryPoint && config.samlIssuer && config.samlCertificate
    ? getSamlLoginUrl(workspaceId)
    : "";

  const copyLoginUrl = () => {
    if (loginUrl) {
      navigator.clipboard.writeText(loginUrl);
      showSuccessToast("Login URL copied to clipboard");
    }
  };

  return (
    <AppShell
      title="Enterprise SSO"
      subtitle="SAML 2.0 configuration for Okta, Azure AD, Google Workspace"
      backHref="/app/settings"
      backLabel="Back to Settings"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Settings", href: "/app/settings" },
        { label: "SSO" },
      ]}
    >
      <div className="space-y-6 max-w-2xl">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Shield size={18} />
            SAML Configuration
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your identity provider (IdP) to enable SSO for this workspace. Only workspace owners and admins can manage SSO.
          </p>

          {workspacesWithManage.length > 1 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-foreground">Workspace</label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground"
              >
                {workspacesWithManage.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {workspacesWithManage.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              You need owner or admin access to a workspace to configure SSO.
            </p>
          ) : isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">SAML Entry Point (IdP SSO URL)</label>
                <input
                  type="url"
                  value={config.samlEntryPoint}
                  onChange={(e) => setConfig((c) => ({ ...c, samlEntryPoint: e.target.value }))}
                  placeholder="https://idp.example.com/sso"
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Issuer (Entity ID)</label>
                <input
                  type="text"
                  value={config.samlIssuer}
                  onChange={(e) => setConfig((c) => ({ ...c, samlIssuer: e.target.value }))}
                  placeholder="https://app.alexza.ai/saml"
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">IdP Certificate (X.509 PEM)</label>
                <textarea
                  value={config.samlCertificate}
                  onChange={(e) => setConfig((c) => ({ ...c, samlCertificate: e.target.value }))}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Paste the IdP&apos;s public certificate for response signature validation.
                </p>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground hover:opacity-90">
                {isSaving ? "Saving…" : "Save Configuration"}
              </Button>
            </div>
          )}
        </div>

        {loginUrl && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">SSO Login URL</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this link with your organization. Users will be redirected to your IdP to sign in.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                readOnly
                value={loginUrl}
                className="flex-1 rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm text-foreground"
              />
              <Button variant="outline" size="icon" onClick={copyLoginUrl} title="Copy">
                <Copy size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(loginUrl, "_blank")}
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
