import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Shield, Key, Lock, Gauge, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const securityItems = [
  { icon: Shield, titleKey: "security.items.data.title", bodyKey: "security.items.data.body" },
  { icon: Key, titleKey: "security.items.apiKeys.title", bodyKey: "security.items.apiKeys.body" },
  { icon: Lock, titleKey: "security.items.auth.title", bodyKey: "security.items.auth.body" },
  { icon: Gauge, titleKey: "security.items.rateLimiting.title", bodyKey: "security.items.rateLimiting.body" },
  { icon: FileText, titleKey: "security.items.logging.title", bodyKey: "security.items.logging.body" },
];

export default function Security() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("security.hero.title")}
          </h1>
          <p className="text-xl text-gray-400">{t("security.hero.subtitle")}</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {securityItems.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] flex gap-4"
              >
                <item.icon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-gray-400 text-sm">{t(item.bodyKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("security.compliance.title")}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {t("security.compliance.subtitle")}
            </p>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.08)] text-gray-400">
              {t("security.compliance.comingSoon")}
            </span>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)]">
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("security.disclosure.title")}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {t("security.disclosure.body")}
            </p>
            <Button
              variant="outline"
              className="border-[rgba(255,255,255,0.1)] text-white hover:bg-[#0b0e12]"
              onClick={() => (window.location.href = "mailto:security@alexza.ai")}
            >
              {t("security.disclosure.cta")}
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
