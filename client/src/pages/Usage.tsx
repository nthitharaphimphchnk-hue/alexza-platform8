import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Download, Filter, LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { showSuccessToast } from "@/lib/toast";

type FilterRange = "7d" | "30d" | "custom";

const points = [
  { day: "Mon", requests: 1200, errors: 13, credits: 3200 },
  { day: "Tue", requests: 1880, errors: 19, credits: 4100 },
  { day: "Wed", requests: 1420, errors: 8, credits: 3600 },
  { day: "Thu", requests: 2050, errors: 17, credits: 5400 },
  { day: "Fri", requests: 2430, errors: 24, credits: 6100 },
  { day: "Sat", requests: 1780, errors: 10, credits: 3900 },
  { day: "Sun", requests: 1660, errors: 9, credits: 3700 },
];

function exportCsv() {
  const header = "day,requests,errors,credits\n";
  const body = points.map((row) => `${row.day},${row.requests},${row.errors},${row.credits}`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "usage-analytics.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showSuccessToast("Usage CSV exported");
}

export default function Usage() {
  const [range, setRange] = useState<FilterRange>("7d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const metrics = useMemo(() => {
    const totalRequests = points.reduce((sum, row) => sum + row.requests, 0);
    const totalCredits = points.reduce((sum, row) => sum + row.credits, 0);
    const totalErrors = points.reduce((sum, row) => sum + row.errors, 0);
    return { totalRequests, totalCredits, totalErrors };
  }, []);

  return (
    <AppShell
      title="Usage Analytics"
      subtitle="Track API usage, error rates and credits trends"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Usage" },
      ]}
      actions={
        <Button onClick={exportCsv} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
          <Download size={16} className="mr-2" />
          Export CSV
        </Button>
      }
    >
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["7d", "30d", "custom"] as FilterRange[]).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`ripple-btn rounded-lg px-3 py-1.5 text-sm ${
                range === item
                  ? "bg-[rgba(192,192,192,0.18)] text-white border border-[rgba(192,192,192,0.35)]"
                  : "bg-[#050607] text-gray-400 border border-[rgba(255,255,255,0.08)] hover:text-white"
              }`}
            >
              {item === "custom" ? "Custom" : item.toUpperCase()}
            </button>
          ))}
          {range === "custom" && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <Filter size={14} className="text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#050607] px-2 py-1 text-gray-200"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#050607] px-2 py-1 text-gray-200"
              />
            </div>
          )}
        </div>

        <div className="h-[320px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607]/80 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <defs>
                <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c0c0c0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#c0c0c0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" />
              <YAxis stroke="rgba(255,255,255,0.45)" />
              <Tooltip
                contentStyle={{
                  background: "#0b0e12",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#c0c0c0"
                fill="url(#requestsGradient)"
                strokeWidth={2}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Total Requests",
            value: metrics.totalRequests.toLocaleString(),
            detail: "Across all endpoints",
          },
          {
            label: "Total Credits Used",
            value: metrics.totalCredits.toLocaleString(),
            detail: "Inference + gateway",
          },
          {
            label: "Errors Logged",
            value: metrics.totalErrors.toLocaleString(),
            detail: "Warnings and failures",
          },
        ].map((card, idx) => (
          <div key={idx} className="card-hover rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <LineChart size={14} />
              {card.label}
            </div>
            <p className="text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.detail}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
