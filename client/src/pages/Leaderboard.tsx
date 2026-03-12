import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";

interface LeaderItem {
  id: string;
  rank: number;
  name: string;
  downloads?: number;
  rating?: number;
}

interface CreatorItem extends LeaderItem {
  username?: string;
  revenue?: number;
}

interface LeaderboardResponse {
  ok: boolean;
  topCreators: CreatorItem[];
  topAgents: LeaderItem[];
  topWorkflows: LeaderItem[];
  topTemplates: LeaderItem[];
}

function LeaderboardTable({
  title,
  items,
}: {
  title: string;
  items: LeaderItem[];
}) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)] text-xs text-gray-400">
              <th className="py-2 pr-4 text-left">#</th>
              <th className="py-2 pr-4 text-left">Name</th>
              <th className="py-2 pr-4 text-right">Downloads</th>
              <th className="py-2 pr-0 text-right">Rating</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-xs text-gray-500"
                >
                  No data yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[rgba(255,255,255,0.04)] text-gray-200"
                >
                  <td className="py-1.5 pr-4 text-left text-xs text-gray-400">
                    {item.rank}
                  </td>
                  <td className="py-1.5 pr-4 text-left">{item.name}</td>
                  <td className="py-1.5 pr-4 text-right">
                    {item.downloads != null
                      ? item.downloads.toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-1.5 pr-0 text-right">
                    {item.rating != null ? item.rating.toFixed(1) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiRequest<LeaderboardResponse>("/api/leaderboard");
        if (!res.ok) throw new Error("Leaderboard request not ok");
        setData(res);
      } catch (err) {
        showErrorToast(
          "Failed to load leaderboard",
          err instanceof Error ? err.message : "Unknown error"
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen text-foreground">
      <AppShell
        title="Developer Leaderboard"
        subtitle="Top creators and most popular AI resources on ALEXZA AI."
        backHref="/"
        backLabel="Back to Home"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Leaderboard" },
        ]}
      >
        <div className="space-y-6">
          {isLoading && (
            <div className="text-sm text-gray-400">Loading leaderboard…</div>
          )}
          {!isLoading && data && (
            <div className="grid gap-4 lg:grid-cols-2">
              <LeaderboardTable
                title="Top Creators"
                items={data.topCreators.map((c) => ({
                  id: c.id,
                  rank: c.rank,
                  name: c.name,
                  downloads: c.revenue ? Math.round(c.revenue) : undefined,
                  rating: undefined,
                }))}
              />
              <LeaderboardTable
                title="Top Templates"
                items={data.topTemplates}
              />
              <LeaderboardTable title="Top Agents" items={data.topAgents} />
              <LeaderboardTable
                title="Top Workflows"
                items={data.topWorkflows}
              />
            </div>
          )}
        </div>
      </AppShell>
    </div>
  );
}

