import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, AlertCircle, Download, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

/**
 * ALEXZA AI Billing Page
 * Credits management and transaction history
 */

export default function Billing() {
  const [activeTab, setActiveTab] = useState("overview");

  const mockTransactions = [
    {
      id: 1,
      type: "purchase",
      description: "Credit purchase - 50,000 credits",
      amount: "+50,000",
      date: "Feb 5, 2026",
      cost: "$200",
    },
    {
      id: 2,
      type: "usage",
      description: "API usage - Chat completions",
      amount: "-1,250",
      date: "Feb 4, 2026",
      cost: "-$6.25",
    },
    {
      id: 3,
      type: "usage",
      description: "API usage - Embeddings",
      amount: "-850",
      date: "Feb 3, 2026",
      cost: "-$4.25",
    },
    {
      id: 4,
      type: "purchase",
      description: "Trial credits - Free trial",
      amount: "+5,000",
      date: "Jan 28, 2026",
      cost: "$0.00",
    },
  ];

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto flex justify-between items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Billing & Credits</h1>
            <p className="text-gray-400 mt-2">Manage your account credits and billing</p>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2">
              <Plus size={18} /> Buy Credits
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Credits Overview */}
          <motion.div className="grid md:grid-cols-3 gap-6" variants={staggerContainerVariants}>
            {/* Current Balance */}
            <motion.div
              className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[#c0c0c0]/20"
              variants={staggerItemVariants}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400">Current Balance</h3>
                <div className="p-2 rounded-lg bg-[#c0c0c0]/10">
                  <TrendingUp size={18} className="text-[#c0c0c0]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white">270,750</p>
              <p className="text-xs text-gray-500 mt-2">Credits remaining</p>
            </motion.div>

            {/* Monthly Usage */}
            <motion.div
              className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
              variants={staggerItemVariants}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400">This Month</h3>
                <div className="p-2 rounded-lg bg-[#a8a8a8]/10">
                  <ArrowDownLeft size={18} className="text-[#a8a8a8]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white">2,100</p>
              <p className="text-xs text-gray-500 mt-2">Credits used</p>
            </motion.div>

            {/* Estimated Cost */}
            <motion.div
              className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
              variants={staggerItemVariants}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400">Estimated Cost</h3>
                <div className="p-2 rounded-lg bg-[#a8a8a8]/10">
                  <ArrowUpRight size={18} className="text-[#a8a8a8]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white">$10.50</p>
              <p className="text-xs text-gray-500 mt-2">This month</p>
            </motion.div>
          </motion.div>

          {/* Warning */}
          <motion.div
            className="p-4 rounded-lg bg-[#a8a8a8]/5 border border-[#a8a8a8]/20 flex items-start gap-3"
            variants={itemVariants}
          >
            <AlertCircle size={20} className="text-[#a8a8a8] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">Low credit balance</h4>
              <p className="text-sm text-gray-400 mt-1">
                Your credits will run out in approximately 128 days at current usage rates.
              </p>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div className="border-b border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
            <div className="flex gap-8">
              {["overview", "transactions", "invoices"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 transition capitalize ${
                    activeTab === tab
                      ? "border-[#c0c0c0] text-white"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Transactions */}
          {activeTab === "transactions" && (
            <motion.div className="space-y-4" variants={staggerContainerVariants}>
              {mockTransactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  className="p-4 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition flex items-center justify-between"
                  variants={staggerItemVariants}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        tx.type === "purchase"
                          ? "bg-[#c0c0c0]/10"
                          : "bg-[#a8a8a8]/10"
                      }`}
                    >
                      {tx.type === "purchase" ? (
                        <ArrowDownLeft size={18} className="text-[#c0c0c0]" />
                      ) : (
                        <ArrowUpRight size={18} className="text-[#a8a8a8]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.type === "purchase"
                          ? "text-[#c0c0c0]"
                          : "text-[#a8a8a8]"
                      }`}
                    >
                      {tx.amount}
                    </p>
                    <p className="text-xs text-gray-500">{tx.cost}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Invoices */}
          {activeTab === "invoices" && (
            <motion.div className="space-y-4" variants={staggerContainerVariants}>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="p-4 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition flex items-center justify-between"
                  variants={staggerItemVariants}
                >
                  <div>
                    <p className="font-semibold text-white">Invoice #{1000 + i}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(2026, 1, 10 - i).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">${(50 + i * 10).toFixed(2)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Overview */}
          {activeTab === "overview" && (
            <motion.div className="space-y-6" variants={staggerContainerVariants}>
              <motion.div
                className="p-6 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]"
                variants={staggerItemVariants}
              >
                <h3 className="font-semibold text-white mb-4">Billing Information</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>
                    <span className="text-gray-500">Account Type:</span> Pay-as-you-go
                  </p>
                  <p>
                    <span className="text-gray-500">Billing Cycle:</span> Monthly
                  </p>
                  <p>
                    <span className="text-gray-500">Next Billing Date:</span> March 1, 2026
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
