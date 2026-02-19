import AppShell from "@/components/app/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Plan = {
  id: "free" | "pro";
  name: string;
  description: string;
  monthlyPriceLabel: string;
  monthlyCreditsAllowance: number;
  tier: number;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Starter",
    description: "Perfect for getting started",
    monthlyPriceLabel: "Free",
    monthlyCreditsAllowance: 1000,
    tier: 1,
    features: ["Up to 1,000 API calls/month", "Basic support", "Single project", "Community access"],
  },
  {
    id: "pro",
    name: "Professional",
    description: "For growing projects",
    monthlyPriceLabel: "$50",
    monthlyCreditsAllowance: 10000,
    tier: 2,
    popular: true,
    features: ["Up to 10,000 API calls/month", "Priority support", "Unlimited projects", "Advanced analytics", "Custom integrations"],
  },
];

interface BillingPlanResponse {
  ok: boolean;
  plan: "free" | "pro";
  monthlyCreditsAllowance: number;
  monthlyCreditsUsed: number;
  billingCycleAnchor: string;
  nextResetAt: string;
}

export default function BillingPlans() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<"free" | "pro">("free");
  const [monthlyAllowance, setMonthlyAllowance] = useState(1000);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [nextResetAt, setNextResetAt] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"free" | "pro" | null>(null);

  const loadBillingPlan = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<BillingPlanResponse>("/api/billing/plan");
      setCurrentPlanId(response.plan);
      setMonthlyAllowance(response.monthlyCreditsAllowance);
      setMonthlyUsed(response.monthlyCreditsUsed);
      setNextResetAt(response.nextResetAt);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Unable to load billing plan";
      showErrorToast("Failed to load billing", message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBillingPlan();
  }, []);

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === currentPlanId) ?? plans[0],
    [currentPlanId]
  );
  const currentTier = currentPlan.tier;
  const pendingTier = useMemo(() => plans.find((p) => p.id === pendingPlan)?.tier ?? currentTier, [pendingPlan, currentTier]);

  const changeType =
    pendingTier > currentTier ? "Upgrade" : pendingTier < currentTier ? "Downgrade" : "Current plan";
  const usagePercent = monthlyAllowance > 0 ? Math.min(100, Math.round((monthlyUsed / monthlyAllowance) * 100)) : 0;

  return (
    <>
      <AppShell
        title="Billing Plans"
        subtitle="Choose a plan for your orchestration workloads"
        backHref="/app/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: "Dashboard", href: "/app/dashboard" },
          { label: "Billing Plans" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-3 py-1 text-xs text-white">
              Current Plan: {currentPlan.name}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                changeType === "Upgrade"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : changeType === "Downgrade"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-slate-500/20 text-slate-300"
              }`}
            >
              {changeType}
            </span>
            <div className="min-w-[260px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-2">
              <p className="text-[11px] text-gray-500">Monthly Quota</p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#1b212a]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a8a8a8] to-[#c0c0c0]"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-300">
                {monthlyUsed.toLocaleString()} / {monthlyAllowance.toLocaleString()} credits used
              </p>
            </div>
          </div>
        }
      >
        {isLoading && (
          <div className="space-y-4">
            <div className="skeleton-shimmer h-24 rounded-xl border border-[rgba(255,255,255,0.08)]" />
            <div className="skeleton-shimmer h-64 rounded-xl border border-[rgba(255,255,255,0.08)]" />
          </div>
        )}
        {!isLoading && (
          <>
        <div className="mb-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4 text-sm text-gray-300">
          <p>
            Monthly allowance: <span className="text-white">{monthlyAllowance.toLocaleString()}</span> credits
          </p>
          <p>
            Monthly used: <span className="text-white">{monthlyUsed.toLocaleString()}</span> credits
          </p>
          <p>
            Next reset: <span className="text-white">{nextResetAt ? new Date(nextResetAt).toLocaleString() : "-"}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Plan switches keep monthly usage as-is; only allowance changes.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isSelected = pendingPlan === plan.id;
            return (
              <div
                key={plan.name}
                className={`card-hover rounded-xl border bg-gradient-to-br from-[#0b0e12] to-[#050607] p-6 transition-all duration-200 ${
                  isSelected
                    ? "border-[rgba(192,192,192,0.55)] ring-2 ring-[rgba(192,192,192,0.28)]"
                    : isCurrent
                      ? "border-[rgba(192,192,192,0.35)]"
                      : "border-[rgba(255,255,255,0.07)]"
                }`}
              >
                {plan.popular && (
                  <span className="mb-4 inline-block rounded-full bg-[#c0c0c0]/20 px-3 py-1 text-xs font-semibold text-[#c0c0c0]">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <div className="my-5">
                  <p className="text-4xl font-bold text-white">{plan.monthlyPriceLabel}</p>
                  <p className="mt-2 text-sm text-gray-500">{plan.monthlyCreditsAllowance.toLocaleString()} credits/month</p>
                </div>
                <Button
                  onClick={() => setPendingPlan(plan.id)}
                  disabled={isSaving}
                  variant={isCurrent ? "outline" : "default"}
                  className={`mb-6 w-full ${
                    isCurrent
                      ? "border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                      : "bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                  }`}
                >
                  {isCurrent ? "Current Plan" : `Switch to ${plan.name}`}
                </Button>
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check size={16} className="mt-0.5 text-[#c0c0c0]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </AppShell>

      <ConfirmDialog
        open={Boolean(pendingPlan)}
        onOpenChange={(open) => {
          if (!open) setPendingPlan(null);
        }}
        title="Confirm Plan Switch"
        description={
          pendingPlan
            ? `${changeType} to ${plans.find((p) => p.id === pendingPlan)?.name ?? pendingPlan}?`
            : "Switch plan?"
        }
        confirmText={isSaving ? "Saving..." : "Confirm Switch"}
        cancelText="Cancel"
        isLoading={isSaving}
        onConfirm={() => {
          void (async () => {
            if (!pendingPlan) return;
            setIsSaving(true);
            try {
              const response = await apiRequest<BillingPlanResponse>("/api/billing/plan", {
                method: "POST",
                body: { plan: pendingPlan },
              });
              setCurrentPlanId(response.plan);
              setMonthlyAllowance(response.monthlyCreditsAllowance);
              setMonthlyUsed(response.monthlyCreditsUsed);
              setNextResetAt(response.nextResetAt);
              showSuccessToast(`Plan switched to ${plans.find((p) => p.id === response.plan)?.name ?? response.plan}`);
              setPendingPlan(null);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unable to switch plan";
              showErrorToast("Plan switch failed", message);
            } finally {
              setIsSaving(false);
            }
          })();
        }}
      />
    </>
  );
}
