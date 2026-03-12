import AppShell from "@/components/app/AppShell";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useEffect, useMemo, useState } from "react";

type FeedbackType = "bug" | "feature" | "ux" | "general";
type FeedbackStatus = "new" | "triaged" | "in_progress" | "resolved" | "closed";
type FeedbackPriority = "low" | "medium" | "high" | "critical";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  email?: string;
  userId?: string | null;
  workspaceId?: string | null;
  route?: string;
  userAgent?: string;
  createdAt: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  assigneeUserId?: string | null;
  internalNotes?: string;
}

interface FeedbackResponse {
  ok: boolean;
  items: FeedbackItem[];
}

interface FeedbackStats {
  ok: boolean;
  byStatus: Record<FeedbackStatus, number>;
  byPriority: Record<FeedbackPriority, number>;
  byType: Record<FeedbackType, number>;
}

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<FeedbackStats | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const [editStatus, setEditStatus] = useState<FeedbackStatus>("new");
  const [editPriority, setEditPriority] = useState<FeedbackPriority>("medium");
  const [editAssignee, setEditAssignee] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const applySelection = (item: FeedbackItem | null) => {
    if (!item) {
      setSelectedId(null);
      return;
    }
    setSelectedId(item.id);
    setEditStatus(item.status);
    setEditPriority(item.priority);
    setEditAssignee(item.assigneeUserId ?? "");
    setEditNotes(item.internalNotes ?? "");
  };

  const load = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (assigneeFilter) params.set("assignee", assigneeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const [listRes, statsRes] = await Promise.all([
        apiRequest<FeedbackResponse>(`/api/admin/feedback?${params.toString()}`, {
          headers: {
            // x-admin-key is expected to be supplied via proxy/extension in real prod environments.
          },
        }),
        apiRequest<FeedbackStats>("/api/admin/feedback/stats", {
          headers: {
            // x-admin-key is expected to be supplied via proxy/extension in real prod environments.
          },
        }),
      ]);

      if (!listRes.ok) {
        throw new Error("Feedback endpoint returned not ok");
      }
      setItems(listRes.items);
      if (statsRes.ok) {
        setStats(statsRes);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load feedback";
      showErrorToast("Admin feedback error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "All types" },
    { value: "bug", label: "Bug" },
    { value: "feature", label: "Feature request" },
    { value: "ux", label: "UX issue" },
    { value: "general", label: "General" },
  ];

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "All statuses" },
    { value: "new", label: "New" },
    { value: "triaged", label: "Triaged" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  const priorityOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "All priorities" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];

  const assigneeOptions: Array<{ value: string; label: string }> = [
    { value: "", label: "All assignees" },
    { value: "assigned", label: "Assigned" },
    { value: "unassigned", label: "Unassigned" },
  ];

  const summary = useMemo(() => {
    const byStatus: Partial<Record<FeedbackStatus, number>> = {};
    const byPriority: Partial<Record<FeedbackPriority, number>> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
    }
    return { byStatus, byPriority };
  }, [items]);

  const newCount = summary.byStatus.new ?? 0;
  const inProgressCount = (summary.byStatus.in_progress ?? 0) + (summary.byStatus.triaged ?? 0);
  const resolvedCount = summary.byStatus.resolved ?? 0;
  const criticalCount = summary.byPriority.critical ?? 0;

  const saveEdits = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await apiRequest<{ ok: boolean; updated: boolean }>(
        `/api/admin/feedback/${selectedItem.id}`,
        {
          method: "PATCH",
          body: {
            status: editStatus,
            priority: editPriority,
            assigneeUserId: editAssignee || null,
            internalNotes: editNotes,
          },
          headers: {
            // x-admin-key is expected to be supplied via proxy/extension in real prod environments.
          },
        }
      );
      showSuccessToast("Feedback updated");
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update feedback";
      showErrorToast("Update failed", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const quickSetStatus = (next: FeedbackStatus) => {
    setEditStatus(next);
    void saveEdits();
  };

  return (
    <AppShell
      title="Feedback Inbox"
      subtitle="User feedback, bug reports, and feature requests from inside the app"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin", href: "/app/admin" },
        { label: "Feedback" },
      ]}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide">New</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {stats?.byStatus.new ?? newCount}
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide">In Progress</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {stats
                ? (stats.byStatus.in_progress ?? 0) + (stats.byStatus.triaged ?? 0)
                : inProgressCount}
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide">Resolved</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {stats?.byStatus.resolved ?? resolvedCount}
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide">Critical</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {stats?.byPriority.critical ?? criticalCount}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3 text-xs text-gray-300">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                Type
              </span>
              <select
                className="h-8 rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-2 text-xs text-gray-200"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                Status
              </span>
              <select
                className="h-8 rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-2 text-xs text-gray-200"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                Priority
              </span>
              <select
                className="h-8 rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-2 text-xs text-gray-200"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                Assignee
              </span>
              <select
                className="h-8 rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-2 text-xs text-gray-200"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                {assigneeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                From
              </span>
              <input
                type="date"
                className="h-8 rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-2 text-xs text-gray-200"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                To
              </span>
              <input
                type="date"
                className="h-8 rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-2 text-xs text-gray-200"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="h-8 rounded-md border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 text-xs font-medium text-gray-200 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607]">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)] bg-black/40 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Workspace</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-xs text-gray-500"
                    >
                      Loading feedback…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-xs text-gray-500"
                    >
                      No feedback found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isSelected = item.id === selectedId;
                    const priorityBadgeClass =
                      item.priority === "critical"
                        ? "bg-red-500/10 text-red-300 border-red-500/40"
                        : item.priority === "high"
                          ? "bg-orange-500/10 text-orange-300 border-orange-500/40"
                          : item.priority === "medium"
                            ? "bg-yellow-500/10 text-yellow-200 border-yellow-500/40"
                            : "bg-gray-500/10 text-gray-300 border-gray-500/40";
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-[rgba(255,255,255,0.04)] align-top cursor-pointer ${
                          isSelected ? "bg-white/5" : "hover:bg-white/3"
                        }`}
                        onClick={() => applySelection(item)}
                      >
                        <td className="px-3 py-2 text-[11px] text-gray-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-[11px] capitalize text-gray-200">
                          {item.type}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${priorityBadgeClass}`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-300">
                          {item.status.replace("_", " ")}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-300">
                          {item.email || item.userId || "—"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-400">
                          {item.workspaceId || "—"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-400 max-w-[140px] truncate">
                          {item.route || "—"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-100 max-w-[260px]">
                          <div className="line-clamp-3 whitespace-pre-wrap break-words">
                            {item.message}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Details
              </div>
              {selectedItem ? (
                <div className="space-y-3 text-xs text-gray-200">
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase">Created</div>
                    <div>{new Date(selectedItem.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase">Type</div>
                      <div className="capitalize">{selectedItem.type}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase">User</div>
                      <div>{selectedItem.email || selectedItem.userId || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase">Workspace</div>
                      <div className="truncate">{selectedItem.workspaceId || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase">Route</div>
                      <div className="truncate">{selectedItem.route || "—"}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase">Message</div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-gray-100">
                      {selectedItem.message}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase mb-1">
                      Internal Notes
                    </div>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-[rgba(255,255,255,0.16)] bg-[#050607] px-2 py-1 text-xs text-gray-100"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add internal notes for the team…"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-gray-500">
                        Status
                      </span>
                      <select
                        className="h-8 rounded-md border border-[rgba(255,255,255,0.16)] bg-[#050607] px-2 text-xs text-gray-200"
                        value={editStatus}
                        onChange={(e) =>
                          setEditStatus(e.target.value as FeedbackStatus)
                        }
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-gray-500">
                        Priority
                      </span>
                      <select
                        className="h-8 rounded-md border border-[rgba(255,255,255,0.16)] bg-[#050607] px-2 text-xs text-gray-200"
                        value={editPriority}
                        onChange={(e) =>
                          setEditPriority(e.target.value as FeedbackPriority)
                        }
                      >
                        {priorityOptions.slice(1).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-500">
                      Assignee User ID (optional)
                    </span>
                    <input
                      className="h-8 w-full rounded-md border border-[rgba(255,255,255,0.16)] bg-[#050607] px-2 text-xs text-gray-200"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      placeholder="Paste internal user ObjectId"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="rounded-md border border-[rgba(255,255,255,0.18)] bg-[#050607] px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                      onClick={() => quickSetStatus("triaged")}
                      disabled={isSaving}
                    >
                      Mark triaged
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[rgba(255,255,255,0.18)] bg-[#050607] px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                      onClick={() => quickSetStatus("in_progress")}
                      disabled={isSaving}
                    >
                      Mark in progress
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[rgba(255,255,255,0.18)] bg-[#050607] px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                      onClick={() => quickSetStatus("resolved")}
                      disabled={isSaving}
                    >
                      Mark resolved
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[rgba(255,255,255,0.18)] bg-[#050607] px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                      onClick={() => quickSetStatus("closed")}
                      disabled={isSaving}
                    >
                      Close
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      className="rounded-md border border-[rgba(255,255,255,0.18)] bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
                      onClick={() => void saveEdits()}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Select a feedback item in the table to see details and update its status.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

