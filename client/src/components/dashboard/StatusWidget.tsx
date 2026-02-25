'use client';

import { useTranslation } from "react-i18next";
import { Activity, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useWalletBalance } from "@/hooks/useWallet";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import { Button } from "@/components/ui/button";

interface UsageSummary {
  totals: { calls: number; errors: number; errorRate: number; avgLatencyMs: number };
}

export default function StatusWidget() {
  const { t } = useTranslation();
  const { balanceCredits, tokensPerCredit, isLoading: creditsLoading, error: creditsError, refetch: refetchCredits } = useWalletBalance();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ ok: true; totals: UsageSummary["totals"]; range: unknown }>(
      "/api/usage/summary?days=1"
    )
      .then((usageRes) => {
        if (!cancelled) setUsage(usageRes ? { totals: usageRes.totals } : null);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const loading = creditsLoading || usageLoading;

  if (loading) {
    return (
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
        <div className="skeleton-shimmer h-24 w-full rounded-xl" />
      </section>
    );
  }

  return (
    <section className="group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 transition-all duration-300 hover:border-[rgba(192,192,192,0.4)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("dashboard.status")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]">BALANCE</span>
              <Wallet size={14} className="text-gray-500" />
            </div>
            {creditsError ? (
              <div className="mt-2">
                <p className="text-sm text-gray-300">{creditsError}</p>
                <Button variant="outline" size="sm" onClick={() => void refetchCredits()} className="mt-2 border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]">
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold text-white">
                  <AnimatedCounter value={balanceCredits} />
                </p>
                <p className="mt-1 text-xs text-gray-500">1 credit = {tokensPerCredit.toLocaleString()} tokens</p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-[10px] font-medium text-[#c0c0c0]">24H</span>
              <Activity size={14} className="text-gray-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {usage ? `${usage.totals.calls} ${t("dashboard.calls")}` : "—"}
            </p>
            {usage && usage.totals.errors > 0 && (
              <span className="mt-1 inline-block rounded-full border border-[rgba(192,192,192,0.35)] bg-[rgba(192,192,192,0.14)] px-2 py-0.5 text-xs text-[#c0c0c0]">
                {usage.totals.errors} {t("dashboard.errors")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
