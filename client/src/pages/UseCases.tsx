import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { CodeSnippet } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  FileText,
  Megaphone,
  Search,
  BarChart3,
  GitBranch,
} from "lucide-react";

const useCases = [
  {
    icon: MessageSquare,
    titleKey: "useCases.customerSupport.title",
    problemKey: "useCases.customerSupport.problem",
    actionsKey: "useCases.customerSupport.actions",
    exampleApi: 'fetch("https://api.alexza.ai/v1/run", { method: "POST", headers: { "x-api-key": "axza_xxx" }, body: JSON.stringify({ input: "Customer: My order is late..." }) })',
    tierKey: "useCases.customerSupport.tier",
    ctaKey: "useCases.customerSupport.cta",
  },
  {
    icon: FileText,
    titleKey: "useCases.documentIntelligence.title",
    problemKey: "useCases.documentIntelligence.problem",
    actionsKey: "useCases.documentIntelligence.actions",
    exampleApi: 'fetch("https://api.alexza.ai/v1/run", { method: "POST", body: JSON.stringify({ input: documentText }) })',
    tierKey: "useCases.documentIntelligence.tier",
    ctaKey: "useCases.documentIntelligence.cta",
  },
  {
    icon: Megaphone,
    titleKey: "useCases.marketingAutomation.title",
    problemKey: "useCases.marketingAutomation.problem",
    actionsKey: "useCases.marketingAutomation.actions",
    exampleApi: 'fetch("https://api.alexza.ai/v1/run", { method: "POST", body: JSON.stringify({ input: { campaign: "Q1", audience: "enterprise" } }) })',
    tierKey: "useCases.marketingAutomation.tier",
    ctaKey: "useCases.marketingAutomation.cta",
  },
  {
    icon: Search,
    titleKey: "useCases.ragSearch.title",
    problemKey: "useCases.ragSearch.problem",
    actionsKey: "useCases.ragSearch.actions",
    exampleApi: 'fetch("https://api.alexza.ai/v1/run", { method: "POST", body: JSON.stringify({ query, context }) })',
    tierKey: "useCases.ragSearch.tier",
    ctaKey: "useCases.ragSearch.cta",
  },
  {
    icon: BarChart3,
    titleKey: "useCases.dataToInsights.title",
    problemKey: "useCases.dataToInsights.problem",
    actionsKey: "useCases.dataToInsights.actions",
    exampleApi: 'fetch("https://api.alexza.ai/v1/run", { method: "POST", body: JSON.stringify({ data: csvRows }) })',
    tierKey: "useCases.dataToInsights.tier",
    ctaKey: "useCases.dataToInsights.cta",
  },
  {
    icon: GitBranch,
    titleKey: "useCases.workflowAutomation.title",
    problemKey: "useCases.workflowAutomation.problem",
    actionsKey: "useCases.workflowAutomation.actions",
    exampleApi: 'fetch("https://api.alexza.ai/v1/run", { method: "POST", body: JSON.stringify({ trigger: "webhook", payload }) })',
    tierKey: "useCases.workflowAutomation.tier",
    ctaKey: "useCases.workflowAutomation.cta",
  },
];

export default function UseCases() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("useCases.hero.title")}
          </h1>
          <p className="text-xl text-gray-400">{t("useCases.hero.subtitle")}</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.18)] transition-all"
              >
                <uc.icon className="w-6 h-6 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t(uc.titleKey)}
                </h3>
                <p className="text-sm text-gray-400 mb-3">{t(uc.problemKey)}</p>
                <p className="text-sm text-gray-300 mb-4">{t(uc.actionsKey)}</p>
                <CodeSnippet code={uc.exampleApi} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-[#c0c0c0] px-2 py-1 rounded border border-[rgba(255,255,255,0.1)]">
                    {t(uc.tierKey)}
                  </span>
                  <Button
                    size="sm"
                    className="btn-silver-bright"
                    onClick={() => (window.location.href = "/signup")}
                  >
                    {t(uc.ctaKey)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
