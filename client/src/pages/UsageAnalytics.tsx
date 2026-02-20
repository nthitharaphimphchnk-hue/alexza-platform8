import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

export default function UsageAnalytics() {
  const mockData = {
    totalRequests: "24,580",
    avgLatency: "245ms",
    successRate: "99.8%",
    costThisMonth: "$1,250.50",
  };

  const dailyData = [
    { day: "Mon", requests: 3200, cost: 160 },
    { day: "Tue", requests: 3500, cost: 175 },
    { day: "Wed", requests: 2800, cost: 140 },
    { day: "Thu", requests: 4100, cost: 205 },
    { day: "Fri", requests: 3900, cost: 195 },
    { day: "Sat", requests: 2400, cost: 120 },
    { day: "Sun", requests: 4680, cost: 255 },
  ];

  const maxRequests = Math.max(...dailyData.map((d) => d.requests));

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
            <h1 className="text-3xl font-bold text-white">Usage Analytics</h1>
            <p className="text-gray-400 mt-2">Track your API usage and costs</p>
          </motion.div>
          <motion.div className="flex gap-2" variants={itemVariants}>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Calendar size={18} className="mr-2" /> Last 30 Days
            </Button>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Download size={18} />
            </Button>
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
          {/* Stats Grid */}
          <motion.div className="grid md:grid-cols-4 gap-6" variants={staggerItemVariants}>
            {[
              { label: "Total Requests", value: mockData.totalRequests },
              { label: "Avg Latency", value: mockData.avgLatency },
              { label: "Success Rate", value: mockData.successRate },
              { label: "Cost This Month", value: mockData.costThisMonth },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
              >
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-3">{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Chart */}
          <motion.div
            className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <h3 className="text-lg font-semibold text-white mb-6">Daily Requests</h3>
            <div className="flex items-end justify-between h-64 gap-2">
              {dailyData.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-[#c0c0c0] to-[#a8a8a8] rounded-t-lg transition hover:from-[#a8a8a8] hover:to-[#909090]"
                    style={{ height: `${(data.requests / maxRequests) * 100}%` }}
                  />
                  <p className="text-xs text-gray-500">{data.day}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Detailed Table */}
          <motion.div
            className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <h3 className="text-lg font-semibold text-white mb-6">Daily Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Day</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Requests</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Cost</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((data, i) => (
                    <tr key={i} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-3 px-4 text-white">{data.day}</td>
                      <td className="text-right py-3 px-4 text-white">{data.requests.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-white">${data.cost.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-gray-400">~250ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
