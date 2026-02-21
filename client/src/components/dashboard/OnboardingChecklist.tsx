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
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-4 backdrop-blur">
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
    <section className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-5 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-white">{t("dashboard.gettingStarted")}</h2>
      <div className="space-y-3">
        {STEP_KEYS.map((stepKey, idx) => {
          const isDone = done(stepKey);
          const href = hrefs[stepKey] ?? "#";
          return (
            <Link
              key={stepKey}
              href={href}
              className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-3 transition hover:bg-[rgba(255,255,255,0.04)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)]">
                {isDone ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Circle size={14} className="text-gray-500" />
                )}
              </div>
              <span className={`flex-1 text-sm ${isDone ? "text-gray-400" : "text-white"}`}>
                {idx + 1}. {t(stepKey)}
              </span>
              <ChevronRight size={16} className="text-gray-500" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
