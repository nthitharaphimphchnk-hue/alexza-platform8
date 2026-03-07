/**
 * Developer Tutorials / Guides Hub
 * Step-by-step guides for ALEXZA AI
 */

import { Button } from "@/components/ui/button";
import { ChevronRight, Copy, Check, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRoute, Link } from "wouter";
import { containerVariants, itemVariants } from "@/lib/animations";
import Logo from "@/components/Logo";
import { GUIDES, getGuideBySlug } from "@/data/guides";
import { renderGuideText } from "@/components/guides/GuideContent";

function DocsNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050607]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Logo size="navbar" />
        <div className="flex items-center gap-4">
          <a href="/docs" className="text-sm text-gray-300 hover:text-white transition">Docs</a>
          <a href="/docs/guides" className="text-sm text-gray-300 hover:text-white transition">Guides</a>
          <a href="/playground" className="text-sm text-gray-300 hover:text-white transition">Playground</a>
          <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">Pricing</a>
          <a href="/" className="text-sm text-gray-300 hover:text-white transition">Home</a>
          <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[#0b0e12]" onClick={() => (window.location.href = "/login")}>
            Sign In
          </Button>
        </div>
      </div>
    </nav>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
      <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 border-[rgba(255,255,255,0.12)] text-gray-400"
        onClick={copy}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </Button>
    </div>
  );
}

function GuidesHub() {
  return (
    <>
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050607] via-[#0a0c0f] to-transparent" />
        <motion.div
          className="max-w-4xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 className="hero-title-gradient font-brand text-5xl font-extrabold tracking-tight" variants={itemVariants}>
            Developer Guides
          </motion.h1>
          <motion.p className="text-xl text-gray-300" variants={itemVariants}>
            Step-by-step tutorials to help you build with ALEXZA AI. From your first API to agents and workflows.
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto p-8 lg:p-12">
        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {GUIDES.map((guide, idx) => (
            <motion.div
              key={guide.slug}
              variants={itemVariants}
            >
              <Link href={`/docs/guides/${guide.slug}`}>
                <a className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6 hover:border-[rgba(255,255,255,0.18)] hover:bg-[#0b0e12]/90 transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-[#c0c0c0] transition">
                        {guide.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {guide.description}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-gray-500 group-hover:text-white shrink-0" />
                  </div>
                </a>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.section className="mt-16 space-y-6" variants={itemVariants}>
          <h2 className="text-2xl font-bold text-white">Related resources</h2>
          <div className="flex flex-wrap gap-4">
            <a href="/docs" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
              <ChevronRight size={16} />
              Full documentation
            </a>
            <a href="/docs#interactive-api" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
              <ChevronRight size={16} />
              Interactive API (Swagger)
            </a>
            <a href="/playground" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
              <ChevronRight size={16} />
              Playground
            </a>
            <a href="/docs#examples-overview" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
              <ChevronRight size={16} />
              Examples
            </a>
            <a href="/app/marketplace" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
              <ChevronRight size={16} />
              Marketplace
            </a>
            <a href="/app/store" className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition">
              <ChevronRight size={16} />
              App Store
            </a>
          </div>
        </motion.section>
      </div>
    </>
  );
}

function GuideDetail({ slug }: { slug: string }) {
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return (
      <div className="max-w-4xl mx-auto p-8 lg:p-12 pt-32">
        <p className="text-gray-400">Guide not found.</p>
        <Link href="/docs/guides">
          <a className="text-[#c0c0c0] hover:text-white mt-4 inline-block">← Back to Guides</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Sidebar - guide list */}
      <aside className="hidden lg:block w-56 border-r border-[rgba(255,255,255,0.06)] p-6 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
        <Link href="/docs/guides">
          <a className="text-sm text-gray-400 hover:text-white mb-4 block">← All Guides</a>
        </Link>
        <ul className="space-y-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/docs/guides/${g.slug}`}>
                <a
                  className={`text-sm block py-1 ${
                    g.slug === slug ? "text-white font-medium" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {g.title}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1 min-w-0">
      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050607] via-[#0a0c0f] to-transparent" />
        <motion.div
          className="max-w-4xl mx-auto space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href="/docs/guides">
            <a className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
              <ArrowLeft size={16} />
              Back to Guides
            </a>
          </Link>
          <motion.h1 className="hero-title-gradient font-brand text-4xl font-extrabold tracking-tight" variants={itemVariants}>
            {guide.title}
          </motion.h1>
          <motion.p className="text-lg text-gray-300" variants={itemVariants}>
            {guide.description}
          </motion.p>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto p-8 lg:p-12">
        <motion.div
          className="space-y-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.section className="space-y-4" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Overview</h2>
            <p className="text-gray-300 leading-relaxed">
              {renderGuideText(guide.overview, "overview")}
            </p>
          </motion.section>

          <motion.section className="space-y-6" variants={itemVariants}>
            <h2 className="text-2xl font-bold text-white">Step-by-step</h2>
            <ol className="space-y-6 list-decimal list-inside">
              {guide.steps.map((step, i) => (
                <li key={i} className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {renderGuideText(step.content, `step-${i}`)}
                  </p>
                </li>
              ))}
            </ol>
          </motion.section>

          {guide.exampleCode && (
            <motion.section className="space-y-4" variants={itemVariants}>
              <h2 className="text-2xl font-bold text-white">Example API call</h2>
              <CodeBlock code={guide.exampleCode} />
            </motion.section>
          )}

          {guide.tips && guide.tips.length > 0 && (
            <motion.section className="space-y-4" variants={itemVariants}>
              <h2 className="text-2xl font-bold text-white">Tips</h2>
              <ul className="space-y-2">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300">
                    <ChevronRight size={16} className="text-[#c0c0c0] shrink-0 mt-0.5" />
                    <span>{renderGuideText(tip, `tip-${i}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          {guide.troubleshooting && guide.troubleshooting.length > 0 && (
            <motion.section className="space-y-4" variants={itemVariants}>
              <h2 className="text-2xl font-bold text-white">Troubleshooting</h2>
              <div className="space-y-4">
                {guide.troubleshooting.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4"
                  >
                    <p className="font-medium text-white">{item.problem}</p>
                    <p className="text-sm text-gray-400 mt-1">{item.solution}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {guide.links && guide.links.length > 0 && (
            <motion.section className="space-y-4" variants={itemVariants}>
              <h2 className="text-2xl font-bold text-white">Related</h2>
              <div className="flex flex-wrap gap-4">
                {guide.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className="flex items-center gap-2 text-[#c0c0c0] hover:text-white transition"
                  >
                    <ChevronRight size={16} />
                    {link.label}
                  </a>
                ))}
              </div>
            </motion.section>
          )}
        </motion.div>
      </div>
      </div>
    </div>
  );
}

export default function DocsGuides() {
  const [, params] = useRoute<{ slug?: string }>("/docs/guides/:slug?");
  const slug = params?.slug;

  return (
    <div className="min-h-screen text-foreground">
      <DocsNav />
      {slug ? <GuideDetail slug={slug} /> : <GuidesHub />}
    </div>
  );
}
