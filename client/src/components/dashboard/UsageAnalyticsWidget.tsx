'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MOCK_DATA = [
  { date: "Feb 14", requests: 18200 },
  { date: "Feb 15", requests: 22100 },
  { date: "Feb 16", requests: 19500 },
  { date: "Feb 17", requests: 24800 },
  { date: "Feb 18", requests: 31200 },
  { date: "Feb 19", requests: 28500 },
  { date: "Feb 20", requests: 32500 },
];

const totalRequests = MOCK_DATA.reduce((s, d) => s + d.requests, 0);

export default function UsageAnalyticsWidget() {
  return (
    <section className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Total Requests (Last 7 Days)</h2>
      </div>
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">
          {(totalRequests / 1000).toFixed(1)}K
        </p>
        <p className="text-sm text-gray-500">Requests</p>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_DATA}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0b0e12",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(value: number) => [`${value.toLocaleString()} requests`, "Requests"]}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#usageGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
