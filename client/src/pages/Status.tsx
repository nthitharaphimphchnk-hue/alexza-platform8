import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComponentHealth {
  name: string;
  status: "operational" | "degraded" | "down";
  latency?: number;
  message?: string;
}

interface StatusData {
  ok: boolean;
  components: ComponentHealth[];
  uptime24h: number;
  timestamp: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)?.trim()?.replace(/\/+$/, "") || "";

function StatusIndicator({ status }: { status: ComponentHealth["status"] }) {
  if (status === "operational") {
    return (
      <div className="flex items-center gap-2 text-green-500">
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-sm font-medium">Operational</span>
      </div>
    );
  }
  if (status === "degraded") {
    return (
      <div className="flex items-center gap-2 text-yellow-500">
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="text-sm font-medium">Degraded</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-red-500">
      <span className="w-3 h-3 rounded-full bg-red-500" />
      <span className="text-sm font-medium">Down</span>
    </div>
  );
}

export default function Status() {
  const { t } = useTranslation();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await fetch(`${base}/api/status`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch status");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = data?.components?.every((c) => c.status === "operational") ?? false;
  const hasDown = data?.components?.some((c) => c.status === "down") ?? false;
  const overallStatus = hasDown ? "down" : allOperational ? "operational" : "degraded";

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
          {loading && !data ? (
            <div className="p-12 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="text-gray-400">Loading status...</span>
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-[#0b0e12] border border-red-500/30 text-center mb-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Unable to load status</h2>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <Button variant="outline" onClick={fetchStatus} className="gap-2">
                <RefreshCw size={16} />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div
                className={`p-8 rounded-2xl bg-[#0b0e12] border text-center mb-8 ${
                  overallStatus === "operational"
                    ? "border-green-500/30"
                    : overallStatus === "degraded"
                      ? "border-yellow-500/30"
                      : "border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      overallStatus === "operational"
                        ? "bg-green-500"
                        : overallStatus === "degraded"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    } ${overallStatus === "operational" ? "animate-pulse" : ""}`}
                  />
                  <h2 className="text-2xl font-bold text-white">
                    {overallStatus === "operational"
                      ? t("status.allOperational")
                      : overallStatus === "degraded"
                        ? "Partial system outage"
                        : "System outage"}
                  </h2>
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  {data?.uptime24h != null
                    ? `Uptime (24h): ${data.uptime24h}%`
                    : t("status.allOperationalDesc")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchStatus}
                  disabled={loading}
                  className="gap-2 text-gray-400 hover:text-white"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Refresh
                </Button>
              </div>

              <div className="space-y-4">
                {data?.components?.map((comp) => (
                  <div
                    key={comp.name}
                    className="p-6 rounded-2xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{comp.name}</span>
                      {comp.latency != null && (
                        <span className="text-gray-500 text-sm">{comp.latency}ms</span>
                      )}
                    </div>
                    <StatusIndicator status={comp.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
