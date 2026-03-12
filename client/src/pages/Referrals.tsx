import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  creditsEarned: number;
}

export default function Referrals() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean } & ReferralStats>("/api/referrals/me");
      if (!res.ok) {
        throw new Error("Failed to load referral stats");
      }
      setStats({
        referralCode: res.referralCode,
        totalReferrals: res.totalReferrals,
        creditsEarned: res.creditsEarned,
      });
    } catch (err) {
      showErrorToast(
        "Failed to load referrals",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const inviteLink =
    typeof window !== "undefined" && stats?.referralCode
      ? `${window.location.origin}/invite/${stats.referralCode}`
      : "";

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => showSuccessToast("Invite link copied"))
      .catch(() => showErrorToast("Failed to copy link"));
  };

  return (
    <AppShell
      title="Referral Program"
      subtitle="Invite friends and earn credits when they sign up."
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Referrals" },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Your invite link</h2>
          <p className="text-gray-300 text-sm">
            Share this link with friends or colleagues. When they sign up and create an account,
            you&apos;ll both receive bonus credits.
          </p>
          {inviteLink ? (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <code className="flex-1 text-xs text-gray-100 break-all rounded-lg bg-black/40 border border-[rgba(255,255,255,0.12)] px-3 py-2">
                {inviteLink}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                Copy link
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {isLoading ? "Loading..." : "No referral code available yet."}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Total referrals</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !stats ? "…" : stats.totalReferrals.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Credits earned</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {isLoading || !stats ? "…" : stats.creditsEarned.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
            <div className="text-xs text-gray-400">Your account</div>
            <div className="mt-1 text-sm text-gray-300">
              {user?.email ?? "Unknown user"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 text-sm text-gray-300 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-1">How it works</h3>
          <p>
            Each new user who signs up using your invite link is counted as a referral. When they
            complete signup, both you and the new user receive bonus credits (subject to reward
            limits to prevent abuse).
          </p>
        </div>
      </div>
    </AppShell>
  );
}

