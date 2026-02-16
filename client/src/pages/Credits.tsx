import { Button } from "@/components/ui/button";
import { Bell, Home, MessageSquare, Settings, Zap, Plus, AlertCircle, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";

/**
 * ALEXZA AI Credits Page
 * Display credits remaining, usage history, and trial information
 * 
 * Design: Futuristic AI SaaS with glass-morphism panels
 */

export default function Credits() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0b0e12] border-r border-[rgba(255,255,255,0.06)] p-4 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c0c0c0] to-[#a8a8a8] flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-bold text-white">ALEXZA</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {[
            { icon: <Home size={20} />, label: "Dashboard" },
            { icon: <MessageSquare size={20} />, label: "Chat Builder" },
            { icon: <Zap size={20} />, label: "Credits", active: true },
            { icon: <Settings size={20} />, label: "Settings" },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                item.active
                  ? "bg-[#c0c0c0] text-black"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-[rgba(255,255,255,0.06)] bg-[#050607]/80 backdrop-blur-md px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Credits & Billing</h1>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-[#0b0e12] transition">
              <Bell size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="space-y-8">
            {/* Credits Remaining Hero */}
            <div className="p-12 rounded-lg bg-gradient-to-br from-[#c0c0c0]/20 to-[#a8a8a8]/20 border border-[#c0c0c0] relative overflow-hidden">
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#c0c0c0] rounded-full blur-3xl opacity-5"></div>
              </div>
              
              <p className="text-sm font-semibold text-gray-400 mb-4">Credits Remaining</p>
              <div className="text-6xl font-bold text-white mb-8">170,000</div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black h-12 px-8 text-base font-semibold flex items-center gap-2 w-full sm:w-auto">
                    <Plus size={20} /> Add Credits
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="border-[#c0c0c0] text-white hover:bg-[#c0c0c0]/10 h-12 px-8 text-base font-semibold w-full sm:w-auto">
                    View Plans
                  </Button>
                </motion.div>
              </div>

              <motion.div 
                className="grid md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
                  <p className="text-xs text-gray-400 mb-2">Monthly Limit</p>
                  <p className="text-2xl font-bold text-white">500,000</p>
                </motion.div>
                <motion.div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
                  <p className="text-xs text-gray-400 mb-2">Used This Month</p>
                  <p className="text-2xl font-bold text-white">330,000</p>
                </motion.div>
                <motion.div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
                  <p className="text-xs text-gray-400 mb-2">Resets In</p>
                  <p className="text-2xl font-bold text-white">23 days</p>
                </motion.div>
              </motion.div>
            </div>

            {/* Trial Banner */}
            <motion.div 
              className="p-6 rounded-lg bg-gradient-to-r from-[#a8a8a8]/20 to-[#c0c0c0]/20 border border-[#a8a8a8] flex items-start gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <AlertCircle className="w-6 h-6 text-[#a8a8a8] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Free Trial Ending Soon</h3>
                <p className="text-sm text-gray-300 mb-4">Your free trial ends in 7 days. Upgrade to a paid plan to continue using ALEXZA AI.</p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-[#a8a8a8] hover:bg-[#7c3aed] text-white text-sm">Upgrade Now</Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Credits Transactions */}
            <div className="p-8 rounded-lg bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Credits Transactions Table</h3>
                <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition">
                  <MoreHorizontal size={20} className="text-gray-400" />
                </button>
              </div>

              <motion.div 
                className="overflow-x-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)]">
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Date</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Type</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Timeframe</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: "Feb 10, 2026", type: "Usage", timeframe: "Daily", credits: "-15,234" },
                      { date: "Feb 09, 2026", type: "Usage", timeframe: "Daily", credits: "-12,456" },
                      { date: "Feb 08, 2026", type: "Purchase", timeframe: "One-time", credits: "+100,000" },
                      { date: "Feb 07, 2026", type: "Usage", timeframe: "Daily", credits: "-8,901" },
                      { date: "Feb 06, 2026", type: "Bonus", timeframe: "Monthly", credits: "+50,000" },
                      { date: "Feb 05, 2026", type: "Usage", timeframe: "Daily", credits: "-3,567" },
                    ].map((transaction, i) => (
                      <tr key={i} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)]/50 transition">
                        <td className="py-4 px-4 text-white">{transaction.date}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.type === "Usage" ? "bg-red-500/20 text-red-400" :
                            transaction.type === "Purchase" ? "bg-blue-500/20 text-blue-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400">{transaction.timeframe}</td>
                        <td className={`py-4 px-4 text-right font-semibold ${
                          transaction.credits.startsWith("+") ? "text-green-400" : "text-red-400"
                        }`}>
                          {transaction.credits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            </div>

            {/* Pricing Tiers */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-6">Upgrade Your Plan</h3>
              <motion.div 
                className="grid md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  { name: "Starter", price: "$99", credits: "100,000", features: ["Bulk Orchestration", "Standard Support", "Community Access"] },
                  { name: "Pro", price: "$299", credits: "500,000", features: ["Advanced File Builder", "Priority Support", "Custom Integrations"], highlighted: true },
                  { name: "Enterprise", price: "Custom", credits: "Unlimited", features: ["Full Platform Access", "24/7 Support", "Dedicated Account Manager"] },
                ].map((tier, i) => (
                  <motion.div
                    key={i}
                    className={`p-8 rounded-lg border transition-all ${
                      tier.highlighted
                        ? "bg-gradient-to-br from-[#c0c0c0]/20 to-[#a8a8a8]/20 border-[#c0c0c0] shadow-lg shadow-[#c0c0c0]/20"
                        : "bg-gradient-to-br from-[#0b0e12] to-[#050607] border-[rgba(255,255,255,0.06)]"
                    }`}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-2">{tier.name}</h4>
                    <div className="text-3xl font-bold text-white mb-2">{tier.price}<span className="text-lg text-gray-400">/mo</span></div>
                    <p className="text-sm text-gray-400 mb-6">{tier.credits} credits/month</p>
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, j) => (
                        <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0]"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        className={`w-full ${
                          tier.highlighted
                            ? "bg-[#c0c0c0] hover:bg-[#a8a8a8]"
                            : "bg-[#0b0e12] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)]"
                        } text-white`}
                      >
                        {tier.highlighted ? "Choose Pro" : "Get Started"}
                      </Button>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
