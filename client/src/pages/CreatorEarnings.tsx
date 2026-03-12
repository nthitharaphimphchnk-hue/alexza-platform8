import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { CreditCard, DollarSign, ExternalLink, LineChart } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type EarningsTotals = { revenue: number; payoutAmount: number; platformFee: number };
type RecentSale = {
  id: string;
  itemType: string;
  itemId: string;
  revenue: number;
  platformFee: number;
  payoutAmount: number;
  currency: string;
  createdAt: string;
};
type TopSelling = { itemType: string; itemId: string; sales: number; revenue: number };

export default function CreatorEarnings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [totals, setTotals] = useState<EarningsTotals>({ revenue: 0, payoutAmount: 0, platformFee: 0 });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [topSelling, setTopSelling] = useState<TopSelling[]>([]);

  const currency = useMemo(() => "USD", []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ ok: boolean; totals: EarningsTotals; recentSales: RecentSale[]; topSelling: TopSelling[] }>(
        "/api/creator/earnings"
      );
      setTotals(data.totals ?? { revenue: 0, payoutAmount: 0, platformFee: 0 });
      setRecentSales(data.recentSales ?? []);
      setTopSelling(data.topSelling ?? []);
      setConnectUrl(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        showErrorToast("Creator profile not found", "Create a creator profile to view earnings.");
        return;
      }
      showErrorToast("Failed to load earnings", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startConnectOnboarding = async () => {
    try {
      const res = await apiRequest<{ ok: boolean; url: string; accountId: string }>("/api/creators/me/connect/onboard", { method: "POST" });
      if (res.url) {
        window.location.href = res.url;
      } else {
        setConnectUrl(null);
      }
    } catch (err) {
      showErrorToast("Stripe Connect onboarding failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <AppShell
      title="Creator Earnings"
      subtitle="Track revenue, sales, and payouts"
      backHref="/app/creators"
      backLabel={t("common.back")}
      breadcrumbs={[
        { label: t("navigation.dashboard"), href: "/app/dashboard" },
        { label: "Creators", href: "/app/creators" },
        { label: "Earnings" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void startConnectOnboarding()}
          className="border-[rgba(192,192,192,0.3)] text-white hover:bg-[rgba(192,192,192,0.1)]"
        >
          <ExternalLink size={16} className="mr-2" />
          Connect Stripe
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[#0b0e12]/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <DollarSign size={14} className="text-[#c0c0c0]" />
                Total revenue ({currency})
              </div>
              <div className="text-2xl font-semibold text-white">${totals.revenue.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <CreditCard size={14} className="text-[#c0c0c0]" />
                Payout amount ({currency})
              </div>
              <div className="text-2xl font-semibold text-white">${totals.payoutAmount.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <LineChart size={14} className="text-[#c0c0c0]" />
                Platform fees ({currency})
              </div>
              <div className="text-2xl font-semibold text-white">${totals.platformFee.toFixed(2)}</div>
            </div>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Recent sales</h2>
            {recentSales.length === 0 ? (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-8 text-gray-400">
                No sales yet.
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-gray-500 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="col-span-3">Item</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Revenue</div>
                  <div className="col-span-2">Fee</div>
                  <div className="col-span-2">Payout</div>
                  <div className="col-span-1">Date</div>
                </div>
                {recentSales.map((s) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-gray-300 border-b border-[rgba(255,255,255,0.04)]">
                    <div className="col-span-3 truncate">{s.itemId}</div>
                    <div className="col-span-2">{s.itemType}</div>
                    <div className="col-span-2">${s.revenue.toFixed(2)}</div>
                    <div className="col-span-2">${s.platformFee.toFixed(2)}</div>
                    <div className="col-span-2">${s.payoutAmount.toFixed(2)}</div>
                    <div className="col-span-1 text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Top selling items</h2>
            {topSelling.length === 0 ? (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-8 text-gray-400">
                No top items yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topSelling.map((t) => (
                  <div key={`${t.itemType}-${t.itemId}`} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
                    <div className="text-xs text-gray-500">{t.itemType}</div>
                    <div className="mt-1 text-sm text-gray-300 truncate">{t.itemId}</div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500">{t.sales} sales</span>
                      <span className="text-white font-medium">${t.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {connectUrl && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
              <div className="text-gray-400">Stripe Connect</div>
              <a href={connectUrl} className="text-[#c0c0c0] hover:underline">
                Complete onboarding
              </a>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

