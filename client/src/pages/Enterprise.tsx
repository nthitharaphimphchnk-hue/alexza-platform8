import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    key: "team",
    comingSoon: true,
    titleKey: "enterprise.plans.team.title",
    descKey: "enterprise.plans.team.desc",
  },
  {
    key: "business",
    comingSoon: false,
    titleKey: "enterprise.plans.business.title",
    descKey: "enterprise.plans.business.desc",
  },
  {
    key: "enterprise",
    comingSoon: false,
    titleKey: "enterprise.plans.enterprise.title",
    descKey: "enterprise.plans.enterprise.desc",
  },
];

const featureTableRows = [
  { featureKey: "enterprise.table.sla", team: false, business: true, enterprise: true },
  { featureKey: "enterprise.table.dedicatedSupport", team: false, business: true, enterprise: true },
  { featureKey: "enterprise.table.customModels", team: false, business: false, enterprise: true },
  { featureKey: "enterprise.table.onPrem", team: false, business: false, enterprise: true },
];

export default function Enterprise() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("enterprise.hero.title")}
          </h1>
          <p className="text-xl text-gray-400">{t("enterprise.hero.subtitle")}</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className="p-8 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] flex flex-col"
              >
                {plan.comingSoon && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.08)] text-gray-400 mb-4 w-fit">
                    {t("enterprise.comingSoon")}
                  </span>
                )}
                <h3 className="text-xl font-bold text-white mb-2">
                  {t(plan.titleKey)}
                </h3>
                <p className="text-gray-400 text-sm flex-1">{t(plan.descKey)}</p>
                {!plan.comingSoon && (
                  <Button
                    className="mt-6 btn-silver-bright w-full"
                    onClick={() => (window.location.href = "mailto:sales@alexza.ai")}
                  >
                    {t("enterprise.contactSales")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            {t("enterprise.table.title")}
          </h2>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0b0e12] border-b border-[rgba(255,255,255,0.1)]">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-white">
                    {t("enterprise.table.feature")}
                  </th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-400">
                    Team
                  </th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-400">
                    Business
                  </th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-400">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureTableRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[rgba(255,255,255,0.06)] last:border-0"
                  >
                    <td className="py-4 px-6 text-sm text-gray-300">
                      {t(row.featureKey)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.team ? (
                        <Check size={18} className="text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.business ? (
                        <Check size={18} className="text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.enterprise ? (
                        <Check size={18} className="text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t("enterprise.cta.title")}
          </h2>
          <p className="text-gray-400 mb-6">{t("enterprise.cta.subtitle")}</p>
          <Button
            className="btn-silver-bright h-12 px-8"
            onClick={() => (window.location.href = "mailto:sales@alexza.ai")}
          >
            {t("enterprise.cta.button")}
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
