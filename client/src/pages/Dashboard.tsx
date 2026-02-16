import { Button } from "@/components/ui/button";
import { BarChart3, Bell, ChevronDown, Home, MessageSquare, Settings, Zap, Plus, MoreHorizontal, TrendingUp, FileText, CreditCard } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";

/**
 * ALEXZA AI Dashboard
 * Main dashboard with sidebar navigation and content area
 * 
 * Design: Futuristic AI SaaS with glass-morphism panels
 */

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { icon: <Home size={20} />, label: "Dashboard", path: "/app/dashboard", active: true },
    { icon: <FileText size={20} />, label: "Projects", path: "/app/projects" },
    { icon: <Zap size={20} />, label: "Credits", path: "/app/billing/credits" },
    { icon: <CreditCard size={20} />, label: "Billing", path: "/app/billing/plans" },
    { icon: <Settings size={20} />, label: "Settings", path: "/app/settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} transition-all duration-300 bg-[#0b0e12] border-r border-[rgba(255,255,255,0.06)] p-4 flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c0c0c0] to-[#a8a8a8] flex items-center justify-center text-white font-bold">
            A
          </div>
          {sidebarOpen && <span className="font-bold text-white">ALEXZA</span>}
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {navItems.map((item, i) => (
            <a
              key={i}
              href={item.path}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                item.active
                  ? "bg-[#c0c0c0] text-black"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </a>
          ))}
        </nav>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-white transition"
        >
          <ChevronDown size={20} className={`transition-transform ${!sidebarOpen ? "rotate-90" : ""}`} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-[rgba(255,255,255,0.06)] bg-[#050607]/80 backdrop-blur-md px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome back to your AI orchestration platform</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Mode Selector */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
              <span className="text-sm text-gray-300">Mode:</span>
              <button className="flex items-center gap-1 text-white font-medium hover:text-[#c0c0c0] transition">
                Production <ChevronDown size={16} />
              </button>
            </div>

            {/* Credits Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#c0c0c0]/20 to-[#a8a8a8]/20 border border-[#c0c0c0]">
              <Zap size={18} className="text-[#c0c0c0]" />
              <span className="text-sm font-semibold text-white">270,750 Credits</span>
            </div>

            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-[#0b0e12] transition">
              <Bell size={20} className="text-gray-400 hover:text-white" />
            </button>

            {/* User Menu */}
            <button className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c0c0c0] to-[#a8a8a8] flex items-center justify-center text-white font-semibold">
              U
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="p-8 rounded-lg bg-gradient-to-r from-[#c0c0c0]/10 to-[#a8a8a8]/10 border border-[rgba(255,255,255,0.06)]">
              <h2 className="text-xl font-semibold text-white mb-2">Welcome header</h2>
              <p className="text-gray-400 text-sm">Here you can track your AI systems and manage your workflows</p>
            </div>

            {/* Credits Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-lg bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Credits Remaining</h3>
                <div className="text-5xl font-bold text-white mb-4">270,750</div>
                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black text-sm">Add Credits</Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12] text-sm">View Plans</Button>
                  </motion.div>
                </div>
              </div>

              <div className="p-8 rounded-lg bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Quick actions</h3>
                <div className="space-y-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                    <Button className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black justify-start">
                      <Plus size={18} className="mr-2" /> New Workflow
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="w-full border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12] justify-start">
                      <MessageSquare size={18} className="mr-2" /> Chat Builder
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="p-8 rounded-lg bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                <button className="text-gray-400 hover:text-white">
                  <MoreHorizontal size={20} />
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
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Project Name</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Last used</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Customer Support Bot", status: "Running", lastUsed: "2 hours ago", credits: "5,234" },
                      { name: "Document Analyzer", status: "Paused", lastUsed: "5 hours ago", credits: "12,456" },
                      { name: "Image Recognition", status: "Running", lastUsed: "1 hour ago", credits: "8,901" },
                      { name: "Predictive Model", status: "Completed", lastUsed: "1 day ago", credits: "3,567" },
                    ].map((project, i) => (
                      <tr key={i} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)]/50 transition">
                        <td className="py-3 px-4 text-white font-medium">{project.name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                            project.status === "Running" ? "bg-green-500/20 text-green-400" :
                            project.status === "Paused" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-gray-500/20 text-gray-400"
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              project.status === "Running" ? "bg-green-400" :
                              project.status === "Paused" ? "bg-yellow-400" :
                              "bg-gray-400"
                            }`}></div>
                            {project.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{project.lastUsed}</td>
                        <td className="py-3 px-4 text-gray-400">{project.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            </div>

            {/* Analytics Preview */}
            <div className="p-8 rounded-lg bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-lg font-semibold text-white mb-6">Usage Analytics</h3>
              <motion.div 
                className="grid md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  { label: "Total Requests", value: "1,234,567", change: "+12.5%" },
                  { label: "Avg Response Time", value: "245ms", change: "-8.2%" },
                  { label: "Success Rate", value: "99.8%", change: "+0.3%" },
                ].map((stat, i) => (
                  <motion.div key={i} className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
                    <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <TrendingUp size={16} />
                        {stat.change}
                      </div>
                    </div>
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
