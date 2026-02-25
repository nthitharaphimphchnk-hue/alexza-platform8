import AppShell from "@/components/app/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Bell, Building2, KeyRound, Lock, Shield, User, WalletCards, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type TabId = "profile" | "security" | "notifications" | "organization" | "plan" | "limits";

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "plan", label: "Plan", icon: WalletCards },
  { id: "limits", label: "API Limits", icon: KeyRound },
];

function ContentCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [confirmSignout, setConfirmSignout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadMe = async () => {
      try {
        const response = await apiRequest<{
          ok: boolean;
          user: { lowCreditsEmailSuppressed?: boolean };
        }>("/api/me");
        if (cancelled) return;
        setIsEmailNotificationsEnabled(!(response.user.lowCreditsEmailSuppressed ?? false));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          window.location.href = "/login";
        }
      }
    };
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <AppShell
        title="Settings"
        subtitle="Enterprise controls for user, organization and API governance"
        backHref="/app/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: "Dashboard", href: "/app/dashboard" },
          { label: "Settings" },
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-3">
            <div className="space-y-1">
              {tabs.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`ripple-btn flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      activeTab === item.id
                        ? "bg-[rgba(192,192,192,0.18)] text-white border border-[rgba(192,192,192,0.35)]"
                        : "text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
              <button className="ripple-btn mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-[rgba(255,255,255,0.06)] hover:text-white">
                <Webhook size={16} />
                Webhooks (Soon)
              </button>
            </div>
          </aside>

          <section className="space-y-4">
            {activeTab === "profile" && (
              <ContentCard title="Profile" description="Public profile and contact metadata">
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Full name" defaultValue="Alexza Admin" />
                  <input className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Email" defaultValue="alexza@workspace.ai" />
                </div>
                <Button className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]" onClick={() => showSuccessToast("Profile saved", "Your profile has been updated.")}>
                  Save Changes
                </Button>
              </ContentCard>
            )}

            {activeTab === "security" && (
              <ContentCard title="Security Controls" description="Protect your account and production keys">
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="password" className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Current password" />
                  <input type="password" className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="New password" />
                </div>
                <Button className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]" onClick={() => showSuccessToast("Security updated", "Password and policy changes saved.")}>
                  Save Security
                </Button>
              </ContentCard>
            )}

            {activeTab === "notifications" && (
              <ContentCard title="Notifications" description="Operational alerts and summary delivery">
                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2">
                    <span className="text-sm text-gray-300">Low credits email notifications</span>
                    <input
                      type="checkbox"
                      checked={isEmailNotificationsEnabled}
                      onChange={(event) => setIsEmailNotificationsEnabled(event.target.checked)}
                      className="accent-[#c0c0c0]"
                    />
                  </label>
                  {["Critical errors", "Budget alerts", "Daily digest", "Deployment events"].map((item) => (
                    <label key={item} className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2">
                      <span className="text-sm text-gray-300">{item}</span>
                      <input type="checkbox" defaultChecked className="accent-[#c0c0c0]" />
                    </label>
                  ))}
                </div>
                <Button
                  disabled={isSavingNotifications}
                  className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                  onClick={() => {
                    void (async () => {
                      setIsSavingNotifications(true);
                      try {
                        await apiRequest("/api/me", {
                          method: "PATCH",
                          body: { lowCreditsEmailSuppressed: !isEmailNotificationsEnabled },
                        });
                        showSuccessToast("Notification preferences saved");
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed to save settings";
                        showErrorToast("Unable to save", message);
                      } finally {
                        setIsSavingNotifications(false);
                      }
                    })();
                  }}
                >
                  Save Preferences
                </Button>
              </ContentCard>
            )}

            {activeTab === "organization" && (
              <ContentCard title="Organization" description="Company and workspace identity">
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Organization name" defaultValue="ALEXZA AI Labs" />
                  <input className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Owner email" defaultValue="ops@alexza.ai" />
                </div>
                <Button className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]" onClick={() => showSuccessToast("Organization updated")}>
                  Save Organization
                </Button>
              </ContentCard>
            )}

            {activeTab === "plan" && (
              <ContentCard title="Plan & Subscription" description="Plan policy and renewal visibility">
                <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
                  <p className="text-sm text-white">Current Plan: Professional</p>
                  <p className="mt-1 text-xs text-gray-500">Next renewal: Mar 01, 2026</p>
                </div>
                <Button className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]" onClick={() => setLocation("/app/billing/plans")}>
                  Manage Billing
                </Button>
              </ContentCard>
            )}

            {activeTab === "limits" && (
              <ContentCard title="API Limits" description="Rate controls and threshold enforcement">
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Requests per minute" defaultValue="3000" />
                  <input className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white" placeholder="Daily quota" defaultValue="250000" />
                </div>
                <Button className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]" onClick={() => showSuccessToast("API limits updated")}>
                  Save Limits
                </Button>
              </ContentCard>
            )}

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
                <Shield size={18} />
                Danger Zone
              </h3>
              <p className="mt-1 text-sm text-gray-400">Irreversible account operations.</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]" onClick={() => setConfirmSignout(true)}>
                  Sign Out
                </Button>
                <Button variant="outline" className="border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]" onClick={() => setConfirmDelete(true)}>
                  Delete Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </AppShell>

      <ConfirmDialog
        open={confirmSignout}
        onOpenChange={setConfirmSignout}
        title="Sign Out"
        description="Are you sure you want to sign out of this workspace?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={() => setLocation("/login")}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Account"
        description="This action permanently deletes your account and all associated project data."
        confirmText="Delete Account"
        cancelText="Cancel"
        isDangerous
        onConfirm={() => showSuccessToast("Delete flow initiated", "This is a mock confirmation in UI mode.")}
      />
    </>
  );
}
