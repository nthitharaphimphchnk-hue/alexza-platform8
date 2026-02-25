'use client';

import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect, useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
const CHART_HEIGHT = 192;

export default function UsageAnalyticsWidget() {
  const { t } = useTranslation();
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => setWidth(el.clientWidth || 300);
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 transition-all duration-300 hover:border-[rgba(192,192,192,0.4)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("dashboard.totalRequests")}</h2>
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">
          {(totalRequests / 1000).toFixed(1)}K
        </p>
        <p className="text-sm text-gray-500">{t("dashboard.requests")}</p>
      </div>
      <div ref={containerRef} className="h-48 w-full min-w-0">
        <AreaChart data={MOCK_DATA} width={width} height={CHART_HEIGHT} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c0c0c0" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#c0c0c0" stopOpacity={0} />
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
            stroke="#c0c0c0"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </div>
      </div>
    </section>
  );
}
