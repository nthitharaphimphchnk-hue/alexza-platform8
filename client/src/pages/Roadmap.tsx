import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";

const columns = [
  {
    key: "now",
    titleKey: "roadmap.now.title",
    itemsKey: "roadmap.now.items",
  },
  {
    key: "next",
    titleKey: "roadmap.next.title",
    itemsKey: "roadmap.next.items",
  },
  {
    key: "later",
    titleKey: "roadmap.later.title",
    itemsKey: "roadmap.later.items",
  },
];

export default function Roadmap() {
  const { t } = useTranslation();

  return (
    <MarketingLayout>
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("roadmap.hero.title")}
          </h1>
          <p className="text-xl text-gray-400">{t("roadmap.hero.subtitle")}</p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {columns.map((col) => (
              <div
                key={col.key}
                className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)]"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  {t(col.titleKey)}
                </h3>
                <ul className="space-y-3">
                  {(() => {
                    const items = t(col.itemsKey, { returnObjects: true });
                    const arr = Array.isArray(items) ? items : [String(items)];
                    return arr.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-400 flex items-start gap-2"
                      >
                        <span className="text-[#c0c0c0] mt-0.5">•</span>
                        {item}
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-sm text-gray-500">
            {t("roadmap.disclaimer")}
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
