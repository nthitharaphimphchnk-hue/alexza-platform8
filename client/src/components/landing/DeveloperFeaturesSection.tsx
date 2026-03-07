import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  GitBranch,
  LayoutTemplate,
  FolderKanban,
  Workflow,
  Bot,
  Store,
} from "lucide-react";
import { scrollFadeInVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

const FEATURES = [
  { key: "howItWorks", icon: GitBranch, href: "/docs" },
  { key: "templates", icon: LayoutTemplate, href: "/app/templates" },
  { key: "exampleProjects", icon: FolderKanban, href: "/app/projects" },
  { key: "automationBuilder", icon: Workflow, href: "/app/workflows" },
  { key: "agentBuilder", icon: Bot, href: "/app/agents" },
  { key: "marketplace", icon: Store, href: "/app/marketplace" },
] as const;

export default function DeveloperFeaturesSection() {
  const { t } = useTranslation();

  return (
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
            {t("landing.developerFeatures.title")}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {t("landing.developerFeatures.subtitle")}
          </p>
        </motion.div>
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={item.key}
                href={item.href}
                variants={staggerItemVariants}
                className="group flex flex-col p-6 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.22)] transition-all duration-300 hover:shadow-lg hover:shadow-white/5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center group-hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                    <Icon className="w-5 h-5 text-[#c0c0c0]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {t(`landing.developerFeatures.${item.key}.title`)}
                  </h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed flex-1">
                  {t(`landing.developerFeatures.${item.key}.desc`)}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-400 group-hover:text-cyan-300 transition">
                  {t("landing.developerFeatures.explore")} →
                </span>
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
