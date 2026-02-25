import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  FileText,
  Megaphone,
  Search,
  BarChart3,
  GitBranch,
  Layout,
  Shield,
  Activity,
  Webhook,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { FeatureCard, DiagramRow } from "@/components/marketing";
import { scrollFadeInVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

const USE_CASES = [
  { key: "support", icon: MessageSquare },
  { key: "document", icon: FileText },
  { key: "marketing", icon: Megaphone },
  { key: "rag", icon: Search },
  { key: "data", icon: BarChart3 },
  { key: "workflow", icon: GitBranch },
] as const;

const TRUST_ITEMS = [
  { key: "usage", icon: Wallet },
  { key: "guardrails", icon: Shield },
  { key: "observability", icon: Activity },
  { key: "webhooks", icon: Webhook },
] as const;

export default function LandingSections() {
  const { t } = useTranslation();

  return (
    <>
      {/* 1) Use Cases Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              {t("landing.useCases.title")}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              {t("landing.useCases.subtitle")}
            </p>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.key} variants={staggerItemVariants}>
                  <FeatureCard
                    icon={Icon}
                    title={t(`landing.useCases.${item.key}.title`)}
                    body={t(`landing.useCases.${item.key}.desc`)}
                    href="/use-cases"
                    linkText={t("landing.useCases.learnMore")}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 2) Architecture Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              {t("landing.architecture.title")}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              {t("landing.architecture.subtitle")}
            </p>
          </motion.div>
          <motion.div
            className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#0b0e12] p-6 md:p-8"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <DiagramRow />
            <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-gray-500">
              <span>{t("landing.architecture.label1")}</span>
              <span>•</span>
              <span>{t("landing.architecture.label2")}</span>
              <span>•</span>
              <span>{t("landing.architecture.label3")}</span>
              <span>•</span>
              <span>{t("landing.architecture.label4")}</span>
            </div>
            <div className="mt-8 text-center">
              <Link href="/architecture">
                <a className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition">
                  {t("landing.architecture.cta")}
                  <Layout className="w-4 h-4" />
                </a>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3) Trust & Reliability Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              {t("landing.trust.title")}
            </h2>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.key} variants={staggerItemVariants}>
                  <FeatureCard
                    icon={Icon}
                    title={t(`landing.trust.${item.key}.title`)}
                    body={t(`landing.trust.${item.key}.desc`)}
                    href={item.key === "usage" || item.key === "guardrails" ? "/status" : "/security"}
                    linkText={t("landing.useCases.learnMore")}
                  />
                </motion.div>
              );
            })}
          </motion.div>
          <motion.div
            className="mt-12 flex flex-wrap justify-center gap-4"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Link href="/status">
              <a className="text-sm text-gray-400 hover:text-white transition">{t("landing.trust.statusLink")}</a>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/security">
              <a className="text-sm text-gray-400 hover:text-white transition">{t("landing.trust.securityLink")}</a>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
