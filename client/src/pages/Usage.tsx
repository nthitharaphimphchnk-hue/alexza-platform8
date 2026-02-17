import UsageSummaryPanel from "@/components/usage/UsageSummaryPanel";
import { useLocation } from "wouter";

export default function Usage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white">Usage Analytics</h1>
          <p className="mt-2 text-gray-400">Live usage from usage logs across all projects</p>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-6">
          <UsageSummaryPanel
            onUnauthorized={() => {
              setLocation("/login");
            }}
          />
        </div>
      </div>
    </div>
  );
}
