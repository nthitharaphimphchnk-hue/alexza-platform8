import AppShell from "@/components/app/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { showSuccessToast } from "@/lib/toast";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";

type BillingCycle = "monthly" | "yearly";

type Plan = {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  credits: string;
  tier: number;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    description: "Perfect for getting started",
    monthlyPrice: "Free",
    yearlyPrice: "Free",
    credits: "1,000 credits/month",
    tier: 1,
    features: ["Up to 1,000 API calls/month", "Basic support", "Single project", "Community access"],
  },
  {
    name: "Professional",
    description: "For growing projects",
    monthlyPrice: "$50",
    yearlyPrice: "$40",
    credits: "50,000 credits/month",
    tier: 2,
    popular: true,
    features: ["Up to 50,000 API calls/month", "Priority support", "Unlimited projects", "Advanced analytics", "Custom integrations"],
  },
  {
    name: "Enterprise",
    description: "For large-scale operations",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    credits: "Custom credits",
    tier: 3,
    features: ["Unlimited API calls", "24/7 dedicated support", "Unlimited projects", "Advanced security", "SLA guarantee", "Custom integrations"],
  },
];

export default function BillingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currentPlan, setCurrentPlan] = useState("Professional");
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const currentTier = useMemo(() => plans.find((p) => p.name === currentPlan)?.tier ?? 2, [currentPlan]);
  const pendingTier = useMemo(() => plans.find((p) => p.name === pendingPlan)?.tier ?? currentTier, [pendingPlan, currentTier]);

  const changeType =
    pendingTier > currentTier ? "Upgrade" : pendingTier < currentTier ? "Downgrade" : "Current plan";

  return (
    <>
      <AppShell
        title="Billing Plans"
        subtitle="Choose a plan for your orchestration workloads"
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Billing Plans" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-3 py-1 text-xs text-white">
              Current Plan: {currentPlan}
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
            <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-1">
              <button
                onClick={() => setCycle("monthly")}
                className={`ripple-btn rounded-md px-3 py-1 text-xs transition ${
                  cycle === "monthly" ? "bg-[rgba(192,192,192,0.18)] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`ripple-btn rounded-md px-3 py-1 text-xs transition ${
                  cycle === "yearly" ? "bg-[rgba(192,192,192,0.18)] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            const isSelected = pendingPlan === plan.name;
            const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
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
                  <p className="text-4xl font-bold text-white">{price}</p>
                  <p className="mt-2 text-sm text-gray-500">{plan.credits}</p>
                </div>
                <Button
                  onClick={() => setPendingPlan(plan.name)}
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
      </AppShell>

      <ConfirmDialog
        open={Boolean(pendingPlan)}
        onOpenChange={(open) => {
          if (!open) setPendingPlan(null);
        }}
        title="Confirm Plan Switch"
        description={
          pendingPlan
            ? `${changeType} to ${pendingPlan} (${cycle === "monthly" ? "Monthly" : "Yearly"} billing)?`
            : "Switch plan?"
        }
        confirmText="Confirm Switch"
        cancelText="Cancel"
        onConfirm={() => {
          if (!pendingPlan) return;
          setCurrentPlan(pendingPlan);
          showSuccessToast(`Plan switched to ${pendingPlan}`, "Billing settings have been updated.");
          setPendingPlan(null);
        }}
      />
    </>
  );
}
