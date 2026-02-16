import { Button } from "@/components/ui/button";
import { Send, Settings, Copy, Check, AlertCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useCredits } from "@/contexts/CreditsContext";
import { estimatePlaygroundCredits } from "@/lib/creditsEstimator";
import { showSuccessToast, showErrorToast, showLoadingToast, dismissToast } from "@/lib/toast";
import { getChatHistory, saveChatHistory, addMessage, clearChatHistory, initializeChatIfEmpty, ChatMessage } from "@/lib/chatPersistence";
import { simulateAPICall } from "@/lib/simulatedAPI";
import TypingIndicator from "@/components/TypingIndicator";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Playground() {
  const { creditsRemaining, selectedMode, deductCredits, getModeMultiplier } = useCredits();
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const PROJECT_ID = "playground";

  useEffect(() => {
    const initialMessages = initializeChatIfEmpty(PROJECT_ID);
    setMessages(initialMessages);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const modeMultiplier = getModeMultiplier();
    const estimation = estimatePlaygroundCredits(input, modeMultiplier);
    const estimatedCredits = estimation.estimatedCredits;
    if (creditsRemaining < estimatedCredits) {
      showErrorToast("Insufficient", `Need ${estimatedCredits}, have ${creditsRemaining}`);
      return;
    }
    const success = deductCredits(estimatedCredits, `Playground`);
    if (!success) return;
    
    setIsRunning(true);
    const userMsg = addMessage(PROJECT_ID, "user", input);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    
    setMessages((prev) => [...prev, { id: "typing", role: "system", content: "", timestamp: "" }]);
    
    const response = await simulateAPICall();
    
    setMessages((prev) => prev.filter((m) => m.id !== "typing"));
    
    if (response.isError) {
      const errorMsg = addMessage(PROJECT_ID, "assistant", response.errorMessage || "Error", true);
      setMessages((prev) => [...prev, errorMsg]);
      showErrorToast("API Error", response.errorMessage || "Request failed");
    } else {
      const assistantMsg = addMessage(PROJECT_ID, "assistant", response.content);
      setMessages((prev) => [...prev, assistantMsg]);
      showSuccessToast("Done", `Used ${estimatedCredits} credits`);
    }
    setIsRunning(false);
  };

  const handleClearChat = () => {
    clearChatHistory(PROJECT_ID);
    const initialMessages = initializeChatIfEmpty(PROJECT_ID);
    setMessages(initialMessages);
    setShowClearConfirm(false);
    showSuccessToast("Chat cleared", "Conversation history has been reset");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div className="flex justify-between items-center" variants={itemVariants}>
            <div>
              <h1 className="text-3xl font-bold text-white">Playground</h1>
              <p className="text-gray-400 mt-2">Test and experiment with your AI model</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="outline"
                className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                <Trash2 size={18} />
              </Button>
              <Button
                variant="outline"
                className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                <Settings size={18} />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <motion.div
          className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Messages */}
          <motion.div className="flex-1 overflow-y-auto space-y-6 mb-8" variants={itemVariants}>
            {messages.map((msg, idx) => {
              if (msg.id === "typing") return <TypingIndicator key={idx} />;
              return (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-[#c0c0c0]/20 border border-[#c0c0c0]/30 text-white"
                        : msg.error
                        ? "bg-red-500/10 border border-red-500/30 text-red-400"
                        : "bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">{msg.content}</div>
                      {msg.error && <AlertCircle size={16} className="flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{msg.timestamp}</div>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Credits Estimation */}
          {input.trim() && (
            <motion.div className="mb-4 p-3 rounded-lg bg-[#11161D] border border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
              <div className="text-xs text-[rgba(255,255,255,0.68)] mb-2">
                Estimated: {estimatePlaygroundCredits(input, getModeMultiplier()).estimatedCredits} credits
              </div>
              {creditsRemaining < estimatePlaygroundCredits(input, getModeMultiplier()).estimatedCredits && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle size={14} />
                  Insufficient credits
                </div>
              )}
            </motion.div>
          )}

          {/* Input Area */}
          <motion.div className="flex gap-3" variants={itemVariants}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              disabled={isRunning}
              className="flex-1 px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition disabled:opacity-50"
            />
            <Button
              onClick={handleSend}
              disabled={isRunning}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold disabled:opacity-50"
            >
              <Send size={18} />
            </Button>
          </motion.div>
        </motion.div>

        {/* Settings Panel */}
        <motion.div
          className="w-80 border-l border-[rgba(255,255,255,0.06)] p-8 overflow-y-auto hidden lg:block"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-white mb-6">Settings</h3>
          
          <div className="space-y-6">
            {/* Model */}
            <div>
              <label className="text-sm font-medium text-gray-300">Model</label>
              <select className="w-full mt-2 px-3 py-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(255,255,255,0.12)] focus:outline-none">
                <option>GPT-4</option>
                <option>GPT-3.5</option>
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-sm font-medium text-gray-300">Temperature</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                defaultValue="0.7"
                className="w-full mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">0.7</p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="text-sm font-medium text-gray-300">Max Tokens</label>
              <input
                type="number"
                defaultValue="2000"
                className="w-full mt-2 px-3 py-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(255,255,255,0.12)] focus:outline-none"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="text-sm font-medium text-gray-300">System Prompt</label>
              <textarea
                defaultValue="You are a helpful AI assistant."
                className="w-full mt-2 px-3 py-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition resize-none h-24"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Clear Chat Confirmation */}
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear Chat History"
        description="Are you sure you want to clear all messages? This action cannot be undone."
        confirmText="Clear"
        onConfirm={handleClearChat}
        isDangerous
      />
    </div>
  );
}
