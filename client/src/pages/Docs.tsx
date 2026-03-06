import { Button } from "@/components/ui/button";
import { ChevronRight, Search, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { containerVariants, itemVariants } from "@/lib/animations";
import Logo from "@/components/Logo";

/**
 * ALEXZA AI Documentation Page
 * Unified AI runtime docs layout
 */

export default function Docs() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sections = [
    {
      title: t("docs.gettingStarted"),
      subsections: [
        { label: t("docs.introduction"), id: "introduction" },
        { label: t("docs.authentication"), id: "authentication" },
        { label: t("docs.apiKeys"), id: "api-keys" },
        { label: t("docs.rateLimits"), id: "rate-limits" },
      ],
    },
    {
      title: t("docs.builderFlow"),
      subsections: [
        { label: t("docs.chatBuilder"), id: "chat-builder" },
        { label: t("docs.applyAction"), id: "apply-action" },
        { label: t("docs.runAction"), id: "run-action" },
      ],
    },
    {
      title: t("docs.apiReference"),
      subsections: [
        { label: "Interactive API (Swagger)", id: "interactive-api" },
        { label: t("docs.projects"), id: "projects" },
        { label: t("docs.runByAction"), id: "run-by-action" },
        { label: t("docs.legacyRun"), id: "legacy-run" },
      ],
    },
    {
      title: t("docs.webhooks"),
      subsections: [
        { label: t("docs.clientResponsibilities"), id: "client-responsibilities" },
        { label: t("docs.systemManaged"), id: "system-managed" },
        { label: t("docs.events"), id: "events" },
        { label: t("docs.signatureVerification"), id: "signature-verification" },
        { label: t("docs.retryPolicy"), id: "retry-policy" },
        { label: t("docs.statusCodes"), id: "status-codes" },
      ],
    },
    {
      title: t("docs.guides"),
      subsections: [
        { label: "Building Workflows", id: "building-workflows" },
        { label: "Prompt Engineering", id: "prompt-engineering" },
        { label: "Error Handling", id: "error-handling" },
      ],
    },
    {
      title: t("docs.sdk"),
      subsections: [
        { label: "Official SDKs", id: "sdk", href: "/docs/sdk" },
        { label: "CLI", id: "cli", href: "/docs/cli" },
        { label: "Python", id: "sdk-python" },
        { label: "JavaScript", id: "sdk-js" },
      ],
    },
    {
      title: "System Status",
      subsections: [
        { label: "Status Page", id: "status", href: "/status" },
        { label: "Health Endpoints", id: "health-endpoints" },
      ],
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
            {t("docs.title")}
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            {t("docs.subtitle")}
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
                placeholder={t("docs.searchPlaceholder")}
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
                        href={(sub as { href?: string }).href ?? `#${sub.id}`}
                        className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
                      >
                        <ChevronRight size={14} />
                        {sub.label}
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
            <motion.section id="introduction" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">{t("docs.gettingStarted")}</h2>
              <p className="text-gray-300 leading-relaxed">
                ALEXZA AI is a powerful platform for building, orchestrating, and optimizing AI systems.
                This documentation will guide you through everything you need to know.
              </p>

              <div id="authentication" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">Prerequisites</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#c0c0c0]" />
                    {t("docs.prereq1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#c0c0c0]" />
                    {t("docs.prereq2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-[#c0c0c0]" />
                    {t("docs.prereq3")}
                  </li>
                </ul>
              </div>
              <div id="rate-limits" className="space-y-2 scroll-mt-32">
                <h3 className="text-lg font-semibold text-white">Rate Limits</h3>
                <p className="text-gray-300 text-sm">Runtime endpoints are rate-limited per API key based on billing plan:</p>
                <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
                  <li>Free: 30 requests/minute</li>
                  <li>Pro: 120 requests/minute</li>
                  <li>Enterprise: 600 requests/minute</li>
                </ul>
                <p className="text-gray-300 text-sm">Responses include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. When exceeded: HTTP 429 with {"{ \"error\": \"rate_limit_exceeded\" }"}.</p>
              </div>
            </motion.section>

            {/* Code Examples - carbon style like Home */}
            {codeExamples.map((example, idx) => (
              <motion.section key={idx} id={idx === 0 ? "api-keys" : undefined} className="space-y-4 scroll-mt-32" variants={itemVariants}>
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
            <motion.section id="builder-flow" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">{t("docs.builderFlow")}</h2>
              <p className="text-gray-300 leading-relaxed">
                Chat with ALEXZA to get API Action specs, apply them to your project, then call the runtime endpoint.
              </p>
              <h3 id="chat-builder" className="text-xl font-semibold text-white scroll-mt-32">Chat Builder</h3>
              <p className="text-gray-300">Open Chat Builder in your project and describe what you need. The AI suggests API specs.</p>
              <h3 id="apply-action" className="text-xl font-semibold text-white scroll-mt-32">Apply Action</h3>
              <p className="text-gray-300">Click &quot;Apply to Project&quot; to save an action from the AI suggestion.</p>
              <h3 id="run-action" className="text-xl font-semibold text-white scroll-mt-32">Run Action</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300">
                <li><strong className="text-white">Create a project</strong> — {t("docs.flow1")}</li>
                <li><strong className="text-white">Chat in Builder and Apply an Action</strong> — {t("docs.flow2")}</li>
                <li><strong className="text-white">Call the Action endpoint</strong> — {t("docs.flow3")}</li>
              </ol>
              <p className="text-sm text-gray-500">
                All processing runs on ALEXZA Managed Runtime in Quality mode. No upstream provider or model names are exposed.
              </p>
            </motion.section>

            {/* API Reference - Run by Action (Recommended) */}
            <motion.section id="run-by-action" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">{t("docs.apiReference")}</h2>

              <motion.div
                id="interactive-api"
                className="rounded-xl border-2 border-[#c0c0c0]/40 bg-[#0b0e12] p-4 flex items-center justify-between flex-wrap gap-3 scroll-mt-32"
                variants={itemVariants}
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">Interactive API Documentation</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    OpenAPI / Swagger UI with &quot;Try it out&quot; — test endpoints directly.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-[rgba(192,192,192,0.4)] text-white hover:bg-[rgba(192,192,192,0.1)]"
                  onClick={() => {
                    const apiBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(
                      /\/+$/,
                      ""
                    );
                    const url = apiBase ? `${apiBase}/docs/api` : `${window.location.origin}/docs/api`;
                    window.open(url, "_blank");
                  }}
                >
                  Open API Docs →
                </Button>
              </motion.div>

              <motion.div
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border-2 border-[#c0c0c0]/40 hover:border-[#c0c0c0]/60 transition-all duration-300"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded text-xs font-semibold bg-[rgba(192,192,192,0.14)] text-[#c0c0c0] border border-[rgba(192,192,192,0.35)]">
                    POST
                  </span>
                  <code className="text-white font-mono text-sm">/v1/projects/:projectId/run/:actionName</code>
                  <span className="px-2 py-0.5 rounded text-xs bg-[rgba(192,192,192,0.14)] text-[#c0c0c0] border border-[rgba(192,192,192,0.35)]">Recommended</span>
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

              <div id="projects" className="space-y-4 scroll-mt-32">
                <motion.div
                  className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-[rgba(192,192,192,0.14)] text-[#c0c0c0] border border-[rgba(192,192,192,0.35)]">
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
                  id="legacy-run"
                  className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300 opacity-80 scroll-mt-32"
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

            {/* Webhooks */}
            <motion.section id="webhooks" className="space-y-8 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">{t("docs.webhooks")}</h2>
              <p className="text-gray-300 leading-relaxed">
                ALEXZA AI sends HTTP POST requests to your configured URL when events occur (e.g. action run succeeded, wallet topup). You must respond with 200 OK within 10 seconds.
              </p>

              <div id="client-responsibilities" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">{t("docs.clientResponsibilities")}</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2"><ChevronRight size={16} className="text-[#c0c0c0]" /> Create a receiver endpoint (e.g. POST /api/webhook)</li>
                  <li className="flex items-center gap-2"><ChevronRight size={16} className="text-[#c0c0c0]" /> Verify X-Alexza-Signature with HMAC-SHA256</li>
                  <li className="flex items-center gap-2"><ChevronRight size={16} className="text-[#c0c0c0]" /> Return 200 OK within 10 seconds</li>
                  <li className="flex items-center gap-2"><ChevronRight size={16} className="text-[#c0c0c0]" /> Store and process data (use event.id for idempotency)</li>
                </ul>
              </div>

              <div id="system-managed" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">{t("docs.systemManaged")}</h3>
                <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.12)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.12)]">
                        <th className="text-left p-4 font-semibold text-white">Topic</th>
                        <th className="text-left p-4 font-semibold text-white">Details</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4">Sending</td><td className="p-4">ALEXZA sends POST automatically on events</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4">Retry</td><td className="p-4">3 retries: 1m, 5m, 30m after failure</td></tr>
                      <tr><td className="p-4">Security</td><td className="p-4">HTTPS + signature for verification</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="events" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">{t("docs.events")}</h3>
                <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.12)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.12)]">
                        <th className="text-left p-4 font-semibold text-white">Event</th>
                        <th className="text-left p-4 font-semibold text-white">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">auth.user.created</td><td className="p-4">New user signup</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">auth.user.logged_in</td><td className="p-4">User login</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">wallet.topup.succeeded</td><td className="p-4">Credits topup success</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">wallet.topup.failed</td><td className="p-4">Credits topup failed</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">action.run.succeeded</td><td className="p-4">Action run success</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">action.run.failed</td><td className="p-4">Action run failed</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono text-[#c0c0c0]">project.created</td><td className="p-4">Project created</td></tr>
                      <tr><td className="p-4 font-mono text-[#c0c0c0]">project.deleted</td><td className="p-4">Project deleted</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500">Headers: Content-Type, X-Alexza-Timestamp, X-Alexza-Signature, X-Alexza-Event, X-Alexza-Delivery-Id</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white">Payload examples</h4>
                <div className="code-block-border-glow">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.12)] overflow-hidden relative code-block-carbon">
                    <div className="flex items-center justify-between p-3 border-b-2 border-[rgba(255,255,255,0.12)] bg-[#0a0a0a]">
                      <span className="text-sm font-medium text-gray-400">action.run.succeeded</span>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify({ id: "evt_ghi789", type: "action.run.succeeded", created_at: 1709123458, data: { user_id: "usr_xyz789", project_id: "proj_abc", action_name: "summarize_text", request_id: "req_xyz", credits_charged: 2, latency_ms: 450 } }, null, 2), "webhook-payload")}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.15)] hover:bg-white/5 text-gray-300 text-sm transition"
                      >
                        {copied === "webhook-payload" ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                      </button>
                    </div>
                    <pre className="p-6 overflow-x-auto text-sm font-mono leading-relaxed text-gray-300">
{`{
  "id": "evt_ghi789",
  "type": "action.run.succeeded",
  "created_at": 1709123458,
  "data": {
    "user_id": "usr_xyz789",
    "project_id": "proj_abc",
    "action_name": "summarize_text",
    "request_id": "req_xyz",
    "credits_charged": 2,
    "latency_ms": 450
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div id="signature-verification" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">{t("docs.signatureVerification")}</h3>
                <p className="text-gray-300 text-sm">signed_payload = timestamp + &quot;.&quot; + raw_body → signature = HMAC-SHA256(signed_payload, webhook_secret)</p>
                <div className="code-block-border-glow">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.12)] overflow-hidden relative code-block-carbon">
                    <div className="flex items-center justify-between p-3 border-b-2 border-[rgba(255,255,255,0.12)] bg-[#0a0a0a]">
                      <span className="text-sm font-medium text-gray-400">Node.js</span>
                      <button
                        onClick={() => copyToClipboard(`const crypto = require('crypto');
function verifySignature(payload, signature, timestamp, secret) {
  if (!payload || !signature || !timestamp || !secret) return false;
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}`, "sig-js")}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.15)] hover:bg-white/5 text-gray-300 text-sm transition"
                      >
                        {copied === "sig-js" ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                      </button>
                    </div>
                    <pre className="p-6 overflow-x-auto text-sm font-mono leading-relaxed text-gray-300">
{`const crypto = require('crypto');
function verifySignature(payload, signature, timestamp, secret) {
  if (!payload || !signature || !timestamp || !secret) return false;
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div id="retry-policy" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">{t("docs.retryPolicy")}</h3>
                <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.12)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.12)]">
                        <th className="text-left p-4 font-semibold text-white">Attempt</th>
                        <th className="text-left p-4 font-semibold text-white">Delay after failure</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4">1</td><td className="p-4">Immediate</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4">2</td><td className="p-4">1 minute</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4">3</td><td className="p-4">5 minutes</td></tr>
                      <tr><td className="p-4">4</td><td className="p-4">30 minutes</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div id="status-codes" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">{t("docs.statusCodes")}</h3>
                <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.12)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.12)]">
                        <th className="text-left p-4 font-semibold text-white">Code</th>
                        <th className="text-left p-4 font-semibold text-white">Meaning</th>
                        <th className="text-left p-4 font-semibold text-white">Retry</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">200</td><td className="p-4">{t("docs.status200")}</td><td className="p-4">{t("docs.statusNoRetry")}</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">2xx</td><td className="p-4">{t("docs.status2xx")}</td><td className="p-4">{t("docs.statusNoRetry")}</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">4xx</td><td className="p-4">{t("docs.status4xx")}</td><td className="p-4">{t("docs.statusRetry")}</td></tr>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">5xx</td><td className="p-4">{t("docs.status5xx")}</td><td className="p-4">{t("docs.statusRetry")}</td></tr>
                      <tr><td className="p-4 font-mono">Timeout</td><td className="p-4">{t("docs.statusTimeout")}</td><td className="p-4">{t("docs.statusRetry")}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>

            {/* Guides */}
            <motion.section id="guides" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">{t("docs.guides")}</h2>
              <p className="text-gray-300">Coming soon: Building Workflows, Prompt Engineering, Error Handling.</p>
              <h3 id="building-workflows" className="text-lg font-semibold text-white scroll-mt-32">Building Workflows</h3>
              <h3 id="prompt-engineering" className="text-lg font-semibold text-white scroll-mt-32">Prompt Engineering</h3>
              <h3 id="error-handling" className="text-lg font-semibold text-white scroll-mt-32">Error Handling</h3>
            </motion.section>

            {/* SDKs */}
            <motion.section id="sdk" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">{t("docs.sdk")}</h2>
              <p className="text-gray-300">
                Official JavaScript and Python SDKs.{" "}
                <a href="/docs/sdk" className="text-[#c0c0c0] hover:text-white underline">
                  View SDK documentation →
                </a>
              </p>
              <h3 id="sdk-python" className="text-lg font-semibold text-white scroll-mt-32">Python</h3>
              <p className="text-gray-400"><code className="text-[#c0c0c0]">pip install alexza-ai</code></p>
              <h3 id="sdk-js" className="text-lg font-semibold text-white scroll-mt-32">JavaScript</h3>
              <p className="text-gray-400"><code className="text-[#c0c0c0]">npm install @alexza-ai/sdk</code></p>
            </motion.section>

            {/* System Status */}
            <motion.section id="status" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">System Status</h2>
              <p className="text-gray-300">
                Check platform availability and system health at{" "}
                <a href="/status" className="text-[#c0c0c0] hover:text-white underline">
                  /status
                </a>
                . The status page shows API, Database, Stripe, Webhooks, and Workers with real-time indicators (operational, degraded, down) and 24h uptime.
              </p>
              <h3 id="health-endpoints" className="text-xl font-semibold text-white scroll-mt-32">Health Endpoints</h3>
              <p className="text-gray-300">Public health endpoints return status, latency, and timestamp. No authentication required.</p>
              <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.12)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.12)]">
                      <th className="text-left p-4 font-semibold text-white">Endpoint</th>
                      <th className="text-left p-4 font-semibold text-white">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">GET /health</td><td className="p-4">Basic API health</td></tr>
                    <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">GET /health/db</td><td className="p-4">Database connectivity</td></tr>
                    <tr className="border-b border-[rgba(255,255,255,0.06)]"><td className="p-4 font-mono">GET /health/stripe</td><td className="p-4">Stripe API connectivity</td></tr>
                    <tr><td className="p-4 font-mono">GET /health/webhooks</td><td className="p-4">Webhook configuration</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500">Response shape: {"{ status: \"operational\" | \"degraded\" | \"down\", latency: number, timestamp: string }"}</p>
              <p className="text-gray-300">
                <strong>GET /api/status</strong> — Aggregated status for all components plus 24h uptime percentage. Used by the status page.
              </p>
            </motion.section>

            {/* Support */}
            <motion.section className="space-y-6 py-12 border-t border-[rgba(255,255,255,0.06)]" variants={itemVariants}>
              <h2 className="text-2xl font-bold text-white">{t("docs.needHelp")}</h2>
              <p className="text-gray-300">
                Can't find what you're looking for? Reach out to our support team.
              </p>
              <div className="flex gap-4">
                <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold">
                  {t("docs.contactSupport")}
                </Button>
                <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]">
                  {t("docs.communityForum")}
                </Button>
              </div>
            </motion.section>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
