import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { AlertCircle, ChevronDown, ChevronUp, Download, Plus, RefreshCw } from "lucide-react";
import { Fragment } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FilterType = "all" | "topup" | "usage" | "bonus" | "monthly_reset";

interface CreditsBalanceResponse {
  ok: boolean;
  balanceCredits: number;
}

interface CreditTransaction {
  id: string;
  type: "bonus" | "topup" | "usage" | "refund" | "monthly_reset_bonus";
  amountCredits: number;
  reason: string;
  relatedRunId: string | null;
  usageLogId: string | null;
  totalTokens?: number | null;
  createdAt: string;
}

interface CreditsTransactionsResponse {
  ok: boolean;
  transactions: CreditTransaction[];
}

interface CreditsTopupResponse {
  ok: boolean;
  balanceCredits: number;
  transaction: CreditTransaction;
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

export default function Wallet() {
  const [balanceCredits, setBalanceCredits] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("500");
  const [topupReason, setTopupReason] = useState("");
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const monthlyBudget = 500000;
  const used = Math.max(0, monthlyBudget - balanceCredits);
  const usedPercent = Math.min(100, Math.round((used / monthlyBudget) * 100));
  const budgetWarning = usedPercent >= 80;

  const loadCreditsData = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        apiRequest<CreditsBalanceResponse>("/api/credits/balance"),
        apiRequest<CreditsTransactionsResponse>("/api/credits/transactions?limit=50"),
      ]);
      setBalanceCredits(balanceRes.balanceCredits);
      setTransactions(transactionsRes.transactions || []);
      setHasLoadedOnce(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load credits data";
      setErrorMessage(message);
      showErrorToast("Unable to load credits", message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    void loadCreditsData();
  }, [loadCreditsData]);

  const normalizedRows = useMemo(() => {
    return transactions.map((tx) => {
      const typeLabel =
        tx.type === "topup"
          ? "Topup"
          : tx.type === "usage"
            ? "Usage"
            : tx.type === "refund"
              ? "Refund"
              : tx.type === "monthly_reset_bonus"
                ? "Monthly Reset"
              : "Bonus";
      const dateText = new Date(tx.createdAt).toLocaleString();
      return {
        id: tx.id,
        typeLabel,
        originalType: tx.type,
        dateText,
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
        date: row.dateText,
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

  const handleSubmitTopup = async () => {
    const parsedAmount = Number.parseInt(topupAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showErrorToast("Validation error", "Please enter a positive amount of credits");
      return;
    }
    if (parsedAmount > 100000) {
      showErrorToast("Validation error", "Maximum top-up per request is 100000 credits");
      return;
    }

    setIsSubmittingTopup(true);
    try {
      const response = await apiRequest<CreditsTopupResponse>("/api/credits/topup", {
        method: "POST",
        body: {
          amountCredits: parsedAmount,
          reason: topupReason.trim() || undefined,
        },
      });
      setBalanceCredits(response.balanceCredits);
      setTransactions((prev) => [response.transaction, ...prev]);
      setIsTopupModalOpen(false);
      setTopupAmount("500");
      setTopupReason("");
      showSuccessToast("Credits added", `+${parsedAmount.toLocaleString()} credits`);
      void loadCreditsData();
    } catch (error) {
      if (error instanceof ApiError) {
        showErrorToast("Top-up failed", error.message);
        return;
      }
      showErrorToast("Top-up failed", "Unable to add credits right now");
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
              onClick={() => void loadCreditsData()}
              disabled={isLoading || isRefreshing}
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <RefreshCw size={16} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
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
            <Button
              onClick={() => setIsTopupModalOpen(true)}
              className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
            >
              <Plus size={16} className="mr-2" />
              Add Credits
            </Button>
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
              onClick={() => void loadCreditsData()}
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
              <p className="text-sm text-gray-400">Credit Balance</p>
              <p className="mt-2 text-5xl font-semibold text-white">
                <AnimatedCounter value={balanceCredits} />
              </p>
              <p className="mt-2 text-xs text-gray-500" title="Credits are used for processing in ALEXZA Managed Runtime.">
                ALEXZA Credits — usage, monthly allowance.
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-4">
              <p className="text-xs text-gray-500">Budget Usage</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1b212a]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a8a8a8] to-[#c0c0c0]"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-300">
                {used.toLocaleString()} / {monthlyBudget.toLocaleString()} credits
              </p>
              {budgetWarning && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">
                  <AlertCircle size={14} />
                  <span className="text-xs">Budget warning: usage exceeds 80% this cycle.</span>
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
                  <th className="px-3 py-2">Tokens</th>
                  <th className="px-3 py-2">Credits Charged</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr key={row.id} className="border-b border-[rgba(255,255,255,0.05)] text-gray-200">
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
                      <td className="px-3 py-2 text-gray-400">{row.dateText}</td>
                      <td className="px-3 py-2 text-gray-300">{row.totalTokens}</td>
                      <td className="px-3 py-2 text-gray-200">{row.creditsCharged}</td>
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
                        <td colSpan={7} className="px-3 py-3">
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
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                      No transactions yet.
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
      <Modal
        open={isTopupModalOpen}
        onOpenChange={(open) => {
          if (isSubmittingTopup) return;
          setIsTopupModalOpen(open);
        }}
        title="Manual Credit Top-up"
        description="For testing only. Adds credits directly to your wallet."
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
              onClick={() => void handleSubmitTopup()}
              disabled={isSubmittingTopup}
              className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
            >
              {isSubmittingTopup ? "Adding..." : "Confirm Top-up"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Amount Credits</label>
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              disabled={isSubmittingTopup}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white focus:outline-none focus:border-[rgba(192,192,192,0.5)]"
            />
            <p className="text-xs text-gray-500">Allowed range: 1 - 100000 credits</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Reason (optional)</label>
            <input
              type="text"
              value={topupReason}
              onChange={(e) => setTopupReason(e.target.value)}
              disabled={isSubmittingTopup}
              maxLength={200}
              placeholder="e.g. QA top-up for e2e test"
              className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white focus:outline-none focus:border-[rgba(192,192,192,0.5)]"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
