import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useLocation } from "wouter";

export default function ProjectOverview() {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mockProject = {
    id: "proj_1234567890",
    name: "Customer Support Bot",
    description: "AI-powered customer support automation",
    status: "Active",
    created: "2 weeks ago",
    model: "GPT-4",
    version: "v1.2.3",
    credits: "1,250/month",
    apiCalls: "12,450",
  };

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
          <motion.div className="flex items-center gap-4 mb-6" variants={itemVariants}>
            <button
              onClick={() => setLocation("/app/projects")}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{mockProject.name}</h1>
              <p className="text-gray-400 mt-2">{mockProject.description}</p>
            </div>
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
          {/* Project Info */}
          <motion.div
            className="grid md:grid-cols-2 gap-6"
            variants={itemVariants}
          >
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Project Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Project ID</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-white font-mono">{mockProject.id}</code>
                    <button
                      onClick={() => copyToClipboard(mockProject.id)}
                      className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      {copied ? <Check size={14} className="text-[#c0c0c0]" /> : <Copy size={14} className="text-gray-500" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-white mt-1">
                    <span className="inline-block px-2 py-1 rounded-full bg-[#c0c0c0]/20 text-[#c0c0c0]">
                      {mockProject.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Model</p>
                  <p className="text-sm text-white mt-1">{mockProject.model}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Version</p>
                  <p className="text-sm text-white mt-1">{mockProject.version}</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Usage</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Monthly Credits</p>
                  <p className="text-2xl font-bold text-white mt-2">{mockProject.credits}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total API Calls</p>
                  <p className="text-2xl font-bold text-white mt-2">{mockProject.apiCalls}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div className="flex gap-4" variants={itemVariants}>
            <Button
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold"
              onClick={() => setLocation("/app/projects/1/ai")}
            >
              Open AI Builder
            </Button>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              onClick={() => setLocation("/app/projects/1/keys")}
            >
              <Settings size={18} className="mr-2" />
              Manage Keys
            </Button>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Trash2 size={18} className="mr-2" />
              Delete Project
            </Button>
          </motion.div>

          {/* Tabs */}
          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex gap-8">
                <button className="py-4 px-2 border-b-2 border-[#c0c0c0] text-white font-semibold">
                  Overview
                </button>
                <button className="py-4 px-2 border-b-2 border-transparent text-gray-400 hover:text-white transition">
                  Activity
                </button>
                <button className="py-4 px-2 border-b-2 border-transparent text-gray-400 hover:text-white transition">
                  Logs
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { label: "Requests (24h)", value: "2,450", change: "+12%" },
                { label: "Avg Response Time", value: "245ms", change: "-5%" },
                { label: "Success Rate", value: "99.8%", change: "+0.2%" },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-3">{stat.value}</p>
                  <p className="text-xs text-[#c0c0c0] mt-2">{stat.change} from yesterday</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
