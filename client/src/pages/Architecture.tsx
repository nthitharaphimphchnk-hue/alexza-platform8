import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import {
  MarketingSectionHeader,
  DiagramRow,
  FeatureCard,
} from "@/components/marketing";
import {
  Database,
  RefreshCw,
  CreditCard,
  FileText,
  Webhook,
} from "lucide-react";

const modules = [
  {
    icon: Database,
    titleKey: "architecture.modules.modelRegistry.title",
    bodyKey: "architecture.modules.modelRegistry.body",
  },
  {
    icon: RefreshCw,
    titleKey: "architecture.modules.fallback.title",
    bodyKey: "architecture.modules.fallback.body",
  },
  {
    icon: CreditCard,
    titleKey: "architecture.modules.creditReservation.title",
    bodyKey: "architecture.modules.creditReservation.body",
  },
  {
    icon: FileText,
    titleKey: "architecture.modules.usageLogging.title",
    bodyKey: "architecture.modules.usageLogging.body",
  },
  {
    icon: Webhook,
    titleKey: "architecture.modules.webhooks.title",
    bodyKey: "architecture.modules.webhooks.body",
  },
];

const whyMatters = [
  { titleKey: "architecture.why.reliability.title", bodyKey: "architecture.why.reliability.body" },
  { titleKey: "architecture.why.scalability.title", bodyKey: "architecture.why.scalability.body" },
  { titleKey: "architecture.why.costControl.title", bodyKey: "architecture.why.costControl.body" },
];

export default function Architecture() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("architecture.hero.title")}
          </h1>
          <p className="text-xl text-gray-400">{t("architecture.hero.subtitle")}</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <MarketingSectionHeader
            title={t("architecture.diagram.title")}
            subtitle={t("architecture.diagram.subtitle")}
            className="mb-8"
          />
          <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#0b0e12] p-6">
            <DiagramRow />
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <MarketingSectionHeader
            title={t("architecture.modules.title")}
            subtitle={t("architecture.modules.subtitle")}
            className="mb-8"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, idx) => (
              <FeatureCard
                key={idx}
                icon={mod.icon}
                title={t(mod.titleKey)}
                body={t(mod.bodyKey)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <MarketingSectionHeader
            title={t("architecture.why.title")}
            className="mb-8"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {whyMatters.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)]"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t(item.titleKey)}
                </h3>
                <p className="text-gray-400 text-sm">{t(item.bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
