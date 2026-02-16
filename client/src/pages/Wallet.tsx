import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, History, AlertCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";
import { useForm } from "@/hooks/useForm";
import { ValidationError } from "@/lib/validation";
import Modal from "@/components/Modal";
import { showCreditsAddedToast } from "@/lib/toast";
import { useCredits } from "@/contexts/CreditsContext";

/**
 * ALEXZA AI Wallet Page
 * Design: Monochrome metallic theme
 * - View available credits and balance
 * - Add credits modal with validation
 * - Transaction history
 */

interface AddCreditsFormData {
  amount: string;
  note: string;
}

export default function Wallet() {
  const { creditsRemaining, addCredits, transactions } = useCredits();
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);

  const form = useForm<AddCreditsFormData>({
    initialValues: {
      amount: "",
      note: "",
    },
    validate: (values) => {
      const errors: ValidationError[] = [];
      if (!values.amount) {
        errors.push({ field: "amount", message: "Amount is required" });
      } else if (isNaN(Number(values.amount)) || Number(values.amount) <= 0) {
        errors.push({ field: "amount", message: "Please enter a valid amount" });
      }
      return { isValid: errors.length === 0, errors };
    },
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const amount = Number(values.amount);
      const addedCredits = Math.floor(amount * 100);
      addCredits(amount, "Credit Purchase", "purchase");
      showCreditsAddedToast(amount, addedCredits);
      setShowAddCreditsModal(false);
      form.reset();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Credits & Wallet</h1>
            <p className="text-gray-400 mt-2">Manage your credits and billing</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-8"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Balance Card */}
          <motion.div
            className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <p className="text-sm text-gray-500 mb-2">Available Credits</p>                <div className="text-4xl font-bold text-white">{creditsRemaining.toLocaleString()}</div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <p className="text-xs text-gray-500">Monthly Limit</p>
                <p className="text-2xl font-bold text-white mt-2">$5,000</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Used This Month</p>
                <p className="text-2xl font-bold text-white mt-2">$1,250.50</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Remaining</p>
                <p className="text-2xl font-bold text-[#c0c0c0] mt-2">$3,749.50</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setShowAddCreditsModal(true)}
                className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2"
              >
                <Plus size={18} /> Add Credits
              </Button>
              <Button
                variant="outline"
                className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                <TrendingDown size={18} className="mr-2" /> Set Budget Alert
              </Button>
            </div>
          </motion.div>

          {/* Usage Progress */}
          <motion.div
            className="p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <p className="text-sm text-gray-500 mb-4">Monthly Usage</p>
            <div className="w-full bg-[#050607] rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#c0c0c0] to-[#a8a8a8] h-full rounded-full"
                style={{ width: "25%" }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3">$1,250.50 / $5,000 (25%)</p>
          </motion.div>

          {/* Transactions */}
          <motion.div
            className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <div className="flex items-center gap-2 mb-6">
              <History size={20} className="text-[#c0c0c0]" />
              <h3 className="text-lg font-semibold text-white">Transaction History</h3>
            </div>

            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] flex items-center justify-between hover:border-[rgba(255,255,255,0.12)] transition"
                >
                  <div>
                    <p className="text-white font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === "usage" ? "text-red-400" : "text-[#c0c0c0]"}`}>
                      {tx.creditsChange > 0 ? '+' : ''}{tx.creditsChange}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Add Credits Modal */}
      <Modal
        open={showAddCreditsModal}
        onOpenChange={setShowAddCreditsModal}
        title="Add Credits"
        description="Purchase credits to use our platform"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddCreditsModal(false)}
              disabled={form.isSubmitting}
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={form.isSubmitting}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => form.handleSubmit(e as any)}
            >
              {form.isSubmitting ? "Processing..." : "Add Credits"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Amount ($)</label>
            <input
              type="number"
              name="amount"
              value={form.values.amount}
              onChange={form.handleChange}
              placeholder="e.g., 50"
              disabled={form.isSubmitting}
              step="0.01"
              min="0"
                className={`w-full px-4 py-3 rounded-lg bg-[#050607] border transition text-white placeholder-gray-600 focus:outline-none ${
                form.errors && form.errors.find((e) => e.field === "amount")
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
              } disabled:opacity-50`}
            />
            {form.errors && form.errors.find((e) => e.field === "amount") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{form.errors.find((e) => e.field === "amount")?.message}</p>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Note (Optional)</label>
            <textarea
              name="note"
              value={form.values.note}
              onChange={form.handleChange}
              placeholder="Add a note for this purchase..."
              disabled={form.isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition resize-none h-16 disabled:opacity-50"
            />
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-[#c0c0c0]/5 border border-[#c0c0c0]/20">
            <p className="text-xs text-gray-300">
              1 credit = $0.01. Credits are added instantly to your account.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
