import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { listAiEvaluations, type AiEvaluation } from "@/lib/aiEvaluationsApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AiEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<AiEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listAiEvaluations()
      .then((data) => setEvaluations(data))
      .catch(() => setError("Failed to load AI evaluations"))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(
    () =>
      evaluations
        .slice()
        .reverse()
        .map((e) => ({
          createdAt: formatDateTime(e.createdAt),
          qualityScore: e.qualityScore,
          latency: e.latency,
          tokens: e.tokens,
        })),
    [evaluations]
  );

  return (
    <AppShell
      title="AI Evaluation System"
      subtitle="Monitor quality, latency, and token usage for your AI actions."
      breadcrumbs={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "AI Evaluations" }]}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Overview</h2>
          <p className="text-sm text-gray-400">
            Each AI action run is scored on basic quality heuristics (response length, completion success, latency) and
            stored for analysis. Use this page to spot regressions when you change prompts or routing.
          </p>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6 h-80">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Quality & Latency Trends</h3>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-500">No evaluation data yet. Run some actions to populate this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="createdAt" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v} ms`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="qualityScore"
                  stroke="#22c55e"
                  dot={false}
                  name="Quality Score"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="latency"
                  stroke="#60a5fa"
                  dot={false}
                  name="Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Evaluations</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Loading evaluations…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : evaluations.length === 0 ? (
            <p className="text-sm text-gray-500">No evaluations recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="border-b border-[rgba(148,163,184,0.3)] text-gray-400">
                  <tr>
                    <th className="px-2 py-1">Action</th>
                    <th className="px-2 py-1">Version</th>
                    <th className="px-2 py-1">Model</th>
                    <th className="px-2 py-1">Quality</th>
                    <th className="px-2 py-1">Latency (ms)</th>
                    <th className="px-2 py-1">Tokens</th>
                    <th className="px-2 py-1">Cost (USD)</th>
                    <th className="px-2 py-1">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(148,163,184,0.2)] text-gray-200">
                  {evaluations.map((e, idx) => (
                    <tr key={`${e.actionId}-${e.createdAt}-${idx}`}>
                      <td className="px-2 py-1 font-mono">
                        {e.actionName || e.actionId.slice(0, 6)}
                      </td>
                      <td className="px-2 py-1">{e.promptVersion}</td>
                      <td className="px-2 py-1">{e.model}</td>
                      <td className="px-2 py-1">{e.qualityScore}</td>
                      <td className="px-2 py-1">{e.latency}</td>
                      <td className="px-2 py-1">{e.tokens}</td>
                      <td className="px-2 py-1">{e.cost.toFixed(6)}</td>
                      <td className="px-2 py-1">{formatDateTime(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

