import { Button } from "@/components/ui/button";
import { ChevronRight, Search, Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import Logo from "@/components/Logo";

/**
 * ALEXZA AI Documentation Page
 * OpenAI/Cloudflare-like docs layout
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
      title: "API Reference",
      subsections: ["Projects", "Models", "Chat Completions", "Embeddings"],
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
  model: 'gpt-4',
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

      {/* Header */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)]">
        <motion.div
          className="max-w-4xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h1 className="text-5xl font-bold text-white" variants={itemVariants}>
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

            {/* Code Examples */}
            {codeExamples.map((example, idx) => (
              <motion.section key={idx} className="space-y-4" variants={itemVariants}>
                <h2 className="text-2xl font-bold text-white">{example.title}</h2>
                <div className="relative bg-[#0b0e12] rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
                    <span className="text-sm text-gray-400">{example.language}</span>
                    <button
                      onClick={() => copyToClipboard(example.code, `code-${idx}`)}
                      className="flex items-center gap-2 px-3 py-1 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-gray-300 text-sm transition"
                    >
                      {copied === `code-${idx}` ? (
                        <>
                          <Check size={16} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={16} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">{example.code}</code>
                  </pre>
                </div>
              </motion.section>
            ))}

            {/* API Reference */}
            <motion.section className="space-y-6" variants={itemVariants}>
              <h2 className="text-3xl font-bold text-white">API Reference</h2>

              <div className="space-y-4">
                <div className="p-6 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-[#c0c0c0]/20 text-[#c0c0c0]">
                      POST
                    </span>
                    <code className="text-white font-mono">/api/v1/projects</code>
                  </div>
                  <p className="text-gray-300 mb-4">Create a new project</p>
                  <p className="text-sm text-gray-400">
                    Creates a new project in your workspace. Returns the project object with all details.
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-[#a8a8a8]/20 text-[#a8a8a8]">
                      GET
                    </span>
                    <code className="text-white font-mono">/api/v1/projects/:id</code>
                  </div>
                  <p className="text-gray-300 mb-4">Get project details</p>
                  <p className="text-sm text-gray-400">
                    Retrieves details of a specific project by ID.
                  </p>
                </div>
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
