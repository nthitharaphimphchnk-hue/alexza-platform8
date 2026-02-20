import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, Home, MessageSquare, Settings, Zap, Send, Plus, Copy, Code, MoreHorizontal, AlertCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useCredits } from "@/contexts/CreditsContext";
import { estimateAIBuilderCredits } from "@/lib/creditsEstimator";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

/**
 * ALEXZA AI Chat Builder
 * Split-screen interface with chat on left and API spec on right
 * 
 * Design: Futuristic AI SaaS with glass-morphism panels
 */

export default function ChatBuilder() {
  const { creditsRemaining, selectedMode, deductCredits, getModeMultiplier } = useCredits();
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", content: "Hello! I'm your AI assistant. How can I help you build your workflow today?" },
    { id: 2, role: "user", content: "I want to create a chatbot for customer support" },
    { id: 3, role: "assistant", content: "Great! I can help you with that. Let me generate the API specification for your customer support chatbot." },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { id: messages.length + 1, role: "user", content: input }]);
      setInput("");
      setTimeout(() => {
        setMessages(prev => [...prev, { id: prev.length + 1, role: "assistant", content: "I've updated your API specification based on your request." }]);
      }, 500);
    }
  };

  const handleApplyAPI = () => {
    const estimatedCredits = estimateAIBuilderCredits(getModeMultiplier());
    if (creditsRemaining < estimatedCredits) {
      showErrorToast("Insufficient credits", `Need ${estimatedCredits}, have ${creditsRemaining}`);
      return;
    }
    const success = deductCredits(estimatedCredits, `AI Builder Apply (${selectedMode})`);
    if (success) {
      showSuccessToast("API applied", `Used ${estimatedCredits} credits`);
    }
  };

  return (
    <div className="min-h-screen text-foreground flex">
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
            { icon: <MessageSquare size={20} />, label: "Chat Builder", active: true },
            { icon: <Zap size={20} />, label: "Workflows" },
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
          <h1 className="text-2xl font-bold text-white">Chat Builder</h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
              <Zap size={18} className="text-[#c0c0c0]" />
              <span className="text-sm font-semibold text-white">{creditsRemaining.toLocaleString()} Credits</span>
            </div>

            <button className="p-2 rounded-lg hover:bg-[#0b0e12] transition">
              <Bell size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Split Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chat */}
          <div className="flex-1 flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#050607]">
            {/* Chat Header */}
            <div className="border-b border-[rgba(255,255,255,0.06)] px-8 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Chat Thread</h2>
                <p className="text-xs text-gray-400">Customer Support Bot</p>
              </div>
              <button className="p-2 rounded-lg hover:bg-[#0b0e12] transition">
                <MoreHorizontal size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-8 space-y-6">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={`max-w-md px-6 py-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-[#c0c0c0] text-white rounded-br-none"
                        : "bg-[#0b0e12] text-gray-300 border border-[rgba(255,255,255,0.06)] rounded-bl-none"
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Input Area */}
            <div className="border-t border-[rgba(255,255,255,0.06)] px-8 py-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c0c0c0] transition"
                />
                <button
                  onClick={handleSend}
                  className="p-3 rounded-lg bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black transition"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: API Spec Panel */}
          <div className="w-96 flex flex-col border-l border-[rgba(255,255,255,0.06)] bg-[#0b0e12]">
            {/* Panel Header */}
            <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Generated API Spec</h2>
              <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition">
                <Code size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Spec Content */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Endpoint Card 1 */}
              <motion.div 
                className="p-4 rounded-lg bg-gradient-to-br from-[#c0c0c0]/20 to-[#a8a8a8]/20 border border-[#c0c0c0]"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-[#c0c0c0] text-white">POST</span>
                      <code className="text-xs text-gray-300">/api/chat</code>
                    </div>
                    <p className="text-xs text-gray-400">Send message to chatbot</p>
                  </div>
                  <motion.button 
                    className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Copy size={16} className="text-gray-400" />
                  </motion.button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-[#050607] border border-[rgba(255,255,255,0.06)]">
                    <p className="text-gray-400">Request body:</p>
                    <code className="text-[#00a8ff]">{"{ message: string }"}</code>
                  </div>
                </div>
              </motion.div>

              {/* Endpoint Card 2 */}
              <motion.div 
                className="p-4 rounded-lg bg-gradient-to-br from-[#a8a8a8]/20 to-[#c0c0c0]/20 border border-[#a8a8a8]"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-[#a8a8a8] text-white">GET</span>
                      <code className="text-xs text-gray-300">/api/history</code>
                    </div>
                    <p className="text-xs text-gray-400">Get conversation history</p>
                  </div>
                  <motion.button 
                    className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Copy size={16} className="text-gray-400" />
                  </motion.button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-[#050607] border border-[rgba(255,255,255,0.06)]">
                    <p className="text-gray-400">Response:</p>
                    <code className="text-[#a8a8a8]">{"{ messages: Message[] }"}</code>
                  </div>
                </div>
              </motion.div>

              {/* Endpoint Card 3 */}
              <motion.div 
                className="p-4 rounded-lg bg-gradient-to-br from-[#c0c0c0]/20 to-[#a8a8a8]/20 border border-[#c0c0c0]"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-[#c0c0c0] text-white">POST</span>
                      <code className="text-xs text-gray-300">/api/train</code>
                    </div>
                    <p className="text-xs text-gray-400">Train custom model</p>
                  </div>
                  <motion.button 
                    className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Copy size={16} className="text-gray-400" />
                  </motion.button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-[#050607] border border-[rgba(255,255,255,0.06)]">
                    <p className="text-gray-400">Request body:</p>
                    <code className="text-[#00a8ff]">{"{ dataset: File }"}</code>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Panel Footer */}
            <div className="border-t border-[rgba(255,255,255,0.06)] px-6 py-4 space-y-3">
              {creditsRemaining < estimateAIBuilderCredits(getModeMultiplier()) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle size={14} />
                  Insufficient credits to apply
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleApplyAPI} className="flex-1 bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black text-sm">
                  <Plus size={16} className="mr-1" /> Apply API
                </Button>
                <Button variant="outline" className="flex-1 border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] text-sm">
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
