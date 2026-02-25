'use client';

import { useTranslation } from "react-i18next";
import { Check, ChevronRight, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getOnboardingStatus, type OnboardingStatus } from "@/lib/alexzaApi";
import { getProjects } from "@/lib/alexzaApi";

const STEP_KEYS = [
  "dashboard.createProject",
  "dashboard.createApiKey",
  "dashboard.openChatBuilder",
  "dashboard.testInPlayground",
] as const;

export default function OnboardingChecklist() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hrefs, setHrefs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, projects] = await Promise.all([
          getOnboardingStatus(),
          getProjects(),
        ]);
        if (cancelled) return;
        setStatus(s);
        const next: Record<string, string> = {};
        for (const step of STEP_KEYS) {
          if (projects.length > 0) {
            if (step === "dashboard.createProject") next[step] = "/app/projects";
            else if (step === "dashboard.createApiKey") next[step] = `/app/projects/${projects[0].id}?tab=keys`;
            else if (step === "dashboard.openChatBuilder") next[step] = `/app/projects/${projects[0].id}/ai`;
            else next[step] = `/app/projects/${projects[0].id}/playground`;
          } else {
            if (step === "dashboard.createProject") next[step] = "/app/projects";
            else next[step] = "/app/projects";
          }
        }
        setHrefs(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !status) {
    return (
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-black p-4">
        <div className="skeleton-shimmer h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (status.complete) return null;

  const done = (key: string) => {
    if (key === "dashboard.createProject") return status.hasProject;
    if (key === "dashboard.createApiKey") return status.hasApiKey;
    if (key === "dashboard.openChatBuilder") return status.hasAction;
    return status.hasAction; // playground: ready to test when action exists
  };

  return (
    <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5 transition-all hover:border-[rgba(192,192,192,0.4)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c0c0c0] animate-pulse" aria-hidden />
        <h2 className="text-lg font-semibold text-white">{t("dashboard.gettingStarted")}</h2>
      </div>
      <div className="space-y-3">
        {STEP_KEYS.map((stepKey, idx) => {
          const isDone = done(stepKey);
          const href = hrefs[stepKey] ?? "#";
          const isNext = !isDone && STEP_KEYS.every((k, i) => i >= idx || done(k));
          const stepColors = [
            "emerald",
            "blue",
            "violet",
            "amber",
          ] as const;
          const color = stepColors[idx] ?? "emerald";
          const colorClasses = "hover:border-[rgba(192,192,192,0.4)]";
          const iconColors = "group-hover:text-[#c0c0c0]";
          const pillColors = "bg-[rgba(255,255,255,0.08)] text-gray-300 border-[rgba(255,255,255,0.08)]";
          const circleDone = "border-[rgba(192,192,192,0.4)] bg-[rgba(192,192,192,0.1)]";
          const circlePendingMap = {
            emerald: "border-[rgba(255,255,255,0.12)] group-hover:border-[rgba(192,192,192,0.4)]",
            blue: "border-[rgba(255,255,255,0.12)] group-hover:border-[rgba(192,192,192,0.4)]",
            violet: "border-[rgba(255,255,255,0.12)] group-hover:border-[rgba(192,192,192,0.4)]",
            amber: "border-[rgba(255,255,255,0.12)] group-hover:border-[rgba(192,192,192,0.4)]",
          };
          const circlePending = circlePendingMap[color];
          return (
            <Link
              key={stepKey}
              href={href}
              className={`group relative flex overflow-hidden items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 p-3.5 transition-all duration-300 hover:scale-[1.01] hover:bg-[rgba(255,255,255,0.03)] ${colorClasses}`}
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full" aria-hidden />
              <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${isDone ? circleDone : circlePending}`}>
                {isDone ? (
                  <Check size={16} className="text-[#c0c0c0]" />
                ) : (
                  <Circle size={14} className={`text-gray-500 transition-colors ${iconColors}`} />
                )}
              </div>
              <span className={`relative flex h-6 items-center rounded-md border px-2 text-[10px] font-bold ${isDone ? "bg-gray-500/10 text-gray-500 border-gray-600/40" : pillColors}`}>
                {idx + 1}
              </span>
              <span className={`relative flex-1 text-sm font-medium ${isDone ? "text-gray-400" : "text-white"}`}>
                {t(stepKey)}
              </span>
              {isNext && (
                <span className="relative rounded-full bg-[rgba(192,192,192,0.2)] px-2 py-0.5 text-[10px] font-semibold text-[#c0c0c0] animate-pulse border border-[rgba(192,192,192,0.35)]">
                  {t("common.next")}
                </span>
              )}
              <ChevronRight size={18} className={`relative text-gray-500 transition-all duration-300 ${iconColors} group-hover:translate-x-0.5`} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
