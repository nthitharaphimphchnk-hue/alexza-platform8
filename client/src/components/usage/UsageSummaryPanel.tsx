import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UsageMetricRow {
  calls: number;
  errors: number;
  avgLatencyMs: number;
}

interface UsageSummaryResponse {
  ok: boolean;
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: UsageMetricRow & {
    errorRate: number;
  };
  byDay: Array<
    UsageMetricRow & {
      date: string;
    }
  >;
  byEndpoint: Array<
    UsageMetricRow & {
      endpoint: string;
    }
  >;
  byProject: Array<
    UsageMetricRow & {
      projectId: string;
    }
  >;
  topKeys: Array<{
    apiKeyId: string;
    keyPrefix: string;
    calls: number;
    errors: number;
  }>;
}

interface UsageSummaryPanelProps {
  projectId?: string;
  initialDays?: 7 | 14 | 30 | 90;
  onUnauthorized?: () => void;
  onProjectNotFound?: () => void;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatLatency(value: number) {
  return `${value.toFixed(2)} ms`;
}

function SectionTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)]">
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 text-left font-medium text-gray-500">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="border-b border-[rgba(255,255,255,0.04)]">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-gray-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-sm text-gray-500">
                  No data in selected range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsageSummaryPanel({
  projectId,
  initialDays = 7,
  onUnauthorized,
  onProjectNotFound,
}: UsageSummaryPanelProps) {
  const [days, setDays] = useState<7 | 14 | 30 | 90>(initialDays);
  const [data, setData] = useState<UsageSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadUsage = useCallback(async () => {
    const query = `days=${days}`;
    const path = projectId
      ? `/api/projects/${projectId}/usage/summary?${query}`
      : `/api/usage/summary?${query}`;

    if (!data) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await apiRequest<UsageSummaryResponse>(path);
      setData(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        showErrorToast("Session expired", "Please login again");
        onUnauthorized?.();
        return;
      }
      if (projectId && error instanceof ApiError && error.status === 404) {
        showErrorToast("Project not found or no access");
        onProjectNotFound?.();
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load usage";
      showErrorToast("Unable to load usage analytics", message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data, days, onProjectNotFound, onUnauthorized, projectId]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const isEmpty = useMemo(() => {
    if (!data) return false;
    return data.totals.calls === 0;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {data
            ? `Range: ${new Date(data.range.from).toLocaleDateString()} - ${new Date(data.range.to).toLocaleDateString()}`
            : "Select range"}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="usage-days" className="text-sm text-gray-400">
            Period
          </label>
          <select
            id="usage-days"
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as 7 | 14 | 30 | 90)}
            className="rounded-md border border-[rgba(255,255,255,0.14)] bg-[#050607] px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6">
          <p className="text-gray-400">Loading usage analytics...</p>
        </div>
      )}

      {!isLoading && data && (
        <>
          {isRefreshing && <p className="text-xs text-gray-500">Refreshing...</p>}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <p className="text-xs text-gray-500">Calls</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(data.totals.calls)}</p>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <p className="text-xs text-gray-500">Error rate</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(data.totals.errorRate)}</p>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <p className="text-xs text-gray-500">Avg latency</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatLatency(data.totals.avgLatencyMs)}</p>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-4">
              <p className="text-xs text-gray-500">Errors</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(data.totals.errors)}</p>
            </div>
          </div>

          {isEmpty ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-6">
              <p className="text-gray-300">No usage yet - run Playground to generate logs</p>
            </div>
          ) : (
            <div className="space-y-4">
              <SectionTable
                title="By Day"
                columns={["Date", "Calls", "Errors", "Avg Latency (ms)"]}
                rows={data.byDay.map((row) => [
                  row.date,
                  formatNumber(row.calls),
                  formatNumber(row.errors),
                  row.avgLatencyMs.toFixed(2),
                ])}
              />
              <SectionTable
                title="By Endpoint"
                columns={["Endpoint", "Calls", "Errors", "Avg Latency (ms)"]}
                rows={data.byEndpoint.map((row) => [
                  row.endpoint,
                  formatNumber(row.calls),
                  formatNumber(row.errors),
                  row.avgLatencyMs.toFixed(2),
                ])}
              />
              <SectionTable
                title="By Project"
                columns={["Project ID", "Calls", "Errors", "Avg Latency (ms)"]}
                rows={data.byProject.map((row) => [
                  row.projectId,
                  formatNumber(row.calls),
                  formatNumber(row.errors),
                  row.avgLatencyMs.toFixed(2),
                ])}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
