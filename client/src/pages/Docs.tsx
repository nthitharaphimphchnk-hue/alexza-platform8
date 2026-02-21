import { Button } from "@/components/ui/button";
import { ChevronRight, Search, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import Logo from "@/components/Logo";

/**
 * ALEXZA AI Documentation Page
 * Unified AI runtime docs layout
 */

export default function Docs() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sections = [
    {
      title: "Getting Started",
      subsections: ["Introduction", "Authentication", "API Keys", "Rate Limits"],
    },
    {
      title: "Builder Flow",
      subsections: ["Chat Builder", "Apply Action", "Run Action"],
    },
    {
      title: "API Reference",
      subsections: ["Projects", "Run by Action", "Legacy Run"],
    },
    {
      title: "Guides",
      subsections: ["Building Workflows", "Prompt Engineering", "Error Handling"],
    },
    {
      title: "SDKs",
      subsections: ["Python", "JavaScript", "Go", "Ruby"],
    },
  ];

  const codeExamples = [
    {
      title: "Authentication",
      language: "python",
      code: `import alexza

client = alexza.Client(api_key="axza_live_demo_...")

# Create a project
project = client.projects.create(
    name="My AI Project",
    description="Building AI systems"
)`,
    },
    {
      title: "Chat Completion",
      language: "javascript",
      code: `import Alexza from 'alexza-sdk';

const client = new Alexza({
  apiKey: process.env.ALEXZA_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'alexza-default',
  messages: [{ role: 'user', content: 'Hello!' }],
});`,
    },
  ];

  return (
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050607]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size="navbar" />
          <div className="flex items-center gap-4">
            <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">Pricing</a>
            <a href="/" className="text-sm text-gray-300 hover:text-white transition">Home</a>
            <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12]" onClick={() => (window.location.href = "/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Header - gradient like Home */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050607] via-[#0a0c0f] to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c0c0c0] rounded-full blur-3xl opacity-5 -z-10" />
        <motion.div
          className="max-w-4xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h1 className="hero-title-gradient font-brand text-5xl font-extrabold tracking-tight" variants={itemVariants}>
            Documentation
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            Learn how to build, orchestrate, and optimize AI systems with ALEXZA.
          </motion.p>
        </motion.div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-[rgba(255,255,255,0.06)] p-8 sticky top-0 h-screen overflow-y-auto">
          <div className="mb-8">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search docs..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-500 focus:border-[rgba(255,255,255,0.12)] transition"
              />
            </div>
          </div>

          <nav className="space-y-6">
            {sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-white mb-3">{section.title}</h3>
                <ul className="space-y-2">
                  {section.subsections.map((sub, i) => (
                    <li key={i}>
                      <a
                        href="#"
                        className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
                      >
                        <ChevronRight size={14} />
                        {sub}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 lg:p-12 max-w-4xl">
          <motion.div
            className="space-y-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Introduction */}
            <motion.section className="space-y-6" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Getting Started</h2>
              <p className="text-gray-300 leading-relaxed">
                ALEXZA AI is a powerful platform for building, orchestrating, and optimizing AI systems.
                This documentation will guide you through everything you need to know.
              </p>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Prerequisites</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#c0c0c0]" />
                    An ALEXZA AI account
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#c0c0c0]" />
                    API key from your dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#c0c0c0]" />
                    Basic knowledge of REST APIs
                  </li>
                </ul>
              </div>
            </motion.section>

            {/* Code Examples - carbon style like Home */}
            {codeExamples.map((example, idx) => (
              <motion.section key={idx} className="space-y-4" variants={itemVariants}>
                <h2 className="text-2xl font-bold text-white">{example.title}</h2>
                <div className="code-block-border-glow">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.12)] overflow-hidden relative code-block-carbon">
                    <div className="flex items-center justify-between p-3 border-b-2 border-[rgba(255,255,255,0.12)] bg-[#0a0a0a]">
                      <span className="text-sm font-medium text-gray-400 capitalize">{example.language}</span>
                      <button
                        onClick={() => copyToClipboard(example.code, `code-${idx}`)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.15)] hover:bg-white/5 text-gray-300 text-sm transition"
                      >
                        {copied === `code-${idx}` ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                      </button>
                    </div>
                    <pre className="p-6 overflow-x-auto text-sm font-mono leading-relaxed">
                      <code>
                        {example.language === 'python' ? (
                          <>
                            <span className="text-purple-400">import</span> alexza{'\n\n'}
                            client = alexza.<span className="text-cyan-400">Client</span>(api_key=<span className="text-amber-400">"axza_live_demo_..."</span>){'\n\n'}
                            <span className="text-gray-500"># Create a project</span>{'\n'}
                            project = client.projects.<span className="text-cyan-400">create</span>({'\n'}
                            {'    '}name=<span className="text-amber-400">"My AI Project"</span>,{'\n'}
                            {'    '}description=<span className="text-amber-400">"Building AI systems"</span>{'\n'}
                            )
                          </>
                        ) : (
                          <>
                            <span className="text-purple-400">import</span> Alexza <span className="text-purple-400">from</span> <span className="text-cyan-400">'alexza-sdk'</span>;{'\n\n'}
                            <span className="text-blue-400">const</span> client = <span className="text-blue-400">new</span> Alexza({'{'}{'\n'}
                            {'  '}apiKey: process.env.<span className="text-violet-400">ALEXZA_API_KEY</span>,{'\n'}
                            {'}'});{'\n\n'}
                            <span className="text-blue-400">const</span> response = <span className="text-blue-400">await</span> client.chat.completions.<span className="text-cyan-400">create</span>({'{'}{'\n'}
                            {'  '}model: <span className="text-amber-400">'alexza-default'</span>,{'\n'}
                            {'  '}messages: [{'{'}{' '}role: <span className="text-amber-400">'user'</span>, content: <span className="text-amber-400">'Hello!'</span>{' '}{'}'}],{'\n'}
                            {'}'});
                          </>
                        )}
                      </code>
                    </pre>
                  </div>
                </div>
              </motion.section>
            ))}

            {/* Builder Flow */}
            <motion.section className="space-y-6" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Builder Flow</h2>
              <p className="text-gray-300 leading-relaxed">
                Chat with ALEXZA to get API Action specs, apply them to your project, then call the runtime endpoint.
              </p>
              <h3 className="text-xl font-semibold text-white">Quick flow</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300">
                <li><strong className="text-white">Create a project</strong> — From the dashboard, create a new project.</li>
                <li><strong className="text-white">Chat in Builder and Apply an Action</strong> — Open Chat Builder in your project, describe what you need. The AI suggests API specs. Click &quot;Apply to Project&quot; to save an action.</li>
                <li><strong className="text-white">Call the Action endpoint</strong> — Use <code className="text-[#c0c0c0]">POST /v1/projects/:projectId/run/:actionName</code> with <code className="text-[#c0c0c0]">x-api-key</code> to execute.</li>
              </ol>
              <p className="text-sm text-gray-500">
                All processing runs on ALEXZA Managed Runtime in Quality mode. No upstream provider or model names are exposed.
              </p>
            </motion.section>

            {/* API Reference - Run by Action (Recommended) */}
            <motion.section className="space-y-6" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">API Reference</h2>

              <motion.div
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border-2 border-[#c0c0c0]/40 hover:border-[#c0c0c0]/60 transition-all duration-300"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/40">
                    POST
                  </span>
                  <code className="text-white font-mono text-sm">/v1/projects/:projectId/run/:actionName</code>
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">Recommended</span>
                </div>
                <p className="text-gray-300 mb-2 font-medium">Run a saved action by name</p>
                <p className="text-sm text-gray-400 mb-4">
                  Authenticate with <code className="text-[#c0c0c0]">x-api-key</code>. Validates input against the action&apos;s inputSchema, runs via ALEXZA Managed Runtime, logs usage, and deducts credits.
                </p>
                <div className="rounded-lg bg-[#050607] p-4 border border-[rgba(255,255,255,0.06)]">
                  <p className="text-xs text-gray-500 mb-2">Example request (body: {`{ input: object }`})</p>
                  <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
{`curl -X POST "https://your-api/v1/projects/PROJECT_ID/run/summarize_text" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"input": {"text": "Long text to summarize..."}}'`}
                  </pre>
                  <p className="text-xs text-gray-500 mt-3">Response: {"{ ok, requestId, output, creditsCharged, usage, latencyMs }"}</p>
                </div>
              </motion.div>

              <div className="space-y-4">
                <motion.div
                  className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/40">
                      POST
                    </span>
                    <code className="text-white font-mono text-sm">/api/projects</code>
                  </div>
                  <p className="text-gray-300 mb-2 font-medium">Create a new project</p>
                  <p className="text-sm text-gray-400">
                    Creates a new project in your workspace. Returns the project object with all details.
                  </p>
                </motion.div>

                <motion.div
                  className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                      GET
                    </span>
                    <code className="text-white font-mono text-sm">/api/projects/:id</code>
                  </div>
                  <p className="text-gray-300 mb-2 font-medium">Get project details</p>
                  <p className="text-sm text-gray-400">
                    Retrieves details of a specific project by ID.
                  </p>
                </motion.div>

                <motion.div
                  className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300 opacity-80"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/40">
                      POST
                    </span>
                    <code className="text-white font-mono text-sm">/v1/run</code>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">Deprecated</span>
                  </div>
                  <p className="text-gray-300 mb-2 font-medium">Legacy run endpoint</p>
                  <p className="text-sm text-gray-400">
                    Legacy single run. Use <code className="text-[#c0c0c0]">/v1/projects/:projectId/run/:actionName</code> for action-based execution.
                  </p>
                </motion.div>
              </div>
            </motion.section>

            {/* Support */}
            <motion.section className="space-y-6 py-12 border-t border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
              <h2 className="text-2xl font-bold text-white">Need Help?</h2>
              <p className="text-gray-300">
                Can't find what you're looking for? Reach out to our support team.
              </p>
              <div className="flex gap-4">
                <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold">
                  Contact Support
                </Button>
                <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]">
                  Community Forum
                </Button>
              </div>
            </motion.section>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
