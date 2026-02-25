import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance, useWalletTransactions, invalidateWallet } from "@/hooks/useWallet";
import { createStripeCheckoutSession, manualTopup } from "@/api/wallet";
import { ChevronDown, ChevronUp, CreditCard, Download, Mail, Plus, RefreshCw } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

type FilterType = "all" | "topup" | "usage" | "bonus" | "monthly_reset";

function formatFriendlyDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffMs / 86400_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function toCsv(rows: Array<{ type: string; date: string; amountCredits: number; reason: string }>) {
  const header = "type,date,amountCredits,reason\n";
  return (
    header +
    rows
      .map(
        (row) =>
          `${row.type},${row.date.replace(/,/g, " ")},${row.amountCredits},${row.reason
            .replace(/,/g, " ")
            .replace(/\n/g, " ")}`
      )
      .join("\n")
  );
}

const ADMIN_TOPUP_KEY = (import.meta.env.VITE_ADMIN_TOPUP_KEY as string)?.trim() || "";
const HAS_ADMIN_TOPUP = ADMIN_TOPUP_KEY.length > 0;

const STRIPE_PRESETS = [10, 20, 50];
const MIN_STRIPE_USD = 10;
const MAX_STRIPE_USD = 500;

export default function Wallet() {
  const { user } = useAuth();
  const {
    balanceCredits,
    tokensPerCredit,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useWalletBalance();
  const {
    transactions,
    isLoading: txLoading,
    error: txError,
    refetch: refetchTx,
  } = useWalletTransactions(50);

  const [filter, setFilter] = useState<FilterType>("all");
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("1000");
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [stripeAmountUsd, setStripeAmountUsd] = useState("20");
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [urlStatus, setUrlStatus] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      setUrlStatus("success");
      invalidateWallet();
      window.history.replaceState({}, "", "/app/billing/credits");
    } else if (status === "cancel") {
      setUrlStatus("cancel");
      window.history.replaceState({}, "", "/app/billing/credits");
    }
  }, []);

  const isLoading = balanceLoading || txLoading;
  const errorMessage = balanceError || txError;

  const refetch = async () => {
    await Promise.all([refetchBalance(), refetchTx()]);
  };

  useEffect(() => {
    if (urlStatus === "success") {
      const t = setTimeout(() => setUrlStatus(null), 8000);
      return () => clearTimeout(t);
    }
  }, [urlStatus]);

  const handleStripeCheckout = async () => {
    const amount = Number.parseFloat(stripeAmountUsd);
    if (!Number.isFinite(amount) || amount < MIN_STRIPE_USD) {
      showErrorToast("Validation error", `Minimum amount is $${MIN_STRIPE_USD}`);
      return;
    }
    if (amount > MAX_STRIPE_USD) {
      showErrorToast("Validation error", `Maximum amount is $${MAX_STRIPE_USD}`);
      return;
    }
    setIsStripeLoading(true);
    try {
      const res = await createStripeCheckoutSession(amount);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      showErrorToast("Checkout failed", "No redirect URL received");
    } catch (error) {
      showErrorToast("Checkout failed", error instanceof Error ? error.message : "Unable to start checkout");
    } finally {
      setIsStripeLoading(false);
    }
  };

  const normalizedRows = useMemo(() => {
    return transactions.map((tx) => {
      const typeLabel =
        tx.type === "topup"
          ? "Topup"
          : tx.type === "usage"
            ? "Usage"
            : tx.type === "refund"
              ? "Refund"
              : tx.type === "grant"
                ? "Bonus"
                : tx.type === "reserve"
                  ? "Reserve"
                  : tx.type === "monthly_reset_bonus"
                    ? "Monthly Reset"
                    : "Bonus";
      const dateText = formatFriendlyDate(tx.createdAt);
      const fullDate = new Date(tx.createdAt).toLocaleString();
      return {
        id: tx.id,
        typeLabel,
        originalType: tx.type,
        dateText,
        fullDate,
        amountCredits: tx.amountCredits,
        reason: tx.reason || "-",
        totalTokens:
          tx.type === "usage" && typeof tx.totalTokens === "number"
            ? tx.totalTokens.toLocaleString()
            : "-",
        creditsCharged:
          tx.type === "usage" ? Math.max(0, Math.abs(Math.trunc(tx.amountCredits))).toLocaleString() : "-",
        details: {
          relatedRunId: tx.relatedRunId || "-",
          usageLogId: tx.usageLogId || "-",
          totalTokens:
            typeof tx.totalTokens === "number" && Number.isFinite(tx.totalTokens)
              ? tx.totalTokens.toLocaleString()
              : "-",
        },
      };
    });
  }, [transactions]);

  const rows = useMemo(() => {
    return normalizedRows.filter((row) => {
      if (filter === "all") return true;
      if (filter === "topup") return row.originalType === "topup";
      if (filter === "usage") return row.originalType === "usage";
      if (filter === "monthly_reset") return row.originalType === "monthly_reset_bonus";
      return row.originalType === "bonus";
    });
  }, [filter, normalizedRows]);

  const exportCsv = () => {
    const csv = toCsv(
      rows.map((row) => ({
        type: row.typeLabel,
        date: row.fullDate,
        amountCredits: row.amountCredits,
        reason: row.reason,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "credits-transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccessToast("Transactions CSV downloaded");
  };

  const handleManualTopup = async () => {
    const parsedAmount = Number.parseInt(topupAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showErrorToast("Validation error", "Please enter a positive amount of credits");
      return;
    }
    if (parsedAmount > 1000000) {
      showErrorToast("Validation error", "Maximum top-up per request is 1,000,000 credits");
      return;
    }
    const userId = user?.id;
    if (!userId) {
      showErrorToast("Not signed in", "Please sign in to add credits");
      return;
    }

    setIsSubmittingTopup(true);
    try {
      await manualTopup({
        userId,
        credits: parsedAmount,
        reason: "dev topup",
        adminKey: ADMIN_TOPUP_KEY,
      });
      invalidateWallet();
      setIsTopupModalOpen(false);
      setTopupAmount("1000");
      showSuccessToast("Credits added", `+${parsedAmount.toLocaleString()} credits`);
      void refetch();
    } catch (error) {
      showErrorToast("Top-up failed", error instanceof Error ? error.message : "Unable to add credits");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  return (
    <>
      <AppShell
        title="Credits & Wallet"
        subtitle="ALEXZA Credits and ALEXZA Managed Runtime usage"
        titleClassName="text-white"
        backHref="/app/dashboard"
        backLabel="Back to Dashboard"
        breadcrumbs={[
          { label: "Dashboard", href: "/app/dashboard" },
          { label: "Billing", href: "/app/billing/plans" },
          { label: "Credits" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(192,192,192,0.4)] transition-all"
            >
              <RefreshCw size={16} className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(192,192,192,0.4)] transition-all disabled:opacity-50"
            >
              <Download size={16} className="mr-2" />
              Download CSV
            </Button>
            {HAS_ADMIN_TOPUP && (
              <Button
                onClick={() => setIsTopupModalOpen(true)}
                className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8] transition-all"
              >
                <Plus size={16} className="mr-2" />
                Add Credits
              </Button>
            )}
          </div>
        }
      >
        {isLoading && (
          <section className="space-y-4">
            <div className="skeleton-shimmer h-36 rounded-xl border border-[rgba(255,255,255,0.08)] bg-black" />
            <div className="skeleton-shimmer h-64 rounded-xl border border-[rgba(255,255,255,0.08)] bg-black" />
          </section>
        )}

        {!isLoading && errorMessage && (
          <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
            <p className="text-sm text-gray-200">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="mt-3 border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]"
            >
              Retry
            </Button>
          </section>
        )}

        {!isLoading && !errorMessage && (
          <>
            {urlStatus === "success" && (
              <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4">
                <p className="text-sm font-medium text-gray-200">
                  Payment successful! Credits have been added to your wallet.
                </p>
              </section>
            )}
            {urlStatus === "cancel" && (
              <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4">
                <p className="text-sm text-gray-200">Checkout was cancelled.</p>
              </section>
            )}

            <section className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,192,192,0.04),transparent_60%)]" aria-hidden />
              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] relative">
                <div className="group">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Balance</p>
                  <p className="mt-2 text-5xl font-bold text-white">
                    <AnimatedCounter value={balanceCredits} /> credits
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    1 credit = {tokensPerCredit.toLocaleString()} tokens
                  </p>
                </div>

                <div
                  data-topup-card="silver-3d"
                  className="group/card relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(192,192,192,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  style={{
                    background: "linear-gradient(145deg, #2a2d32 0%, #1e2126 25%, #16181c 50%, #0f1114 75%, #0a0b0d 100%)",
                    border: "1px solid rgba(192,192,192,0.35)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 20px rgba(192,192,192,0.08)",
                  }}
                >
                  {/* Silver metallic reflection - top-left highlight */}
                  <div className="absolute inset-0 opacity-100" style={{ backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 20%, transparent 40%), linear-gradient(225deg, transparent 50%, rgba(0,0,0,0.15) 100%)" }} aria-hidden />
                  {/* Radial depth - inner glow */}
                  <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(ellipse 80% 50% at 30% 20%, rgba(192,192,192,0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 60% at 70% 80%, rgba(0,0,0,0.4) 0%, transparent 50%)" }} aria-hidden />
                  {/* Top edge - metallic silver highlight */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent 0%, rgba(192,192,192,0.5) 20%, rgba(255,255,255,0.4) 50%, rgba(192,192,192,0.5) 80%, transparent 100%)" }} aria-hidden />
                  <div className="relative p-5">
                    {/* Card header - chip + badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-7 rounded-[4px] bg-gradient-to-br from-slate-400/90 via-slate-500/60 to-slate-700/80 border border-slate-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.3)]" aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Top up</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={14} className="text-slate-300" style={{ filter: "drop-shadow(0 0 4px rgba(192,192,192,0.4))" }} />
                        <span className="text-xs font-medium text-slate-200">Stripe</span>
                      </div>
                    </div>
                    <p className="mb-2 text-[9px] text-slate-500" style={{ fontFamily: "monospace" }}>ALEXZA · Silver 3D</p>
                    {HAS_ADMIN_TOPUP ? (
                      <p className="mb-3 text-[10px] text-gray-500">
                        Dev mode: Add Credits above or Stripe below.
                      </p>
                    ) : null}
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {STRIPE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setStripeAmountUsd(String(preset))}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
                              stripeAmountUsd === String(preset)
                                ? "border-slate-400/60 bg-slate-500/30 text-slate-100 shadow-[0_0_12px_rgba(192,192,192,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
                                : "border-slate-600/50 text-slate-400 bg-slate-800/40 hover:bg-slate-700/50 hover:border-slate-400/40 hover:text-slate-200"
                            }`}
                          >
                            ${preset}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Amount (USD)</label>
                          <input
                            type="number"
                            min={MIN_STRIPE_USD}
                            max={MAX_STRIPE_USD}
                            step="1"
                            value={stripeAmountUsd}
                            onChange={(e) => setStripeAmountUsd(e.target.value)}
                            disabled={isStripeLoading}
                            className="w-full rounded-lg border border-slate-600/50 bg-slate-900/60 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-400/60 focus:ring-1 focus:ring-slate-400/30 focus:shadow-[0_0_12px_rgba(192,192,192,0.1)]"
                          />
                        </div>
                        <Button
                          onClick={() => void handleStripeCheckout()}
                          disabled={isStripeLoading}
                          className="shrink-0 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-600 text-slate-900 font-semibold shadow-[0_4px_0_#374151,inset_0_1px_0_rgba(255,255,255,0.3)] hover:from-slate-200 hover:via-slate-300 hover:to-slate-500 hover:shadow-[0_2px_0_#374151,inset_0_1px_0_rgba(255,255,255,0.3)] active:shadow-none active:translate-y-[2px] transition-all"
                        >
                          {isStripeLoading ? "Redirecting..." : "Checkout"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Min ${MIN_STRIPE_USD} · Max ${MAX_STRIPE_USD}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-600/50">
                      <a
                        href="mailto:sales@alexza.ai"
                        className="inline-flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Mail size={11} />
                        Contact sales
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" aria-hidden />
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#c0c0c0] animate-pulse" />
                  Transaction History
                </h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Filter</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterType)}
                    className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 px-2 py-1 text-sm text-gray-200 focus:border-[rgba(192,192,192,0.5)] focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="topup">Topup</option>
                    <option value="usage">Usage</option>
                    <option value="bonus">Bonus</option>
                    <option value="monthly_reset">Monthly Reset</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.08)] text-left text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Credits</th>
                      <th className="px-3 py-3">Reason</th>
                      <th className="px-3 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <Fragment key={row.id}>
                        <tr className="border-b border-[rgba(255,255,255,0.06)] text-gray-200 hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                          <td className="px-3 py-2.5">
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-medium bg-[rgba(255,255,255,0.08)] text-gray-300 border border-[rgba(255,255,255,0.08)]"
                            >
                              {row.typeLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-400" title={row.fullDate}>
                            {row.dateText}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`font-semibold ${row.amountCredits < 0 ? "text-gray-300" : "text-gray-200"}`}>
                              {row.amountCredits > 0 ? "+" : ""}
                              {row.amountCredits.toLocaleString()} credits
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-400 max-w-[220px] truncate">{row.reason}</td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId((prev) => (prev === row.id ? null : row.id))}
                              className="rounded-md border border-[rgba(255,255,255,0.08)] px-2 py-1 text-xs text-gray-200 hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(192,192,192,0.4)] transition-all"
                            >
                              {expandedRowId === row.id ? (
                                <span className="inline-flex items-center gap-1">
                                  Hide <ChevronUp size={12} />
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  Show <ChevronDown size={12} />
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                        {expandedRowId === row.id && (
                          <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td colSpan={5} className="px-3 py-3">
                              <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-3 text-xs text-gray-300">
                                <div>Reason: {row.reason}</div>
                                <div>Run ID: {row.details.relatedRunId}</div>
                                <div>Usage Log ID: {row.details.usageLogId}</div>
                                <div>Tokens: {row.details.totalTokens}</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-12 text-center text-gray-500">
                          <p className="text-sm">No transactions yet.</p>
                          <p className="mt-1 text-xs">Usage and top-ups will appear here.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </AppShell>

      {HAS_ADMIN_TOPUP && (
        <Modal
          open={isTopupModalOpen}
          onOpenChange={(open) => {
            if (isSubmittingTopup) return;
            setIsTopupModalOpen(open);
          }}
          title="Add Credits (Dev)"
          description="Manual top-up for testing. Requires admin key."
          size="sm"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setIsTopupModalOpen(false)}
                disabled={isSubmittingTopup}
                className="border-[rgba(255,255,255,0.1)] text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleManualTopup()}
                disabled={isSubmittingTopup}
                className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
              >
                {isSubmittingTopup ? "Adding..." : "Add credits"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Credits</label>
              <input
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                disabled={isSubmittingTopup}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white focus:outline-none focus:border-[rgba(192,192,192,0.5)]"
              />
              <p className="text-xs text-gray-500">1 - 1,000,000 credits</p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
