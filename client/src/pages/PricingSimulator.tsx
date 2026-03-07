/**
 * AI Cost Simulator - Estimate credit usage and cost before running actions
 */

import { Button } from "@/components/ui/button";
import { Calculator, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  containerVariants,
  itemVariants,
} from "@/lib/animations";
import Logo from "@/components/Logo";
import { fetchPublicConfig } from "@/api/config";
import { fetchPublicPricing, getUsdForCredits, type PricingTier } from "@/api/pricing";
import { DEFAULT_TOKENS_PER_CREDIT } from "@/api/config";

const DEFAULT_VOLUME_TIERS: PricingTier[] = [
  { minCredits: 0, price: 0.003 },
  { minCredits: 10_000, price: 0.0027 },
  { minCredits: 100_000, price: 0.0024 },
];

const COMMON_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
  "meta-llama/llama-3.2-3b-instruct",
];

function creditsFromTokens(tokens: number, tokensPerCredit: number): number {
  return Math.max(1, Math.ceil(tokens / tokensPerCredit));
}

export default function PricingSimulator() {
  const [tokensPerCredit, setTokensPerCredit] = useState(DEFAULT_TOKENS_PER_CREDIT);
  const [volumeTiers, setVolumeTiers] = useState<PricingTier[]>(DEFAULT_VOLUME_TIERS);
  const [model, setModel] = useState(COMMON_MODELS[0] ?? "");
  const [avgTokens, setAvgTokens] = useState(1500);
  const [numRequests, setNumRequests] = useState(1000);

  useEffect(() => {
    fetchPublicConfig()
      .then((res) => {
        if (res.ok && typeof res.creditsPerThousandTokens === "number" && res.creditsPerThousandTokens > 0) {
          setTokensPerCredit(res.creditsPerThousandTokens);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPublicPricing()
      .then((res) => {
        if (res.ok && Array.isArray(res.tiers) && res.tiers.length > 0) {
          setVolumeTiers(res.tiers);
        }
      })
      .catch(() => {});
  }, []);

  const creditsPerRequest = creditsFromTokens(avgTokens, tokensPerCredit);
  const totalCredits = numRequests * creditsPerRequest;
  const estimatedCost = getUsdForCredits(totalCredits, volumeTiers);

  return (
    <div className="min-h-screen text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050607]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size="navbar" />
          <div className="flex items-center gap-4">
            <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">
              Pricing
            </a>
            <a href="/docs" className="text-sm text-gray-300 hover:text-white transition">
              Docs
            </a>
            <a href="/" className="text-sm text-gray-300 hover:text-white transition">
              Home
            </a>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12]"
              onClick={() => (window.location.href = "/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050607] via-[#0a0c0f] to-transparent" />
        <motion.div
          className="max-w-2xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 className="hero-title-gradient font-brand text-5xl font-extrabold tracking-tight" variants={itemVariants}>
            AI Cost Simulator
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            Estimate credit usage and cost before running AI actions. Uses real pricing from our volume discount tiers.
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto p-8 lg:p-12">
        <motion.div
          className="grid lg:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6 space-y-6"
            variants={itemVariants}
          >
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Calculator size={20} />
              Inputs
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              >
                {COMMON_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                All models use the same credit rate: 1 credit = {tokensPerCredit.toLocaleString()} tokens
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Average tokens per request</label>
              <input
                type="number"
                min={1}
                max={1_000_000}
                value={avgTokens}
                onChange={(e) => setAvgTokens(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              />
              <p className="text-xs text-gray-500">
                Input + output tokens. Typical: 500–3000 for short completions, 2000–8000 for summaries.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Number of requests</label>
              <input
                type="number"
                min={1}
                max={100_000_000}
                value={numRequests}
                onChange={(e) => setNumRequests(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              />
            </div>
          </motion.div>

          <motion.div
            className="rounded-xl border-2 border-[#c0c0c0]/30 bg-[#0b0e12] p-6 space-y-6"
            variants={itemVariants}
          >
            <h2 className="text-xl font-semibold text-white">Estimate</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-gray-400">Credits per request</span>
                <span className="text-white font-mono font-medium">{creditsPerRequest.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[rgba(255,255,255,0.06)]">
                <span className="text-gray-400">Total credits required</span>
                <span className="text-white font-mono font-medium">{totalCredits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-4">
                <span className="text-gray-300 font-medium">Estimated cost</span>
                <span className="text-2xl font-bold text-[#c0c0c0]">${estimatedCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-[#050607]/50 border border-[rgba(255,255,255,0.06)] p-4 text-sm text-gray-400">
              <p>
                Cost uses volume discount tiers. Larger usage gets better rates.{" "}
                <a href="/pricing" className="text-[#c0c0c0] hover:text-white underline">
                  View pricing tiers
                </a>
              </p>
            </div>

            <Button
              className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold"
              onClick={() => (window.location.href = "/app/billing/credits")}
            >
              Add Credits
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-white mb-4">How it works</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li>• 1 credit = {tokensPerCredit.toLocaleString()} tokens (input + output)</li>
            <li>• Credits per request = ⌈tokens ÷ {tokensPerCredit.toLocaleString()}⌉ (minimum 1)</li>
            <li>• Total credits = requests × credits per request</li>
            <li>• Cost = credits × tier price (volume discounts apply)</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
