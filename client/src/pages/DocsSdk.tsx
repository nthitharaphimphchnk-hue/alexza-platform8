import { Button } from "@/components/ui/button";
import { ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import Logo from "@/components/Logo";

const API_BASE = "https://api.alexza.ai";

type Tab = "javascript" | "python" | "curl";

const EXAMPLES = {
  javascript: `import { Alexza } from "@alexza-ai/sdk";

const client = new Alexza("axza_live_your_api_key");

const result = await client.run({
  project: "507f1f77bcf86cd799439011",
  action: "summarize_text",
  input: { text: "Long text to summarize..." },
});

console.log(result.output);
console.log("Tokens:", result.usage?.tokens);`,
  python: `from alexza_ai import Alexza

client = Alexza("axza_live_your_api_key")

result = client.run(
    project="507f1f77bcf86cd799439011",
    action="summarize_text",
    input_data={"text": "Long text to summarize..."},
)

print(result["output"])
print("Tokens:", result.get("usage", {}).get("tokens"))`,
  curl: `curl -X POST "${API_BASE}/v1/projects/507f1f77bcf86cd799439011/run/summarize_text" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: axza_live_your_api_key" \\
  -d '{"input": {"text": "Long text to summarize..."}}'`,
};

const ERROR_EXAMPLES = {
  javascript: `import { Alexza, AlexzaError } from "@alexza-ai/sdk";

try {
  const result = await client.run({ project, action, input });
} catch (err) {
  if (err instanceof AlexzaError) {
    console.error(err.message, err.status, err.code);
  }
}`,
  python: `from alexza_ai import Alexza, AlexzaError

try:
    result = client.run(project, action, input_data)
except AlexzaError as e:
    print(e.message, e.status, e.code)`,
  curl: `# Errors return JSON: {"ok": false, "error": {"code": "...", "message": "..."}}`,
};

export default function DocsSdk() {
  const [tab, setTab] = useState<Tab>("javascript");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050607]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size="navbar" />
          <div className="flex items-center gap-4">
            <a href="/docs" className="text-sm text-gray-300 hover:text-white transition">Docs</a>
            <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">Pricing</a>
            <a href="/" className="text-sm text-gray-300 hover:text-white transition">Home</a>
            <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12]" onClick={() => (window.location.href = "/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050607] via-[#0a0c0f] to-transparent" />
        <motion.div
          className="max-w-4xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 className="hero-title-gradient font-brand text-5xl font-extrabold tracking-tight" variants={itemVariants}>
            Official SDKs
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            JavaScript and Python SDKs for ALEXZA AI. Run actions with a few lines of code.
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto p-8 lg:p-12">
        <motion.div className="space-y-12" variants={containerVariants} initial="hidden" animate="visible">
          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Install</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
                <p className="text-sm font-medium text-gray-400 mb-2">JavaScript / TypeScript</p>
                <code className="text-sm text-[#c0c0c0]">npm install @alexza-ai/sdk</code>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
                <p className="text-sm font-medium text-gray-400 mb-2">Python</p>
                <code className="text-sm text-[#c0c0c0]">pip install alexza-ai</code>
              </div>
            </div>
          </section>

          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Quick Start</h2>
            <div className="flex gap-2 flex-wrap">
              {(["javascript", "python", "curl"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tab === t
                      ? "bg-[rgba(192,192,192,0.2)] text-white border border-[rgba(192,192,192,0.4)]"
                      : "bg-[#0b0e12] text-gray-400 border border-[rgba(255,255,255,0.08)] hover:text-white"
                  }`}
                >
                  {t === "javascript" ? "JavaScript" : t === "python" ? "Python" : "curl"}
                </button>
              ))}
            </div>
            <div className="relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
              <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {EXAMPLES[tab]}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 border-[rgba(255,255,255,0.12)] text-gray-400"
                onClick={() => copyToClipboard(EXAMPLES[tab], "main")}
              >
                {copied === "main" ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </section>

          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Error Handling</h2>
            <p className="text-gray-400">
              Both SDKs throw structured errors with <code className="text-[#c0c0c0]">message</code>,{" "}
              <code className="text-[#c0c0c0]">status</code>, and <code className="text-[#c0c0c0]">code</code>.
            </p>
            <div className="relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
              <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {ERROR_EXAMPLES[tab]}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 border-[rgba(255,255,255,0.12)] text-gray-400"
                onClick={() => copyToClipboard(ERROR_EXAMPLES[tab], "error")}
              >
                {copied === "error" ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </section>

          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">API Reference</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
                <h3 className="text-lg font-semibold text-white mb-2">JavaScript</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><code className="text-[#c0c0c0]">new Alexza(apiKey, options?)</code> — options.baseUrl</li>
                  <li><code className="text-[#c0c0c0]">client.run({ project, action, input })</code> → RunResponse</li>
                  <li><code className="text-[#c0c0c0]">AlexzaError</code> — message, status, code, requestId</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Python</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><code className="text-[#c0c0c0]">Alexza(api_key, base_url=None)</code></li>
                  <li><code className="text-[#c0c0c0]">client.run(project, action, input_data)</code> → dict</li>
                  <li><code className="text-[#c0c0c0]">AlexzaError</code> — message, status, code, request_id</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Links</h2>
            <div className="flex gap-4 flex-wrap">
              <a href="/docs" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
                <ChevronRight size={16} />
                Full documentation
              </a>
              <a href="/docs#interactive-api" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
                <ChevronRight size={16} />
                Interactive API (Swagger)
              </a>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
