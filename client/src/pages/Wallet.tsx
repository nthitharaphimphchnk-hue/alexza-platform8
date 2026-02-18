import AppShell from "@/components/app/AppShell";
import AnimatedCounter from "@/components/app/AnimatedCounter";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import { useCredits } from "@/contexts/CreditsContext";
import { showCreditsAddedToast, showSuccessToast } from "@/lib/toast";
import { AlertCircle, Download, Plus, Wallet2 } from "lucide-react";
import { useMemo, useState } from "react";

type FilterType = "all" | "topup" | "usage" | "bonus";

function toCsv(rows: Array<{ type: string; date: string; amount: number; status: string }>) {
  const header = "type,date,amount,status\n";
  return (
    header +
    rows
      .map((row) => `${row.type},${row.date.replace(/,/g, " ")},${row.amount.toFixed(2)},${row.status}`)
      .join("\n")
  );
}

export default function Wallet() {
  const { creditsRemaining, addCredits, transactions } = useCredits();
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [amount, setAmount] = useState("50");
  const [filter, setFilter] = useState<FilterType>("all");

  const monthlyBudget = 500000;
  const used = Math.max(0, monthlyBudget - creditsRemaining);
  const usedPercent = Math.min(100, Math.round((used / monthlyBudget) * 100));
  const budgetWarning = usedPercent >= 80;

  const rows = useMemo(() => {
    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type === "purchase" ? "Topup" : tx.type === "usage" ? "Usage" : "Bonus",
      date: tx.date,
      amount: tx.type === "usage" ? Math.abs(tx.creditsChange) / 100 : tx.amount,
      status: tx.type === "usage" ? "Completed" : "Settled",
      originalType: tx.type,
      creditsChange: tx.creditsChange,
    }));
  }, [transactions]);

  const filteredRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "topup") return row.type === "Topup";
    if (filter === "usage") return row.type === "Usage";
    return row.type === "Bonus";
  });

  const handleAddCredits = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    addCredits(value, "Manual top-up", "purchase");
    showCreditsAddedToast(value, Math.floor(value * 100));
    setShowAddCreditsModal(false);
  };

  const exportCsv = () => {
    const csv = toCsv(filteredRows);
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

  return (
    <>
      <AppShell
        title="Credits & Wallet"
        subtitle="Billing-grade credit controls and transaction ledger"
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
              onClick={exportCsv}
              className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Download size={16} className="mr-2" />
              Download CSV
            </Button>
            <Button onClick={() => setShowAddCreditsModal(true)} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
              <Plus size={16} className="mr-2" />
              Add Credit
            </Button>
          </div>
        }
      >
        <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="text-sm text-gray-400">Credit Balance</p>
              <p className="mt-2 text-5xl font-semibold text-white">
                <AnimatedCounter value={creditsRemaining} />
              </p>
              <p className="mt-2 text-xs text-gray-500">Available for API inference and orchestration execution.</p>
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
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)] text-left text-gray-500">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-[rgba(255,255,255,0.05)] text-gray-200">
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          row.type === "Usage"
                            ? "bg-red-500/15 text-red-300"
                            : row.type === "Topup"
                              ? "bg-blue-500/15 text-blue-300"
                              : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{row.date}</td>
                    <td className="px-3 py-2">
                      {row.type === "Usage" ? "-" : "+"}${row.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{row.status}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                      No transactions for selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>

      <Modal
        open={showAddCreditsModal}
        onOpenChange={setShowAddCreditsModal}
        title="Add Credits"
        description="Top up your credit wallet"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddCreditsModal(false)} className="border-[rgba(255,255,255,0.1)] text-white">
              Cancel
            </Button>
            <Button onClick={handleAddCredits} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
              <Wallet2 size={16} className="mr-2" />
              Confirm Top Up
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-sm text-gray-300">Amount (USD)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white focus:outline-none focus:border-[rgba(192,192,192,0.5)]"
          />
          <p className="text-xs text-gray-500">1 USD = 100 credits</p>
        </div>
      </Modal>
    </>
  );
}
