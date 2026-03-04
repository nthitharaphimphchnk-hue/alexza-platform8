import { Button } from "@/components/ui/button";
import { ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import Logo from "@/components/Logo";

const INSTALL = `npm install -g alexza-cli`;

const LOGIN = `alexza login`;

const EXAMPLES = `# List projects
alexza projects

# List actions in a project
alexza actions --project <projectId>

# Run an action
alexza run summarize --project <projectId> --input '{"text":"Hello world"}'

# Run with input from file
alexza run summarize --project <projectId> --input ./input.json

# Fetch request logs
alexza logs --project <projectId>

# Show usage analytics
alexza usage`;

export default function DocsCli() {
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
            <a href="/docs/sdk" className="text-sm text-gray-300 hover:text-white transition">SDK</a>
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
            CLI
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            Command line interface for developers to interact with ALEXZA AI from the terminal.
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto p-8 lg:p-12">
        <motion.div className="space-y-12" variants={containerVariants} initial="hidden" animate="visible">
          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Installation</h2>
            <div className="relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
              <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">{INSTALL}</pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 border-[rgba(255,255,255,0.12)] text-gray-400"
                onClick={() => copyToClipboard(INSTALL, "install")}
              >
                {copied === "install" ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-gray-400">Or with pnpm: <code className="text-[#c0c0c0]">pnpm add -g alexza-cli</code></p>
          </section>

          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Quick Start</h2>
            <p className="text-gray-400">Store your API key locally (config at <code className="text-[#c0c0c0]">~/.alexza/config.json</code>):</p>
            <div className="relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
              <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">{LOGIN}</pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 border-[rgba(255,255,255,0.12)] text-gray-400"
                onClick={() => copyToClipboard(LOGIN, "login")}
              >
                {copied === "login" ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-gray-400">Create an API key in the dashboard under Project → API Keys.</p>
          </section>

          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Commands</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)]">
                    <th className="text-left py-3 text-gray-400 font-medium">Command</th>
                    <th className="text-left py-3 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="py-3"><code className="text-[#c0c0c0]">alexza login</code></td><td>Store API key locally</td></tr>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="py-3"><code className="text-[#c0c0c0]">alexza projects</code></td><td>List user projects</td></tr>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="py-3"><code className="text-[#c0c0c0]">alexza actions</code></td><td>List actions in project (<code className="text-[#c0c0c0]">--project</code>)</td></tr>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="py-3"><code className="text-[#c0c0c0]">alexza run &lt;action&gt;</code></td><td>Run action (<code className="text-[#c0c0c0]">--project</code>, <code className="text-[#c0c0c0]">--input</code>)</td></tr>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="py-3"><code className="text-[#c0c0c0]">alexza logs</code></td><td>Fetch request logs</td></tr>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="py-3"><code className="text-[#c0c0c0]">alexza usage</code></td><td>Show analytics summary</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Examples</h2>
            <div className="relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
              <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{EXAMPLES}</pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 border-[rgba(255,255,255,0.12)] text-gray-400"
                onClick={() => copyToClipboard(EXAMPLES, "examples")}
              >
                {copied === "examples" ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </section>

          <section className="space-y-4" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Links</h2>
            <div className="flex gap-4 flex-wrap">
              <a href="/docs" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
                <ChevronRight size={16} />
                Full documentation
              </a>
              <a href="/docs/sdk" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
                <ChevronRight size={16} />
                Official SDKs
              </a>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
