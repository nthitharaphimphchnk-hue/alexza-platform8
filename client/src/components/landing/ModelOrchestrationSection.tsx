import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Zap,
  Settings,
  Layers,
  CheckCircle2,
  Brain,
  Database,
  FileCode,
  Globe,
  Box,
  ArrowRight,
  Copy,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  scrollFadeInVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";

const MODEL_FAMILIES = [
  {
    key: "openai",
    icon: Brain,
    examples: "GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-3.5 Turbo",
    bestFor: "general purpose, tool calling, structured output",
  },
  {
    key: "claude",
    icon: FileCode,
    examples: "Claude 3 Opus, Claude 3.5 Sonnet, Claude 3 Haiku",
    bestFor: "long-form writing, strong reasoning, long documents",
  },
  {
    key: "llama",
    icon: Layers,
    examples: "Llama 3.1 8B, Llama 3.1 70B, Llama 3.2 3B, Llama 3 405B",
    bestFor: "cost-efficient workloads, cheap tier, scalable automation",
  },
  {
    key: "gemini",
    icon: Globe,
    examples: "Gemini 1.5 Pro, Gemini 1.5 Flash",
    bestFor: "very long context, multimodal tasks",
  },
  {
    key: "mistral",
    icon: Zap,
    examples: "Mistral Large, Mixtral 8x7B, Mistral Small",
    bestFor: "low cost, everyday tasks",
  },
  {
    key: "cohere",
    icon: Database,
    examples: "Command R, Command R+",
    bestFor: "RAG, enterprise search",
  },
  {
    key: "opensource",
    icon: Box,
    examples: "DeepSeek, Nous, Qwen, Yi",
    bestFor: "flexible experimentation",
  },
] as const;

