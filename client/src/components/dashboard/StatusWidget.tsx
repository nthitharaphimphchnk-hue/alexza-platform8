'use client';

import { useTranslation } from "react-i18next";
import { Activity, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { getCreditsBalance } from "@/lib/alexzaApi";
import AnimatedCounter from "@/components/app/AnimatedCounter";

interface UsageSummary {
  totals: { calls: number; errors: number; errorRate: number; avgLatencyMs: number };
}

export default function StatusWidget() {
  const { t } = useTranslation();
  const [credits, setCredits] = useState<number | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [creditsRes, usageRes] = await Promise.all([
          getCreditsBalance(),
          apiRequest<{ ok: true; totals: UsageSummary["totals"]; range: unknown }>(
            "/api/usage/summary?days=1"
          ).catch(() => null),
        ]);
        if (cancelled) return;
        setCredits(creditsRes);
        setUsage(usageRes ? { totals: usageRes.totals } : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
          <p className="mt-2 text-2xl font-semibold text-white">
            {credits !== null ? <AnimatedCounter value={credits} /> : "—"}
          </p>
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
