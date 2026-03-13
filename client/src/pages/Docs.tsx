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
        { label: "Getting Started (Onboarding)", id: "getting-started" },
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
      title: "Public Playground",
      subsections: [
        { label: "Overview", id: "public-playground-overview" },
        { label: "Demo Actions", id: "public-playground-actions" },
        { label: "Rate Limits", id: "public-playground-limits" },
      ],
    },
    {
      title: "Template Library",
      subsections: [
        { label: "Overview", id: "template-library-overview" },
        { label: "Categories", id: "template-library-categories" },
        { label: "Install into Projects", id: "template-library-install" },
      ],
    },
    {
      title: "Templates Gallery",
      subsections: [
        { label: "Overview", id: "templates-gallery-overview" },
        { label: "Public Access", id: "templates-gallery-public" },
        { label: "Install Flow", id: "templates-gallery-install" },
      ],
    },
    {
      title: "Examples",
      subsections: [
        { label: "Overview", id: "examples-overview" },
        { label: "Example Projects", id: "examples-projects" },
        { label: "Install into Projects", id: "examples-install" },
      ],
    },
    {
      title: "Agents",
      subsections: [
        { label: "Overview", id: "agents-overview" },
        { label: "Tools", id: "agents-tools" },
        { label: "Run API", id: "agents-run" },
      ],
    },
    {
      title: "Starter Packs",
      subsections: [
        { label: "Overview", id: "starter-packs-overview" },
        { label: "Install", id: "starter-packs-install" },
        { label: "Available Packs", id: "starter-packs-available" },
      ],
    },
    {
      title: "App Store",
      subsections: [
        { label: "Overview", id: "app-store-overview" },
        { label: "Publish", id: "app-store-publish" },
        { label: "Browse & Install", id: "app-store-install" },
        { label: "Permissions", id: "app-store-permissions" },
      ],
    },
    {
      title: "Marketplace",
      subsections: [
        { label: "Overview", id: "marketplace-overview" },
        { label: "Publish", id: "marketplace-publish" },
        { label: "Browse & Install", id: "marketplace-install" },
        { label: "Rating", id: "marketplace-rating" },
      ],
    },
    {
      title: "AI Agent Marketplace",
      subsections: [
        { label: "Overview", id: "agent-marketplace-overview" },
        { label: "Publish", id: "agent-marketplace-publish" },
        { label: "Browse & Install", id: "agent-marketplace-install" },
        { label: "Ratings & Reviews", id: "agent-marketplace-ratings" },
        { label: "Permissions", id: "agent-marketplace-permissions" },
      ],
    },
    {
      title: "Workflow Marketplace",
      subsections: [
        { label: "Overview", id: "workflow-marketplace-overview" },
        { label: "Publish", id: "workflow-marketplace-publish" },
        { label: "Browse & Install", id: "workflow-marketplace-install" },
        { label: "Ratings & Reviews", id: "workflow-marketplace-ratings" },
        { label: "Permissions", id: "workflow-marketplace-permissions" },
      ],
    },
    {
      title: "Creator Profiles",
      subsections: [
        { label: "Overview", id: "creator-profiles-overview" },
        { label: "Profile & Stats", id: "creator-profiles-stats" },
        { label: "Follow System", id: "creator-profiles-follow" },
        { label: "Marketplace Integration", id: "creator-profiles-marketplace" },
      ],
    },
    {
      title: "Creator Monetization",
      subsections: [
        { label: "Overview", id: "creator-monetization-overview" },
        { label: "Pricing Model", id: "creator-monetization-pricing" },
        { label: "Purchase API", id: "creator-monetization-purchase" },
        { label: "Revenue Split", id: "creator-monetization-split" },
        { label: "Stripe Connect", id: "creator-monetization-connect" },
        { label: "Earnings Dashboard", id: "creator-monetization-dashboard" },
      ],
    },
    {
      title: "Community Hub",
      subsections: [
        { label: "Overview", id: "community-hub-overview" },
        { label: "Discovery APIs", id: "community-hub-apis" },
        { label: "UI", id: "community-hub-ui" },
      ],
    },
    {
      title: "Request Timeouts & Fallbacks",
      subsections: [
        { label: "Overview", id: "request-timeouts-overview" },
        { label: "Configuration", id: "request-timeouts-config" },
        { label: "Error Responses", id: "request-timeouts-errors" },
      ],
    },
    {
      title: "Production Monitoring",
      subsections: [
        { label: "Overview", id: "production-monitoring-overview" },
        { label: "Admin Dashboards", id: "production-monitoring-admin" },
        { label: "Alerting", id: "production-monitoring-alerts" },
      ],
    },
    {
      title: "Production Alerts",
      subsections: [
        { label: "Overview", id: "production-alerts-overview" },
        { label: "Alert Rules", id: "production-alerts-rules" },
        { label: "Integrations", id: "production-alerts-integrations" },
      ],
    },
    {
      title: "Usage Limits",
      subsections: [
        { label: "Overview", id: "usage-limits-overview" },
        { label: "Warning Thresholds", id: "usage-limits-warnings" },
        { label: "Hard Limits", id: "usage-limits-hard-limits" },
      ],
    },
    {
      title: "Feedback Collection",
      subsections: [
        { label: "Overview", id: "feedback-collection-overview" },
        { label: "Submit Feedback", id: "feedback-collection-submit" },
        { label: "Admin List", id: "feedback-collection-admin" },
      ],
    },
    {
      title: "Developer Leaderboard",
      subsections: [
        { label: "Overview", id: "developer-leaderboard-overview" },
        { label: "Ranking Logic", id: "developer-leaderboard-ranking" },
        { label: "Leaderboard Page", id: "developer-leaderboard-page" },
      ],
    },
    {
      title: "Referral Program",
      subsections: [
        { label: "Overview", id: "referral-program-overview" },
        { label: "Invite Links", id: "referral-program-links" },
        { label: "Rewards", id: "referral-program-rewards" },
      ],
    },
    {
      title: "Project Export / Import",
      subsections: [
        { label: "Overview", id: "project-export-import" },
        { label: "Export API", id: "project-export-api" },
        { label: "Import API", id: "project-import-api" },
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
      title: "Guides",
      subsections: [
        { label: "Guides Hub", id: "guides-hub", href: "/docs/guides" },
        { label: "Build Your First AI API", id: "guide-first-api", href: "/docs/guides/build-first-ai-api" },
        { label: "Create Your First Agent", id: "guide-first-agent", href: "/docs/guides/create-first-agent" },
        { label: "Build an Automation Workflow", id: "guide-workflow", href: "/docs/guides/build-automation-workflow" },
        { label: "Templates & Starter Packs", id: "guide-templates", href: "/docs/guides/use-templates-starter-packs" },
        { label: "JavaScript SDK", id: "guide-sdk", href: "/docs/guides/use-javascript-sdk" },
        { label: "CLI", id: "guide-cli", href: "/docs/guides/use-cli" },
        { label: "Export & Import Projects", id: "guide-export-import", href: "/docs/guides/export-import-projects" },
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
            <a href="/docs/guides" className="text-sm text-gray-300 hover:text-white transition">Guides</a>
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
          <motion.div className="flex flex-wrap items-center gap-3" variants={itemVariants}>
            <a
              href="https://github.com/nthitharaphimphchnk-hue/alexza-platform"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gray-300 hover:text-white underline-offset-4 hover:underline"
            >
              View the documentation source on GitHub
            </a>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.16)] text-white hover:bg-[rgba(255,255,255,0.06)]"
              onClick={() =>
                window.open("https://github.com/nthitharaphimphchnk-hue/alexza-platform", "_blank", "noopener,noreferrer")
              }
            >
              View Source on GitHub
            </Button>
          </motion.div>
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
              <div id="getting-started" className="space-y-4 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">Getting Started</h3>
                <p className="text-gray-300">
                  New users are guided through a short <strong className="text-white">in-app onboarding wizard</strong> at{" "}
                  <code className="text-[#c0c0c0]">/app/onboarding</code>. If you are logged in and have not completed
                  onboarding, you will be automatically redirected there until you finish.
                </p>
                <h4 className="text-lg font-medium text-white">Wizard steps</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li><strong className="text-white">Create your first project</strong> — A project groups your AI actions and keys. The wizard creates &quot;My First AI Project&quot; for you.</li>
                  <li><strong className="text-white">Choose a template</strong> — Pick one of the starter templates: <em>Text summarizer</em>, <em>Translator</em>, <em>Lead extractor</em>, or <em>Email generator</em>. This adds your first action to the project.</li>
                  <li><strong className="text-white">Generate an API key</strong> — Create a project API key so you can call the runtime. Copy and store it securely; it is shown only once.</li>
                  <li><strong className="text-white">Run your first AI request</strong> — The wizard sends a test request to your new action. When it succeeds, onboarding is marked complete and you are redirected to the dashboard.</li>
                </ol>
                <p className="text-gray-300">
                  After completion, <code className="text-[#c0c0c0]">onboardingCompleted</code> is set to <code className="text-[#c0c0c0]">true</code> and you can use the dashboard, playground, and API as usual.
                </p>
              </div>
              <div className="space-y-3 scroll-mt-32">
                <h3 className="text-xl font-semibold text-white">First-time Onboarding (summary)</h3>
                <p className="text-gray-300">
                  When a new user signs in for the first time, ALEXZA AI guides them through the in-app
                  onboarding wizard at <code className="text-[#c0c0c0]">/app/onboarding</code>: create first project,
                  choose a starter template (Text summarizer, Translator, Lead extractor, Email generator), generate an
                  API key, and run their first AI request. After completing the wizard, the user is redirected to the
                  dashboard and onboarding state is marked complete.
                </p>
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

            {/* Usage Limits */}
            <motion.section
              id="usage-limits-overview"
              className="space-y-6 scroll-mt-32"
              variants={itemVariants}
            >
              <h2 className="text-3xl font-bold text-white">Usage Limits</h2>
              <p className="text-gray-300 leading-relaxed">
                Billing guardrails prevent runaway API usage by enforcing per-user monthly usage limits
                on AI runs. Limits are defined in credits and evaluated before any upstream provider is
                called, so customers are protected from unexpected costs.
              </p>
              <h3
                id="usage-limits-warnings"
                className="text-xl font-semibold text-white scroll-mt-32"
              >
                Warning Thresholds
              </h3>
              <p className="text-gray-300">
                Each user can have a <code className="text-[#c0c0c0]">monthlyUsageLimit</code> and a{" "}
                <code className="text-[#c0c0c0]">usageWarningThreshold</code>. If no explicit limit is set, the
                system uses <code className="text-[#c0c0c0]">monthlyCreditsAllowance</code>; if no warning threshold
                is set, it defaults to 80% of the limit. When projected usage crosses the warning threshold, the
                system logs a structured event and records an entry in{" "}
                <code className="text-[#c0c0c0]">usage_limit_events</code> so admins can follow up.
              </p>
              <h3
                id="usage-limits-hard-limits"
                className="text-xl font-semibold text-white scroll-mt-32"
              >
                Hard Limits
              </h3>
              <p className="text-gray-300">
                For <code className="text-[#c0c0c0]">POST /v1/projects/:projectId/run/:actionName</code>, the runtime
                sums this month&apos;s credits from <code className="text-[#c0c0c0]">billing_ledger</code> and adds the
                estimated credits for the requested run. If this projected usage exceeds{" "}
                <code className="text-[#c0c0c0]">monthlyUsageLimit</code>, the request is blocked with a{" "}
                <code className="text-[#c0c0c0]">USAGE_LIMIT_REACHED</code> error code and no upstream AI call is made.
              </p>
            </motion.section>

            {/* Feedback Collection */}
            <motion.section
              id="feedback-collection-overview"
              className="space-y-6 scroll-mt-32"
              variants={itemVariants}
            >
              <h2 className="text-3xl font-bold text-white">Feedback Collection</h2>
              <p className="text-gray-300 leading-relaxed">
                During soft launch, users can submit feedback, bug reports, and feature requests directly from the app.
                A persistent &quot;Send Feedback&quot; button in the app shell opens a modal where users choose a type,
                write a message, and optionally provide their email. Submissions are stored with context (route, user, workspace, user agent, timestamp) for triage.
              </p>
              <h3
                id="feedback-collection-submit"
                className="text-xl font-semibold text-white scroll-mt-32"
              >
                Submit Feedback
              </h3>
              <p className="text-gray-300">
                Use the <strong className="text-white">Send Feedback</strong> button (bottom-right of the app) to open the modal. Choose a type:{" "}
                <code className="text-[#c0c0c0]">bug</code>, <code className="text-[#c0c0c0]">feature_request</code>,{" "}
                <code className="text-[#c0c0c0]">ux_issue</code>, or <code className="text-[#c0c0c0]">general</code>. Enter your message and optionally your email (prefilled when logged in). The client sends the current route, workspace ID, and user agent; the server adds user ID when authenticated and stores the submission in the <code className="text-[#c0c0c0]">feedback</code> collection with status <code className="text-[#c0c0c0]">new</code>.
              </p>
              <h3
                id="feedback-collection-admin"
                className="text-xl font-semibold text-white scroll-mt-32"
              >
                Admin List
              </h3>
              <p className="text-gray-300">
                Admins can view all feedback at <a href="/app/admin/feedback" className="text-[#c0c0c0] hover:underline">/app/admin/feedback</a>. The list supports filters by <strong className="text-white">type</strong>, <strong className="text-white">status</strong> (new, reviewed, closed), and <strong className="text-white">date</strong>. The API <code className="text-[#c0c0c0]">GET /api/admin/feedback</code> requires the <code className="text-[#c0c0c0]">x-admin-key</code> header. Set <code className="text-[#c0c0c0]">VITE_ADMIN_API_KEY</code> in your environment to load the list from the in-app admin page.
              </p>
            </motion.section>

            {/* Developer Leaderboard */}
            <motion.section
              id="developer-leaderboard-overview"
              className="space-y-6 scroll-mt-32"
              variants={itemVariants}
            >
              <h2 className="text-3xl font-bold text-white">
                Developer Leaderboard
              </h2>
              <p className="text-gray-300 leading-relaxed">
                The Developer Leaderboard highlights the top creators and the
                most popular AI resources (agents, workflows, and templates) on
                ALEXZA AI. It gives you a quick sense of who is building the
                most impactful automation and which resources are most used by
                the community.
              </p>
              <h3
                id="developer-leaderboard-ranking"
                className="text-xl font-semibold text-white scroll-mt-32"
              >
                Ranking Logic
              </h3>
              <p className="text-gray-300">
                Rankings use a weighted score combining{" "}
                <strong className="text-white">downloads</strong>,{" "}
                <strong className="text-white">ratings</strong>, and{" "}
                <strong className="text-white">recent activity</strong>. Items
                with more installs and higher ratings are ranked higher, with a
                small bonus for recent listings so that new high-quality
                resources can surface quickly.
              </p>
              <h3
                id="developer-leaderboard-page"
                className="text-xl font-semibold text-white scroll-mt-32"
              >
                Leaderboard Page
              </h3>
              <p className="text-gray-300">
                Visit{" "}
                <a
                  href="/leaderboard"
                  className="text-[#c0c0c0] hover:underline"
                >
                  /leaderboard
                </a>{" "}
                to see ranked tables for Top Creators, Top Agents, Top
                Workflows, and Top Templates. Each table shows the rank,
                resource name, downloads, and rating where available.
              </p>
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

            {/* Public Playground */}
            <motion.section id="public-playground-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Public Playground</h2>
              <p className="text-gray-300 leading-relaxed">
                The Public Playground lets visitors try ALEXZA AI without creating an account. Visit <a href="/playground" className="text-[#c0c0c0] hover:underline">/playground</a> to test AI capabilities in the browser.
              </p>
              <p className="text-gray-300">
                No signup or API key required. Usage is rate limited per IP to prevent abuse.
              </p>
              <h3 id="public-playground-actions" className="text-xl font-semibold text-white scroll-mt-32">Demo Actions</h3>
              <p className="text-gray-300">
                The playground includes five demo actions: <strong className="text-white">Summarize Text</strong>, <strong className="text-white">Generate Blog</strong>, <strong className="text-white">Extract Contact Info</strong>, <strong className="text-white">Support Agent</strong>, and <strong className="text-white">Research Agent</strong>. Each action has a simple input form and displays the AI output.
              </p>
              <h3 id="public-playground-limits" className="text-xl font-semibold text-white scroll-mt-32">Rate Limits</h3>
              <p className="text-gray-300">
                The playground is limited to 5 requests per minute per IP by default. Configure via <code className="text-[#c0c0c0]">PLAYGROUND_RATE_LIMIT_IP_PER_MIN</code> in your environment. Responses include <code className="text-[#c0c0c0]">X-RateLimit-Remaining</code> and <code className="text-[#c0c0c0]">X-RateLimit-Limit</code> headers.
              </p>
              <p className="text-sm text-gray-500">
                The playground uses the same AI providers (OpenAI or OpenRouter) as the main runtime. Ensure <code className="text-[#c0c0c0]">OPENAI_API_KEY</code> or <code className="text-[#c0c0c0]">OPENROUTER_API_KEY</code> is configured.
              </p>
            </motion.section>

            {/* Template Library */}
            <motion.section id="template-library-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Template Library</h2>
              <p className="text-gray-300 leading-relaxed">
                The Template Library provides 50–100 ready-to-use AI action templates across content, marketing, data extraction, productivity, and agents. Install any template into your project with one click.
              </p>
              <p className="text-gray-300">
                Browse at <a href="/app/templates" className="text-[#c0c0c0] hover:underline">/app/templates</a> or <a href="/app/marketplace" className="text-[#c0c0c0] hover:underline">/app/marketplace</a>.
              </p>
              <h3 id="template-library-categories" className="text-xl font-semibold text-white scroll-mt-32">Categories</h3>
              <p className="text-gray-300">
                <strong className="text-white">Content</strong> – Blog Generator, SEO Article Writer, FAQ Generator. <strong className="text-white">Marketing</strong> – Product Description, Email Campaign, Lead Follow-up. <strong className="text-white">Data Extraction</strong> – Resume Parser, Contact Extractor. <strong className="text-white">Productivity</strong> – Meeting Notes Summarizer, Email Draft. <strong className="text-white">Agents</strong> – Research Agent, Customer Support, Sales Assistant.
              </p>
              <h3 id="template-library-install" className="text-xl font-semibold text-white scroll-mt-32">Install into Projects</h3>
              <p className="text-gray-300">
                1. Open Templates or Marketplace. 2. Search or filter by category/tags. 3. Click <strong className="text-white">Apply to Project</strong> or <strong className="text-white">Install</strong>. 4. Select your project. 5. The Action is created with the template&apos;s prompt and schemas. You can edit it in project settings.
              </p>
              <p className="text-sm text-gray-500">
                Seed templates: <code>pnpm exec tsx scripts/seed-templates.ts</code>. See <code>docs/TEMPLATES.md</code> for full reference.
              </p>
            </motion.section>

            {/* Templates Gallery */}
            <motion.section id="templates-gallery-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Templates Gallery</h2>
              <p className="text-gray-300 leading-relaxed">
                The public Templates Gallery lets anyone browse AI templates without logging in, and then
                sign up to install them into their own projects.
              </p>
              <h3 id="templates-gallery-public" className="text-xl font-semibold text-white scroll-mt-32">
                Public Access
              </h3>
              <p className="text-gray-300">
                Visit <a href="/templates" className="text-[#c0c0c0] hover:underline">/templates</a> to see
                curated templates for text, automation, sales, marketing, and support. Cards show the
                template&apos;s name, description, category, downloads, and rating.
              </p>
              <h3 id="templates-gallery-install" className="text-xl font-semibold text-white scroll-mt-32">
                Install Flow
              </h3>
              <p className="text-gray-300">
                When a visitor clicks <strong className="text-white">Use Template</strong>, they are prompted
                to log in or sign up. After authentication, they can install the chosen template into a
                project via <code className="text-[#c0c0c0]">POST /api/templates/:id/install</code>, which
                creates an Action from the underlying template and increments its download count.
              </p>
            </motion.section>

            {/* Examples */}
            <motion.section id="examples-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Examples</h2>
              <p className="text-gray-300 leading-relaxed">
                The Example Projects Library provides 18 ready-to-use projects demonstrating how to build AI APIs, agents, and automations with ALEXZA. Each example includes <code className="text-[#c0c0c0]">README.md</code>, <code className="text-[#c0c0c0]">actions.json</code>, and optionally <code className="text-[#c0c0c0]">workflow.json</code> or <code className="text-[#c0c0c0]">agent.json</code>.
              </p>
              <p className="text-gray-300">
                Browse examples in the <code className="text-[#c0c0c0]">/examples</code> folder of the repo. See <code>examples/README.md</code> for the full list.
              </p>
              <h3 id="examples-projects" className="text-xl font-semibold text-white scroll-mt-32">Example Projects</h3>
              <p className="text-gray-300">
                <strong className="text-white">Content &amp; Marketing:</strong> ai-blog-api, ai-seo-writer, ai-product-description, ai-email-generator, ai-headline-generator, ai-cold-email. <strong className="text-white">Data Extraction:</strong> ai-lead-extractor, ai-resume-parser, ai-contact-extractor. <strong className="text-white">Productivity:</strong> ai-document-summarizer, ai-meeting-summarizer, ai-transcript-summarizer. <strong className="text-white">Agents:</strong> ai-support-agent, ai-sales-agent, ai-customer-support-bot, ai-research-agent. <strong className="text-white">Other:</strong> ai-faq-generator, ai-proposal-writer.
              </p>
              <h3 id="examples-install" className="text-xl font-semibold text-white scroll-mt-32">Install into Projects</h3>
              <p className="text-gray-300">
                1. Create a project in the Dashboard. 2. For each action in the example&apos;s <code className="text-[#c0c0c0]">actions.json</code>, add an action with the same <code className="text-[#c0c0c0]">actionName</code>, <code className="text-[#c0c0c0]">promptTemplate</code>, and <code className="text-[#c0c0c0]">inputSchema</code>. 3. Create an API key with <code className="text-[#c0c0c0]">run:actions</code> scope. 4. Run via <code className="text-[#c0c0c0]">POST /v1/projects/:projectId/run/:actionName</code> with <code className="text-[#c0c0c0]">{`{ "input": { ... } }`}</code>.
              </p>
              <p className="text-sm text-gray-500">
                See <code>docs/EXAMPLES.md</code> for detailed install steps and import options.
              </p>
            </motion.section>

            {/* Agents */}
            <motion.section id="agents-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Agents</h2>
              <p className="text-gray-300 leading-relaxed">
                AI Agents use actions, workflows, and webhooks as tools. The agent receives input, decides which tool to call (or responds directly), executes the tool, and returns a response.
              </p>
              <p className="text-gray-300">
                Visit <a href="/app/agents" className="text-[#c0c0c0] hover:underline">/app/agents</a> to create and manage agents.
              </p>
              <h3 id="agents-tools" className="text-xl font-semibold text-white scroll-mt-32">Tools</h3>
              <p className="text-gray-300">
                Agents can use three tool types: <strong className="text-white">actions</strong> (run AI actions), <strong className="text-white">workflows</strong> (execute workflows), and <strong className="text-white">webhooks</strong> (call HTTP endpoints).
              </p>
              <h3 id="agents-run" className="text-xl font-semibold text-white scroll-mt-32">Run API</h3>
              <p className="text-gray-300">
                Use <code className="text-[#c0c0c0]">POST /api/agents/run</code> with <code className="text-[#c0c0c0]">agentId</code> and <code className="text-[#c0c0c0]">input</code>. Optional <code className="text-[#c0c0c0]">sessionId</code> for memory.
              </p>
              <p className="text-sm text-gray-500">
                See <code>docs/AGENTS.md</code> for full API reference.
              </p>
            </motion.section>

            {/* Starter Packs */}
            <motion.section id="starter-packs-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Starter Packs</h2>
              <p className="text-gray-300 leading-relaxed">
                Starter Packs let you install a group of templates at once. Visit <a href="/app/packs" className="text-[#c0c0c0] hover:underline">/app/packs</a> to browse and install.
              </p>
              <h3 id="starter-packs-install" className="text-xl font-semibold text-white scroll-mt-32">Install</h3>
              <p className="text-gray-300">
                Use <code className="text-[#c0c0c0]">POST /api/packs/:id/install</code> with <code className="text-[#c0c0c0]">{`{ projectId }`}</code> to install a pack into a project. All templates in the pack are created as actions. Existing actions are skipped. Requires project actions manage permission.
              </p>
              <h3 id="starter-packs-available" className="text-xl font-semibold text-white scroll-mt-32">Available Packs</h3>
              <p className="text-gray-300">
                <strong className="text-white">SEO Pack</strong> – SEO Article Writer, Meta Description, Headline Generator, Blog Outline, Long-form Article. <strong className="text-white">Marketing Pack</strong> – Email Campaign, Product Description, Lead Follow-up, Ad Copy AIDA, Social Media, Landing Page. <strong className="text-white">Customer Support Pack</strong> – Ticket Triage, Support Response, FAQ Generator, Feedback Response, Apology Email. <strong className="text-white">Sales Automation Pack</strong> – Cold Email, Objection Handler, Lead Follow-up, Sales Agent, Thank You, Testimonial Request. <strong className="text-white">Research Pack</strong> – Research Agent, Document Summarizer, Meeting Notes, Executive Summary, Competitor Analysis.
              </p>
              <p className="text-sm text-gray-500">
                Seed packs: <code className="text-[#c0c0c0]">pnpm exec tsx scripts/seed-packs.ts</code>. Run <code className="text-[#c0c0c0]">scripts/seed-templates.ts</code> first.
              </p>
            </motion.section>

            {/* App Store */}
            <motion.section id="app-store-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">App Store</h2>
              <p className="text-gray-300 leading-relaxed">
                The App Store lets developers publish apps (plugins/extensions) and users install them into their workspace. Visit <a href="/app/store" className="text-[#c0c0c0] hover:underline">/app/store</a> to browse and install.
              </p>
              <h3 id="app-store-publish" className="text-xl font-semibold text-white scroll-mt-32">Publish</h3>
              <p className="text-gray-300">
                Use <code className="text-[#c0c0c0]">POST /api/apps/publish</code> to publish an app. Body: <code className="text-[#c0c0c0]">{`{ name, description, permissions[], category?, tags[] }`}</code>. Apps must declare permissions they need.
              </p>
              <h3 id="app-store-install" className="text-xl font-semibold text-white scroll-mt-32">Browse &amp; Install</h3>
              <p className="text-gray-300">
                <code className="text-[#c0c0c0]">GET /api/apps</code> – browse with <code className="text-[#c0c0c0]">q</code>, <code className="text-[#c0c0c0]">category</code>, <code className="text-[#c0c0c0]">section</code> (trending|popular|new). <code className="text-[#c0c0c0]">GET /api/apps/sections</code> – get Trending, Popular, New. <code className="text-[#c0c0c0]">POST /api/apps/:id/install</code> – install into workspace with <code className="text-[#c0c0c0]">{`{ workspaceId }`}</code>.
              </p>
              <h3 id="app-store-permissions" className="text-xl font-semibold text-white scroll-mt-32">Permissions</h3>
              <p className="text-gray-300">
                Apps declare permissions: <code className="text-[#c0c0c0]">run:actions</code>, <code className="text-[#c0c0c0]">read:projects</code>, <code className="text-[#c0c0c0]">manage:webhooks</code>, <code className="text-[#c0c0c0]">manage:workflows</code>. Users see requested permissions when installing. Install requires workspace manage permission.
              </p>
              <p className="text-sm text-gray-500">
                See <code>server/models/app.ts</code> and <code>server/appStoreRoutes.ts</code> for schema and API details.
              </p>
            </motion.section>

            {/* Marketplace */}
            <motion.section id="marketplace-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Marketplace</h2>
              <p className="text-gray-300 leading-relaxed">
                The Action Marketplace lets you publish, browse, and install AI action templates shared by the community.
                Visit <a href="/app/marketplace" className="text-[#c0c0c0] hover:underline">/app/marketplace</a> to explore.
              </p>
              <h3 id="marketplace-publish" className="text-xl font-semibold text-white scroll-mt-32">Publish</h3>
              <p className="text-gray-300">
                Publish an action from your project or an existing template you own. Use <code className="text-[#c0c0c0]">POST /api/marketplace/publish</code> with
                either <code className="text-[#c0c0c0]">projectId</code> + <code className="text-[#c0c0c0]">actionName</code> or <code className="text-[#c0c0c0]">templateId</code>.
              </p>
              <h3 id="marketplace-install" className="text-xl font-semibold text-white scroll-mt-32">Browse &amp; Install</h3>
              <p className="text-gray-300">
                Browse Trending, Popular, and New sections. Search by name, description, or tags. Click Install to add a template as an action in your project.
                Use <code className="text-[#c0c0c0]">POST /api/marketplace/:id/install</code> with <code className="text-[#c0c0c0]">projectId</code>.
              </p>
              <h3 id="marketplace-rating" className="text-xl font-semibold text-white scroll-mt-32">Rating</h3>
              <p className="text-gray-300">
                Rate templates with 1–5 stars via <code className="text-[#c0c0c0]">POST /api/marketplace/:id/rate</code>. Each user can submit one rating per template.
              </p>
              <p className="text-sm text-gray-500">
                See <code>docs/MARKETPLACE.md</code> in the repo for full API reference and database schema.
              </p>
            </motion.section>

            {/* AI Agent Marketplace */}
            <motion.section id="agent-marketplace-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">AI Agent Marketplace</h2>
              <p className="text-gray-300 leading-relaxed">
                The Agent Marketplace lets you publish, browse, and install AI agents shared by the community. Agents can use actions, workflows, and webhooks as tools. Visit <a href="/app/agent-marketplace" className="text-[#c0c0c0] hover:underline">/app/agent-marketplace</a> to explore.
              </p>
              <h3 id="agent-marketplace-publish" className="text-xl font-semibold text-white scroll-mt-32">Publish</h3>
              <p className="text-gray-300">
                Only the agent owner can publish. Use <code className="text-[#c0c0c0]">POST /api/agent-marketplace/publish</code> with <code className="text-[#c0c0c0]">agentId</code> (required). Optional: <code className="text-[#c0c0c0]">name</code>, <code className="text-[#c0c0c0]">description</code>, <code className="text-[#c0c0c0]">category</code>, <code className="text-[#c0c0c0]">tags</code> (array), <code className="text-[#c0c0c0]">visibility</code> (public/private).
              </p>
              <h3 id="agent-marketplace-install" className="text-xl font-semibold text-white scroll-mt-32">Browse &amp; Install</h3>
              <p className="text-gray-300">
                Browse Trending, Popular, and New sections. Filter by category or search by name, description, tags. Sort with <code className="text-[#c0c0c0]">?sort=trending</code>, <code className="text-[#c0c0c0]">popular</code>, or <code className="text-[#c0c0c0]">new</code>. Install copies the agent into your workspace: <code className="text-[#c0c0c0]">POST /api/agent-marketplace/:id/install</code> with <code className="text-[#c0c0c0]">workspaceId</code>.
              </p>
              <h3 id="agent-marketplace-ratings" className="text-xl font-semibold text-white scroll-mt-32">Ratings &amp; Reviews</h3>
              <p className="text-gray-300">
                Users can leave a 1–5 star rating and optional review text via <code className="text-[#c0c0c0]">POST /api/agent-marketplace/:id/rate</code> with <code className="text-[#c0c0c0]">rating</code> (1–5) and optional <code className="text-[#c0c0c0]">reviewText</code>. One rating per user per listing.
              </p>
              <h3 id="agent-marketplace-permissions" className="text-xl font-semibold text-white scroll-mt-32">Permissions</h3>
              <p className="text-gray-300">
                Only the agent owner can publish or unpublish their agents. Only <strong>public</strong> agents are visible to everyone; private listings are visible only to the publisher. Update or delete with <code className="text-[#c0c0c0]">PATCH /api/agent-marketplace/:id</code> and <code className="text-[#c0c0c0]">DELETE /api/agent-marketplace/:id</code> (owner only).
              </p>
            </motion.section>

            {/* Workflow Marketplace */}
            <motion.section id="workflow-marketplace-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Workflow Marketplace</h2>
              <p className="text-gray-300 leading-relaxed">
                The Workflow Marketplace lets you publish, browse, and install automation workflows shared by the community. Visit <a href="/app/workflow-marketplace" className="text-[#c0c0c0] hover:underline">/app/workflow-marketplace</a> to explore.
              </p>
              <h3 id="workflow-marketplace-publish" className="text-xl font-semibold text-white scroll-mt-32">Publish</h3>
              <p className="text-gray-300">
                Only the workflow owner can publish. Use <code className="text-[#c0c0c0]">POST /api/workflow-marketplace/publish</code> with <code className="text-[#c0c0c0]">workflowId</code> (required). Optional: <code className="text-[#c0c0c0]">name</code>, <code className="text-[#c0c0c0]">description</code>, <code className="text-[#c0c0c0]">category</code>, <code className="text-[#c0c0c0]">tags</code> (array), <code className="text-[#c0c0c0]">visibility</code> (public/private).
              </p>
              <h3 id="workflow-marketplace-install" className="text-xl font-semibold text-white scroll-mt-32">Browse &amp; Install</h3>
              <p className="text-gray-300">
                Browse Trending, Popular, and New sections. Filter by category or search. Sort with <code className="text-[#c0c0c0]">?sort=trending</code>, <code className="text-[#c0c0c0]">popular</code>, or <code className="text-[#c0c0c0]">new</code>. Install clones the workflow and its steps into your workspace: <code className="text-[#c0c0c0]">POST /api/workflow-marketplace/:id/install</code> with <code className="text-[#c0c0c0]">workspaceId</code>.
              </p>
              <h3 id="workflow-marketplace-ratings" className="text-xl font-semibold text-white scroll-mt-32">Ratings &amp; Reviews</h3>
              <p className="text-gray-300">
                Users can leave a 1–5 star rating and optional review text via <code className="text-[#c0c0c0]">POST /api/workflow-marketplace/:id/rate</code> with <code className="text-[#c0c0c0]">rating</code> (1–5) and optional <code className="text-[#c0c0c0]">reviewText</code>.
              </p>
              <h3 id="workflow-marketplace-permissions" className="text-xl font-semibold text-white scroll-mt-32">Permissions</h3>
              <p className="text-gray-300">
                Only the workflow owner can publish or unpublish. Only <strong>public</strong> workflows are visible to everyone. Update or delete with <code className="text-[#c0c0c0]">PATCH /api/workflow-marketplace/:id</code> and <code className="text-[#c0c0c0]">DELETE /api/workflow-marketplace/:id</code> (owner only).
              </p>
            </motion.section>

            {/* Creator Profiles */}
            <motion.section id="creator-profiles-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Creator Profiles</h2>
              <p className="text-gray-300 leading-relaxed">
                Creator profiles let developers and AI builders showcase their published agents, workflows, templates, and apps. Visit <a href="/app/creators" className="text-[#c0c0c0] hover:underline">/app/creators</a> to browse creators, or <a href="/app/creators/:username" className="text-[#c0c0c0] hover:underline">/app/creators/:username</a> for a specific profile.
              </p>
              <h3 id="creator-profiles-stats" className="text-xl font-semibold text-white scroll-mt-32">Profile &amp; Stats</h3>
              <p className="text-gray-300">
                Each creator has a <strong>username</strong> (unique, URL-safe), <strong>displayName</strong>, <strong>bio</strong>, and optional <strong>avatar</strong>. Stats are computed from public marketplace items: <code className="text-[#c0c0c0]">totalAgents</code>, <code className="text-[#c0c0c0]">totalWorkflows</code>, <code className="text-[#c0c0c0]">totalTemplates</code>, <code className="text-[#c0c0c0]">totalApps</code>, <code className="text-[#c0c0c0]">downloads</code>, <code className="text-[#c0c0c0]">rating</code>, and <code className="text-[#c0c0c0]">ratingCount</code>. Create or update your profile with <code className="text-[#c0c0c0]">PUT /api/creators/me</code> (body: username, displayName, bio, avatar). List creators with <code className="text-[#c0c0c0]">GET /api/creators</code> (optional <code className="text-[#c0c0c0]">?search=</code>). Get a profile and their content with <code className="text-[#c0c0c0]">GET /api/creators/:username</code>.
              </p>
              <h3 id="creator-profiles-follow" className="text-xl font-semibold text-white scroll-mt-32">Follow System</h3>
              <p className="text-gray-300">
                Authenticated users can follow creators: <code className="text-[#c0c0c0]">POST /api/creators/:username/follow</code> and <code className="text-[#c0c0c0]">DELETE /api/creators/:username/follow</code>. Follow state is returned in the profile as <code className="text-[#c0c0c0]">isFollowing</code> when the request is authenticated.
              </p>
              <h3 id="creator-profiles-marketplace" className="text-xl font-semibold text-white scroll-mt-32">Marketplace Integration</h3>
              <p className="text-gray-300">
                Agent marketplace, workflow marketplace, and template marketplace responses include <code className="text-[#c0c0c0]">authorUsername</code> when the author has a creator profile. Use it to link to <code className="text-[#c0c0c0]">/app/creators/:username</code> from marketplace cards.
              </p>
            </motion.section>

            {/* Creator Monetization */}
            <motion.section id="creator-monetization-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Creator Monetization</h2>
              <p className="text-gray-300 leading-relaxed">
                Monetization allows creators to sell marketplace items (agents, workflows, templates, apps) and receive payouts via Stripe Connect.
              </p>
              <h3 id="creator-monetization-pricing" className="text-xl font-semibold text-white scroll-mt-32">Pricing Model</h3>
              <p className="text-gray-300">
                Marketplace listings can include <code className="text-[#c0c0c0]">price</code>, <code className="text-[#c0c0c0]">billingType</code> (<code className="text-[#c0c0c0]">one-time</code> or <code className="text-[#c0c0c0]">monthly</code>), and <code className="text-[#c0c0c0]">currency</code> (e.g. <code className="text-[#c0c0c0]">usd</code>). Free items use <code className="text-[#c0c0c0]">price = 0</code>.
              </p>
              <h3 id="creator-monetization-purchase" className="text-xl font-semibold text-white scroll-mt-32">Purchase API</h3>
              <p className="text-gray-300">
                Create a Stripe Checkout session and record a pending purchase:
                <code className="text-[#c0c0c0]">POST /api/marketplace/:id/purchase</code> (templates),
                <code className="text-[#c0c0c0]">POST /api/agent-marketplace/:id/purchase</code>,
                <code className="text-[#c0c0c0]">POST /api/workflow-marketplace/:id/purchase</code>,
                <code className="text-[#c0c0c0]">POST /api/apps/:id/purchase</code>.
                On successful payment, Stripe webhooks mark purchases as paid and insert creator earnings records.
              </p>
              <h3 id="creator-monetization-split" className="text-xl font-semibold text-white scroll-mt-32">Revenue Split</h3>
              <p className="text-gray-300">
                The platform fee is configurable via environment. Default split is 70% creator / 30% platform. Configure with <code className="text-[#c0c0c0]">CREATOR_SHARE</code> (e.g. <code className="text-[#c0c0c0]">0.7</code>).
              </p>
              <h3 id="creator-monetization-connect" className="text-xl font-semibold text-white scroll-mt-32">Stripe Connect</h3>
              <p className="text-gray-300">
                Creators must connect a Stripe account to receive payouts. Start onboarding with <code className="text-[#c0c0c0]">POST /api/creators/me/connect/onboard</code>.
              </p>
              <h3 id="creator-monetization-dashboard" className="text-xl font-semibold text-white scroll-mt-32">Earnings Dashboard</h3>
              <p className="text-gray-300">
                View totals, recent sales, and top items at <a href="/app/creator/earnings" className="text-[#c0c0c0] hover:underline">/app/creator/earnings</a>. The UI reads from <code className="text-[#c0c0c0]">GET /api/creator/earnings</code>.
              </p>
            </motion.section>

            {/* Community Hub */}
            <motion.section id="community-hub-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Community Hub</h2>
              <p className="text-gray-300 leading-relaxed">
                The Community Hub surfaces trending agents, popular workflows, top creators, new packs, and featured apps in one place.
                Visit <a href="/app/community" className="text-[#c0c0c0] hover:underline">/app/community</a> inside the app.
              </p>
              <h3 id="community-hub-apis" className="text-xl font-semibold text-white scroll-mt-32">Discovery APIs</h3>
              <p className="text-gray-300">
                Use the discovery endpoints to power community views:
                <code className="text-[#c0c0c0]">GET /api/community/trending-agents</code>,
                <code className="text-[#c0c0c0]">GET /api/community/popular-workflows</code>,
                <code className="text-[#c0c0c0]">GET /api/community/top-creators</code>,
                <code className="text-[#c0c0c0]">GET /api/community/new-packs</code>,
                <code className="text-[#c0c0c0]">GET /api/community/featured-apps</code>.
                Results are ranked using downloads, ratings, and recency.
              </p>
              <h3 id="community-hub-ui" className="text-xl font-semibold text-white scroll-mt-32">UI & Navigation</h3>
              <p className="text-gray-300">
                The Community Hub page renders cards for each section and links into the relevant marketplace pages and creator profiles,
                making it easy for users to discover and install community content.
              </p>
            </motion.section>

            {/* Request Timeouts & Fallbacks */}
            <motion.section id="request-timeouts-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Request Timeouts & Fallbacks</h2>
              <p className="text-gray-300 leading-relaxed">
                ALEXZA AI enforces timeouts on HTTP requests, upstream AI provider calls, webhooks, and workflow steps to prevent
                hanging requests in production and to return clear, structured errors instead of leaving clients waiting indefinitely.
              </p>
              <h3 id="request-timeouts-config" className="text-xl font-semibold text-white scroll-mt-32">Configuration</h3>
              <p className="text-gray-300">
                The following environment variables control timeout behavior (all values in milliseconds, with safe defaults):
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li><code className="text-[#c0c0c0]">REQUEST_TIMEOUT_MS</code> – global HTTP request guard for <code className="text-[#c0c0c0]">/v1</code> and <code className="text-[#c0c0c0]">/api</code> routes (default 30000).</li>
                <li><code className="text-[#c0c0c0]">AI_RUN_TIMEOUT_MS</code> – upstream AI provider timeout for OpenAI / OpenRouter calls (defaults to the existing upstream timeout).</li>
                <li><code className="text-[#c0c0c0]">WEBHOOK_TIMEOUT_MS</code> – timeout for outbound webhook deliveries and workflow webhook output steps (default 10000).</li>
                <li><code className="text-[#c0c0c0]">WORKFLOW_STEP_TIMEOUT_MS</code> – per-step timeout for workflow HTTP action steps (default 20000).</li>
              </ul>
              <h3 id="request-timeouts-errors" className="text-xl font-semibold text-white scroll-mt-32">Error Responses</h3>
              <p className="text-gray-300">
                When a timeout occurs, the API responds with a 504 status code and a structured JSON error such as:
              </p>
              <pre className="rounded-lg bg-[#050607] p-4 border border-[rgba(255,255,255,0.08)] text-sm text-gray-200 overflow-x-auto">
{`{ "error": "request_timeout", "message": "The request took too long to complete." }`}
              </pre>
              <p className="text-gray-300">
                Upstream AI provider timeouts use <code className="text-[#c0c0c0]">"upstream_timeout"</code>, and workflow engine timeouts use
                <code className="text-[#c0c0c0]">"workflow_step_timeout"</code>. Frontend helpers (like the Playground) detect these codes and
                show user-friendly messages instead of leaving loading spinners active forever.
              </p>
            </motion.section>

            {/* Production Monitoring */}
            <motion.section id="production-monitoring-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Production Monitoring</h2>
              <p className="text-gray-300 leading-relaxed">
                After launch, monitor ALEXZA AI using health endpoints, admin dashboards, and alerts to
                catch issues early and keep the platform stable.
              </p>
              <h3 id="production-monitoring-admin" className="text-xl font-semibold text-white scroll-mt-32">
                Admin Dashboards
              </h3>
              <p className="text-gray-300">
                The admin-only monitoring pages provide high-level metrics:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>
                  <code className="text-[#c0c0c0]">/app/admin/launch</code> – soft-launch readiness,
                  totals, recent activity, and featured content counts.
                </li>
                <li>
                  <code className="text-[#c0c0c0]">/app/admin/monitoring</code> – real-time production
                  metrics: active users, requests per minute, AI runs per minute, errors, slow requests,
                  webhook failures.
                </li>
              </ul>
              <p className="text-gray-300">
                Both dashboards call admin APIs protected by the{" "}
                <code className="text-[#c0c0c0]">ADMIN_API_KEY</code> and{" "}
                <code className="text-[#c0c0c0]">x-admin-key</code> header, so only operators with the
                key can access them.
              </p>
              <h3 id="production-monitoring-alerts" className="text-xl font-semibold text-white scroll-mt-32">
                Alerting & Health Checks
              </h3>
              <p className="text-gray-300">
                Combine the built-in monitoring tools with external uptime checks and Sentry alerts:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>
                  Monitor <code className="text-[#c0c0c0]">/api/health</code> and{" "}
                  <code className="text-[#c0c0c0]">/api/health/db</code> from an external uptime
                  service.
                </li>
                <li>
                  Configure Sentry alerts for error spikes, new issues, and slow requests (see{" "}
                  <code className="text-[#c0c0c0]">SENTRY_TESTING.md</code>).
                </li>
                <li>
                  Use the production readiness and smoke scripts to validate deployments before and
                  after release.
                </li>
              </ul>
            </motion.section>

            {/* Production Alerts */}
            <motion.section id="production-alerts-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Production Alerts</h2>
              <p className="text-gray-300 leading-relaxed">
                ALEXZA AI can automatically notify administrators when critical issues occur in production, using
                Slack, Discord, or email.
              </p>
              <h3 id="production-alerts-rules" className="text-xl font-semibold text-white scroll-mt-32">
                Alert Rules
              </h3>
              <p className="text-gray-300">
                The alert worker evaluates metrics every minute using existing logs and health checks. Out-of-the-box
                rules include:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>High error volume in the last 5 minutes.</li>
                <li>Webhook delivery failures over the last 15 minutes.</li>
                <li>Spikes in slow requests (&gt; 2000ms) over the last 5 minutes.</li>
                <li>AI run failures (errors or insufficient credits) over the last 5 minutes.</li>
                <li>System health endpoint failures when <code className="text-[#c0c0c0]">/api/health</code> is not OK.</li>
              </ul>
              <p className="text-gray-300">
                Alerts are generated by a background worker process that runs every minute (via BullMQ) and reads from
                <code className="text-[#c0c0c0]">usage_logs</code>, <code className="text-[#c0c0c0]">run_logs</code>,{" "}
                <code className="text-[#c0c0c0]">webhook_deliveries</code>, and <code className="text-[#c0c0c0]">errors</code>.
              </p>
              <h3 id="production-alerts-integrations" className="text-xl font-semibold text-white scroll-mt-32">
                Integrations & Testing
              </h3>
              <p className="text-gray-300">
                Configure alert destinations via environment variables:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li><code className="text-[#c0c0c0]">ALERT_SLACK_WEBHOOK_URL</code> – Slack incoming webhook URL.</li>
                <li><code className="text-[#c0c0c0]">ALERT_DISCORD_WEBHOOK_URL</code> – Discord webhook URL.</li>
                <li><code className="text-[#c0c0c0]">ALERT_EMAIL_TO</code> – Email recipient for alerts.</li>
              </ul>
              <p className="text-gray-300">
                Use the admin test endpoint to verify configuration:
              </p>
              <pre className="rounded-lg bg-[#050607] p-4 border border-[rgba(255,255,255,0.08)] text-sm text-gray-200 overflow-x-auto">
{`curl -X POST "/api/admin/alerts/test" \\
  -H "x-admin-key: YOUR_ADMIN_API_KEY"`}
              </pre>
              <p className="text-gray-300">
                The worker process is started with <code className="text-[#c0c0c0]">pnpm run workers</code> and requires{" "}
                <code className="text-[#c0c0c0]">REDIS_URL</code> to be configured.
              </p>
            </motion.section>

            {/* Referral Program */}
            <motion.section id="referral-program-overview" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Referral Program</h2>
              <p className="text-gray-300 leading-relaxed">
                Invite others to ALEXZA AI and earn bonus credits when they sign up and start building.
              </p>
              <h3 id="referral-program-links" className="text-xl font-semibold text-white scroll-mt-32">
                Invite Links
              </h3>
              <p className="text-gray-300">
                Each user gets a unique referral code and invite link, visible in the{" "}
                <code className="text-[#c0c0c0]">/app/referrals</code> dashboard. The link has the form:
              </p>
              <pre className="rounded-lg bg-[#050607] p-4 border border-[rgba(255,255,255,0.08)] text-sm text-gray-200 overflow-x-auto">
{`https://your-domain.com/invite/REFERRAL_CODE`}
              </pre>
              <p className="text-gray-300">
                When someone opens this link, they are redirected to the signup page with the referral code
                attached so that their new account is attributed properly.
              </p>
              <h3 id="referral-program-rewards" className="text-xl font-semibold text-white scroll-mt-32">
                Rewards & Limits
              </h3>
              <p className="text-gray-300">
                When a referred user completes signup:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Both the referrer and the new user receive bonus credits.</li>
                <li>The amount is controlled via <code className="text-[#c0c0c0]">REFERRAL_REWARD_CREDITS</code>.</li>
                <li>Self-referrals are ignored, and a per-account cap (via{" "}
                  <code className="text-[#c0c0c0]">REFERRAL_MAX_REWARDS</code>) limits abuse.</li>
              </ul>
              <p className="text-gray-300">
                All referral events are recorded in the <code className="text-[#c0c0c0]">referrals</code> collection
                with the referrer, referred user, reward amount, and timestamp for later analysis.
              </p>
            </motion.section>

            {/* Project Export / Import */}
            <motion.section id="project-export-import" className="space-y-6 scroll-mt-32" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">Project Export / Import</h2>
              <p className="text-gray-300">
                Export projects as JSON (including actions, agents, and workflows) and import them into another workspace.
              </p>
              <h3 id="project-export-api" className="text-xl font-semibold text-white scroll-mt-32">Export API</h3>
              <motion.div
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    GET
                  </span>
                  <code className="text-white font-mono text-sm">/api/projects/:id/export</code>
                </div>
                <p className="text-gray-300 mb-2 font-medium">Export project as JSON</p>
                <p className="text-sm text-gray-400 mb-4">
                  Returns a JSON payload with <code className="text-[#c0c0c0]">project</code>, <code className="text-[#c0c0c0]">actions</code>, <code className="text-[#c0c0c0]">agents</code>, and <code className="text-[#c0c0c0]">workflows</code>. Requires authentication.
                </p>
                <div className="rounded-lg bg-[#050607] p-4 border border-[rgba(255,255,255,0.06)]">
                  <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
{`{ "ok": true, "data": {
  "version": "1",
  "exportedAt": "2025-03-05T...",
  "project": { "name", "description", "model", "status", "routingMode" },
  "actions": [...],
  "agents": [...],
  "workflows": [...]
}}`}
                  </pre>
                </div>
              </motion.div>
              <h3 id="project-import-api" className="text-xl font-semibold text-white scroll-mt-32">Import API</h3>
              <motion.div
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/40">
                    POST
                  </span>
                  <code className="text-white font-mono text-sm">/api/projects/import</code>
                </div>
                <p className="text-gray-300 mb-2 font-medium">Import project from export file</p>
                <p className="text-sm text-gray-400 mb-4">
                  Accepts <code className="text-[#c0c0c0">{`{ workspaceId, data }`}</code>. Creates a new project, actions, agents, and workflows. Requires <code className="text-[#c0c0c0">projects:manage</code> permission on the workspace.
                </p>
                <div className="rounded-lg bg-[#050607] p-4 border border-[rgba(255,255,255,0.06)]">
                  <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
{`curl -X POST "/api/projects/import" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=..." \\
  -d '{"workspaceId": "WORKSPACE_ID", "data": { ... export JSON ... }}'`}
                  </pre>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Response: <code className="text-[#c0c0c0">{`{ ok: true, projectId, actionCount, agentCount, workflowCount }`}</code>
                </p>
              </motion.div>
              <p className="text-sm text-gray-500">
                Use the Export Project and Import Project buttons in the project Overview tab to download or upload export files.
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

              {/* AI Model Routing */}
              <motion.div
                id="ai-model-routing"
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] space-y-4 scroll-mt-32"
                variants={itemVariants}
              >
                <h3 className="text-2xl font-bold text-white">AI Model Routing</h3>
                <p className="text-gray-300 leading-relaxed">
                  ALEXZA automatically selects the best upstream model for each action based on task type, routing mode, and
                  model availability. The router prefers cheaper models for tasks like summarization and extraction, and
                  higher-capability models for reasoning and creative writing.
                </p>
                <p className="text-sm text-gray-400">
                  Default task mapping:
                  <br />
                  <code className="text-[#c0c0c0]">
                    summarization → gpt-4o-mini,&nbsp; translation → gpt-4o-mini,&nbsp; extraction → gpt-4o-mini,&nbsp;
                    reasoning → gpt-4.1,&nbsp; creative_writing → gpt-4.1
                  </code>
                </p>
                <p className="text-sm text-gray-400">
                  For each request, the router builds a primary model and a fallback chain and executes via a hidden gateway using{" "}
                  <code className="text-[#c0c0c0]">runWithFallback</code>. If the primary model fails with a transient error
                  (e.g. timeout or 5xx), the next model in the chain is tried automatically. Logs include the selected model,
                  whether a fallback was used, and token usage.
                </p>
                <p className="text-sm text-gray-400">
                  Admins can override the mapping via the{" "}
                  <code className="text-[#c0c0c0]">MODEL_ROUTER_OVERRIDES</code> environment variable (JSON), for example:
                </p>
                <pre className="rounded-lg bg-[#050607] p-4 text-xs font-mono text-gray-300 overflow-x-auto">
{`MODEL_ROUTER_OVERRIDES='{
  "summarization": { "primary": "gpt-4o-mini", "fallbacks": ["gpt-4o"] },
  "reasoning": { "primary": "gpt-4.1", "fallbacks": ["gpt-4o"] }
}'`}
                </pre>
              </motion.div>

              {/* AI Evaluation System */}
              <motion.div
                id="ai-evaluation-system"
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] space-y-4 scroll-mt-32"
                variants={itemVariants}
              >
                <h3 className="text-2xl font-bold text-white">AI Evaluation System</h3>
                <p className="text-gray-300 leading-relaxed">
                  ALEXZA automatically records lightweight evaluation metrics for every AI action run. Each evaluation logs
                  the action, prompt version, model, quality score, latency, token usage, and estimated upstream cost.
                </p>
                <p className="text-sm text-gray-400">
                  Quality scores are heuristic-based (response length, completion success, latency) and are designed to
                  help you spot regressions when changing prompts or routing — not as a ground-truth label.
                </p>
                <p className="text-sm text-gray-400">
                  View evaluation data in the dashboard at{" "}
                  <code className="text-[#c0c0c0]">/app/ai-evaluations</code> to analyze trends in quality, latency, and token
                  usage over time across your actions.
                </p>
              </motion.div>

              {/* AI Safety Guard */}
              <motion.div
                id="ai-safety-guard"
                className="showcase-card p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] space-y-4 scroll-mt-32"
                variants={itemVariants}
              >
                <h3 className="text-2xl font-bold text-white">AI Safety Guard</h3>
                <p className="text-gray-300 leading-relaxed">
                  AI Safety Guard protects your runtime from prompt injection, unsafe content, and obvious malicious usage.
                  All action and agent requests are checked before execution, and responses are scanned before being returned
                  to clients.
                </p>
                <p className="text-sm text-gray-400">
                  Input checks flag prompt injection attempts, hate / violent content, malware instructions, and data
                  exfiltration patterns. Depending on internal rules, requests may be allowed, warned (logged), or blocked.
                  Output checks can also sanitize unsafe content before it leaves the platform.
                </p>
                <p className="text-sm text-gray-400">
                  Safety events are stored in <code className="text-[#c0c0c0]">ai_safety_events</code> and logged with structured
                  pino logs so you can audit and tune policies as needed.
                </p>
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
              <p className="text-gray-300">
                Step-by-step tutorials to help you build with ALEXZA AI.{" "}
                <a href="/docs/guides" className="text-[#c0c0c0] hover:text-white underline">
                  Browse all guides →
                </a>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <a href="/docs/guides/build-first-ai-api" className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4 hover:border-[rgba(255,255,255,0.18)] transition">
                  <h3 className="font-semibold text-white">Build Your First AI API</h3>
                  <p className="text-sm text-gray-500 mt-1">Create a production-ready AI API in under 10 minutes.</p>
                </a>
                <a href="/docs/guides/create-first-agent" className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4 hover:border-[rgba(255,255,255,0.18)] transition">
                  <h3 className="font-semibold text-white">Create Your First AI Agent</h3>
                  <p className="text-sm text-gray-500 mt-1">Build an agent that uses actions and workflows as tools.</p>
                </a>
                <a href="/docs/guides/build-automation-workflow" className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4 hover:border-[rgba(255,255,255,0.18)] transition">
                  <h3 className="font-semibold text-white">Build an Automation Workflow</h3>
                  <p className="text-sm text-gray-500 mt-1">Chain triggers, actions, and outputs for automation.</p>
                </a>
                <a href="/docs/guides/use-templates-starter-packs" className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4 hover:border-[rgba(255,255,255,0.18)] transition">
                  <h3 className="font-semibold text-white">Templates & Starter Packs</h3>
                  <p className="text-sm text-gray-500 mt-1">Jumpstart development with pre-built templates.</p>
                </a>
              </div>
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