export default function ModelOrchestrationSection() {
  const { t } = useTranslation();
  const [traditionalTab, setTraditionalTab] = useState("model");
  const [copied, setCopied] = useState(false);

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 relative"
      data-loc="ModelOrchestrationSection"
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-6xl mx-auto">
        {/* A) Header */}
        <motion.div
          className="text-center mb-16"
          variants={scrollFadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {t("orchestration.header.title")}
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t("orchestration.header.subtitle")}
          </p>
        </motion.div>

        {/* B) Comparison - Two big cards */}
        <motion.div
          className="grid lg:grid-cols-2 gap-8 mb-20"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {/* Left: Traditional AI API Gateway */}
          <motion.div
            className="group rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.12] hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300"
            variants={staggerItemVariants}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/[0.12] bg-[#141414]">
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                {t("orchestration.traditional.title")}
              </h3>
            </div>
            <ul className="space-y-3 mb-6 text-gray-400 text-sm">
              {[
                "bullet1",
                "bullet2",
                "bullet3",
                "bullet4",
                "bullet5",
              ].map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <span className="text-amber-500/80 mt-0.5">•</span>
                  <span>{t(`orchestration.traditional.${key}`)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#050607]">
              <Tabs value={traditionalTab} onValueChange={setTraditionalTab}>
                <TabsList className="w-full justify-start rounded-none border-b border-white/[0.08] bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="model"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500/60 data-[state=active]:text-white px-4 py-3 text-sm text-gray-400"
                  >
                    {t("orchestration.traditional.tabModel")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="fallback"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500/60 data-[state=active]:text-white px-4 py-3 text-sm text-gray-400"
                  >
                    {t("orchestration.traditional.tabFallback")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="cost"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500/60 data-[state=active]:text-white px-4 py-3 text-sm text-gray-400"
                  >
                    {t("orchestration.traditional.tabCost")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="model" className="m-0 p-4">
                  <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
                    <code>
                      <span className="text-purple-400">{"{"}</span>
                      {"\n  "}
                      <span className="text-amber-400">"model"</span>
                      <span className="text-gray-500">: </span>
                      <span className="text-green-400">"gpt-4o"</span>
                      <span className="text-gray-500">,</span>
                      {"\n  "}
                      <span className="text-amber-400">"messages"</span>
                      <span className="text-gray-500">: </span>
                      <span className="text-purple-400">[</span>
                      {"\n    "}
                      <span className="text-purple-400">{"{"}</span>
                      <span className="text-amber-400">"role"</span>
                      <span className="text-gray-500">: </span>
                      <span className="text-green-400">"user"</span>
                      <span className="text-gray-500">, </span>
                      <span className="text-amber-400">"content"</span>
                      <span className="text-gray-500">: </span>
                      <span className="text-green-400">"..."</span>
                      <span className="text-purple-400">{"}"}</span>
                      {"\n  "}
                      <span className="text-purple-400">]</span>
                      {"\n"}
                      <span className="text-purple-400">{"}"}</span>
                    </code>
                  </pre>
                </TabsContent>
                <TabsContent value="fallback" className="m-0 p-4">
                  <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
                    <code>
                      <span className="text-blue-400">try</span>
                      <span className="text-purple-400"> {"{"}</span>
                      {"\n  "}
                      <span className="text-gray-400">result = </span>
                      <span className="text-cyan-400">call</span>
                      <span className="text-purple-400">(</span>
                      <span className="text-green-400">"gpt-4o"</span>
                      <span className="text-purple-400">)</span>
                      {"\n"}
                      <span className="text-blue-400">{"}"} catch</span>
                      <span className="text-purple-400"> {"{"}</span>
                      {"\n  "}
                      <span className="text-gray-400">models = </span>
                      <span className="text-purple-400">[</span>
                      <span className="text-green-400">"claude-3"</span>
                      <span className="text-gray-500">, </span>
                      <span className="text-green-400">"llama-3"</span>
                      <span className="text-purple-400">]</span>
                      {"\n  "}
                      <span className="text-gray-400">result = </span>
                      <span className="text-cyan-400">retryWith</span>
                      <span className="text-purple-400">(</span>
                      <span className="text-gray-400">models</span>
                      <span className="text-purple-400">)</span>
                      {"\n"}
                      <span className="text-purple-400">{"}"}</span>
                    </code>
                  </pre>
                </TabsContent>
                <TabsContent value="cost" className="m-0 p-4">
                  <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
                    <code>
                      <span className="text-gray-500">// token budget check</span>
                      {"\n"}
                      <span className="text-blue-400">if</span>
                      <span className="text-purple-400"> (</span>
                      <span className="text-gray-400">tokens</span>
                      <span className="text-purple-400"> {" > "}</span>
                      <span className="text-amber-400">5000</span>
                      <span className="text-purple-400">) {"{"}</span>
                      {"\n  "}
                      <span className="text-red-400">throw</span>
                      <span className="text-gray-400"> </span>
                      <span className="text-green-400">"Budget exceeded"</span>
                      {"\n"}
                      <span className="text-purple-400">{"}"}</span>
                      {"\n"}
                      <span className="text-gray-500">// manual cost guard</span>
                      {"\n"}
                      <span className="text-gray-400">cost = </span>
                      <span className="text-cyan-400">estimateCost</span>
                      <span className="text-purple-400">(</span>
                      <span className="text-gray-400">input</span>
                      <span className="text-purple-400">)</span>
                      {"\n"}
                      <span className="text-blue-400">if</span>
                      <span className="text-purple-400"> (</span>
                      <span className="text-gray-400">cost</span>
                      <span className="text-purple-400"> {" > "}</span>
                      <span className="text-amber-400">0.01</span>
                      <span className="text-purple-400">) abort</span>
                    </code>
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>

          {/* Right: ALEXZA AI Orchestration */}
          <motion.div
            className="group rounded-2xl border border-cyan-500/20 bg-[#0a0a0a]/80 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-cyan-500/30 hover:shadow-[0_0_40px_rgba(6,182,212,0.08)] transition-all duration-300"
            variants={staggerItemVariants}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-500/30 bg-cyan-500/5">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                {t("orchestration.alexza.title")}
              </h3>
            </div>
            <ul className="space-y-3 mb-6 text-gray-400 text-sm">
              {[
                "bullet1",
                "bullet2",
                "bullet3",
                "bullet4",
                "bullet5",
              ].map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500/80 flex-shrink-0 mt-0.5" />
                  <span>{t(`orchestration.alexza.${key}`)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#050607] relative">
              <button
                onClick={() =>
                  copyCode(
                    `curl -X POST "https://api.example.com/v1/projects/PROJECT_ID/run/ACTION_NAME" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: axza_xxx" \\
  -d '{"input":"Hello"}'`
                  )
                }
                className="absolute top-3 right-3 p-1.5 rounded-md border border-white/[0.1] hover:bg-white/5 text-gray-400 hover:text-white transition"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <pre className="text-xs font-mono text-gray-300 p-4 pr-12 overflow-x-auto">
                <code>
                  <span className="text-gray-500">curl -X POST </span>
                  <span className="text-cyan-400">"https://api.../v1/projects/:id/run/:action"</span>
                  {" \\\n  "}
                  <span className="text-gray-500">-H </span>
                  <span className="text-amber-400">"x-api-key: axza_xxx"</span>
                  {" \\\n  "}
                  <span className="text-gray-500">-d </span>
                  <span className="text-green-400">'{`{"input":"Hello"}`}'</span>
                </code>
              </pre>
            </div>
            <div className="mt-4 p-4 rounded-lg border border-white/[0.06] bg-[#0b0e12]/60">
              <p className="text-xs font-medium text-gray-500 mb-3">
                {t("orchestration.alexza.behindTheScenes")}
              </p>
              <ul className="space-y-2 text-xs text-gray-400">
                {["step1", "step2", "step3", "step4", "step5"].map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-cyan-500/60 flex-shrink-0" />
                    {t(`orchestration.alexza.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>

        {/* C) Model Families Grid */}
        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
            {t("orchestration.models.title")}
          </h3>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            {t("orchestration.models.subtitle")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {MODEL_FAMILIES.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.key}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-white/[0.12] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)] transition-all duration-300"
                  variants={staggerItemVariants}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-white/[0.12] bg-[#141414] group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-colors">
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h4 className="text-base font-semibold text-white mb-2">
                    {t(`orchestration.models.${item.key}.title`)}
                  </h4>
                  <p className="text-xs text-cyan-400/90 mb-2 font-mono">
                    {item.examples}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("orchestration.models.bestFor")}{" "}
                    {t(`orchestration.models.${item.key}.bestFor`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODEL_FAMILIES.slice(4, 7).map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.key}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-white/[0.12] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)] transition-all duration-300"
                  variants={staggerItemVariants}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-white/[0.12] bg-[#141414] group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-colors">
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h4 className="text-base font-semibold text-white mb-2">
                    {t(`orchestration.models.${item.key}.title`)}
                  </h4>
                  <p className="text-xs text-cyan-400/90 mb-2 font-mono">
                    {item.examples}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("orchestration.models.bestFor")}{" "}
                    {t(`orchestration.models.${item.key}.bestFor`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* D) Closing CTA strip */}
        <motion.div
          className="mt-16 rounded-2xl border border-white/[0.1] bg-[#0b0e12]/80 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          variants={scrollFadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <p className="text-lg font-semibold text-white text-center sm:text-left">
            {t("orchestration.cta.copy")}
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end">
            <Button
              className="bg-[#c0c0c0] hover:bg-[#d0d0d0] text-black font-semibold rounded-lg px-6"
              onClick={() => (window.location.href = "/signup")}
            >
              {t("orchestration.cta.getStarted")}
            </Button>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition"
            >
              {t("orchestration.cta.viewDocs")}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
