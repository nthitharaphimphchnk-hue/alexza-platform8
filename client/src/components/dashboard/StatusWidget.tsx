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
      <section className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-5 backdrop-blur">
        <div className="skeleton-shimmer h-24 w-full rounded-lg" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-5 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-white">{t("dashboard.status")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Wallet size={16} />
            <span className="text-xs">{t("dashboard.creditsBalance")}</span>
          </div>
          {creditsError ? (
            <div className="mt-2">
              <p className="text-sm text-red-300">{creditsError}</p>
              <Button variant="outline" size="sm" onClick={() => void refetchCredits()} className="mt-2 border-red-300/40 text-red-100 hover:bg-red-500/15">
                Retry
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-2xl font-semibold text-white">
                <AnimatedCounter value={balanceCredits} />
              </p>
              <p className="mt-1 text-xs text-gray-500">1 credit = {tokensPerCredit.toLocaleString()} tokens</p>
            </>
          )}
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Activity size={16} />
            <span className="text-xs">{t("dashboard.last24hUsage")}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {usage ? `${usage.totals.calls} ${t("dashboard.calls")}` : "—"}
          </p>
          {usage && usage.totals.errors > 0 && (
            <p className="mt-1 text-xs text-amber-400">
              {usage.totals.errors} {t("dashboard.errors")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
