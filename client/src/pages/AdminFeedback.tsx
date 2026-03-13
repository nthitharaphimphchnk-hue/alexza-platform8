import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";

type FeedbackType = "bug" | "feature_request" | "ux_issue" | "general";
type FeedbackStatus = "new" | "reviewed" | "closed";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  email?: string;
  userId?: string;
  workspaceId?: string;
  route: string;
  userAgent: string;
  createdAt: string;
  status: FeedbackStatus;
}

function getAdminHeaders(): Record<string, string> {
  const key = (import.meta.env.VITE_ADMIN_API_KEY as string)?.trim();
  if (key) return { "x-admin-key": key };
  return {};
}

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await apiRequest<{ ok: boolean; items: FeedbackItem[]; total: number }>(
        `/api/admin/feedback?${params.toString()}`,
        { headers: getAdminHeaders() }
      );
      if (!res.ok) throw new Error("Response not ok");
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load feedback";
      showErrorToast("Feedback list error", msg);
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, typeFilter, statusFilter, dateFrom, dateTo]);

  return (
    <AppShell
      title="Feedback"
      subtitle="User feedback, bug reports, and feature requests"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin/launch" },
        { label: "Feedback" },
      ]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 py-2 text-sm text-white"
          >
            <option value="">All types</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature request</option>
            <option value="ux_issue">UX issue</option>
            <option value="general">General</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="closed">Closed</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 py-2 text-sm text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 py-2 text-sm text-white"
          />
          <Button variant="outline" size="sm" onClick={() => void load()} className="border-[rgba(255,255,255,0.12)]">
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)] text-left text-xs text-gray-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Message</th>
                    <th className="p-3">Route</th>
                    <th className="p-3">Email / User</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        No feedback yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="border-b border-[rgba(255,255,255,0.04)] text-gray-200">
                        <td className="p-3 text-gray-400">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">{row.type}</td>
                        <td className="p-3">{row.status}</td>
                        <td className="p-3 max-w-xs truncate" title={row.message}>
                          {row.message}
                        </td>
                        <td className="p-3 text-gray-400">{row.route}</td>
                        <td className="p-3 text-gray-400">
                          {row.email ?? row.userId ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {total > limit && (
              <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs text-gray-400">
                <span>
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="border-[rgba(255,255,255,0.12)]"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * limit >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-[rgba(255,255,255,0.12)]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500">
          Admin list requires <code className="text-gray-400">x-admin-key</code> header. Set{" "}
          <code className="text-gray-400">VITE_ADMIN_API_KEY</code> in env to load feedback from this page.
        </p>
      </div>
    </AppShell>
  );
}
