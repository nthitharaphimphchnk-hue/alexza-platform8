import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { CheckCircle2 } from "lucide-react";

const components = [
  { key: "status.components.api" },
  { key: "status.components.dashboard" },
  { key: "status.components.billing" },
  { key: "status.components.webhooks" },
  { key: "status.components.runtime" },
];

export default function Status() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("status.hero.title")}
          </h1>
          <p className="text-xl text-gray-400">{t("status.hero.subtitle")}</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-2xl font-bold text-white">
                {t("status.allOperational")}
              </h2>
            </div>
            <p className="text-gray-400 text-sm">
              {t("status.allOperationalDesc")}
            </p>
          </div>

          <div className="space-y-4">
            {components.map((comp) => (
              <div
                key={comp.key}
                className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] flex items-center justify-between"
              >
                <span className="text-white font-medium">{t(comp.key)}</span>
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 size={20} />
                  <span className="text-sm font-medium">
                    {t("status.operational")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
