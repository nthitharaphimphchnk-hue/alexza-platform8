import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeft, Building2, AlertCircle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MorphingBlob from "@/components/blob";
import { useLocation } from "wouter";
import { useState } from "react";
import { getSamlLoginUrl } from "@/lib/api";

export default function LoginSso() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = workspaceId.trim();
    if (!id) {
      setError("Enter your organization's workspace ID");
      return;
    }
    const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") || "/app/dashboard" : "/app/dashboard";
    window.location.href = getSamlLoginUrl(id, next);
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col items-center justify-center px-4 relative overflow-hidden bg-carbon-hex">
      <div className="fixed top-6 left-6 right-6 z-50 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={20} />
          <span>{t("navigation.backToHome")}</span>
        </a>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6 cursor-pointer select-none">
            <MorphingBlob
              size={120}
              intensity={0.7}
              colorAccent="#c0c0c0"
              idleSpeed={0.55}
              hoverStrength={0.9}
              glowStrength={1.2}
              glowColor="#22c55e"
              chaosLevel={0.9}
              burstMode={true}
              spinSpeed={2.5}
              tightness={0.72}
              extraSpheres={6}
            />
          </div>
          <h1 className="hero-title-gradient font-brand text-3xl font-extrabold tracking-tight">Login with SSO</h1>
          <p className="text-gray-400 mt-2">Sign in with your organization&apos;s identity provider</p>
        </div>

        <div className="rounded-2xl p-6 lg:p-8 code-block-carbon border border-[rgba(255,255,255,0.12)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Workspace ID</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  placeholder="Enter workspace ID from your admin"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[rgba(192,192,192,0.3)] focus:ring-offset-2 focus:ring-offset-[#050607]"
                />
              </div>
              <p className="text-xs text-gray-500">
                Ask your workspace admin for the SSO login link or workspace ID.
              </p>
              {error && (
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full btn-black-glow h-12 font-semibold flex items-center justify-center gap-2 rounded-lg ripple-btn"
            >
              Continue with SSO <ArrowRight size={18} />
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="text-[#c0c0c0] hover:text-white transition"
            >
              Back to standard login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
