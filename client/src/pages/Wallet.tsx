import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance, useWalletTransactions, invalidateWallet } from "@/hooks/useWallet";
import { manualTopup } from "@/api/wallet";
import { ChevronDown, ChevronUp, Download, Mail, Plus, RefreshCw } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

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

  const isLoading = balanceLoading || txLoading;
  const errorMessage = balanceError || txError;

  const refetch = async () => {
    await Promise.all([refetchBalance(), refetchTx()]);
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
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <RefreshCw size={16} className={`mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Download size={16} className="mr-2" />
              Download CSV
            </Button>
            {HAS_ADMIN_TOPUP && (
              <Button
                onClick={() => setIsTopupModalOpen(true)}
                className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
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
            <div className="skeleton-shimmer h-36 rounded-xl border border-[rgba(255,255,255,0.08)]" />
            <div className="skeleton-shimmer h-64 rounded-xl border border-[rgba(255,255,255,0.08)]" />
          </section>
        )}

        {!isLoading && errorMessage && (
          <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-200">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="mt-3 border-red-300/40 text-red-100 hover:bg-red-500/15"
            >
              Retry
            </Button>
          </section>
        )}

        {!isLoading && !errorMessage && (
          <>
            <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <p className="text-sm text-gray-400">Balance</p>
                  <p className="mt-2 text-5xl font-semibold text-white">
                    <AnimatedCounter value={balanceCredits} /> credits
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    1 credit = {tokensPerCredit.toLocaleString()} tokens
                  </p>
                </div>

                <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-4">
                  <h3 className="text-sm font-medium text-white">Top up (manual for now)</h3>
                  {HAS_ADMIN_TOPUP ? (
                    <p className="mt-2 text-xs text-gray-400">
                      Dev mode: Use the Add Credits button above to add credits manually.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-gray-300">
                        Top-up coming soon (Stripe). Contact support.
                      </p>
                      <a
                        href="mailto:sales@alexza.ai"
                        className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#c0c0c0] hover:bg-[rgba(255,255,255,0.08)]"
                      >
                        <Mail size={14} />
                        sales@alexza.ai
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">Transaction History</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Filter</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterType)}
                    className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[#050607] px-2 py-1 text-sm text-white"
                  >
                    <option value="all">All</option>
                    <option value="topup">Topup</option>
                    <option value="usage">Usage</option>
                    <option value="bonus">Bonus</option>
                    <option value="monthly_reset">Monthly Reset</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.08)] text-left text-gray-500">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Credits</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <Fragment key={row.id}>
                        <tr className="border-b border-[rgba(255,255,255,0.05)] text-gray-200">
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs ${
                                row.typeLabel === "Usage"
                                  ? "bg-red-500/15 text-red-300"
                                  : row.typeLabel === "Topup"
                                    ? "bg-blue-500/15 text-blue-300"
                                    : row.typeLabel === "Refund"
                                      ? "bg-amber-500/15 text-amber-300"
                                      : row.typeLabel === "Monthly Reset"
                                        ? "bg-violet-500/15 text-violet-300"
                                        : "bg-emerald-500/15 text-emerald-300"
                              }`}
                            >
                              {row.typeLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400" title={row.fullDate}>
                            {row.dateText}
                          </td>
                          <td className="px-3 py-2">
                            <span className={row.amountCredits < 0 ? "text-red-300" : "text-emerald-300"}>
                              {row.amountCredits > 0 ? "+" : ""}
                              {row.amountCredits.toLocaleString()} credits
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400 max-w-[220px] truncate">{row.reason}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId((prev) => (prev === row.id ? null : row.id))}
                              className="rounded-md border border-[rgba(255,255,255,0.12)] px-2 py-1 text-xs text-gray-200 hover:bg-[rgba(255,255,255,0.06)]"
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
                          <tr className="border-b border-[rgba(255,255,255,0.05)]">
                            <td colSpan={5} className="px-3 py-3">
                              <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3 text-xs text-gray-300">
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
