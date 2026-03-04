import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

const PAGE_SIZE = 50;
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "failed_insufficient_credits", label: "Insufficient Credits" },
];

interface ApiRequestItem {
  id: string;
  projectId: string;
  projectName: string;
  actionName: string;
  status: string;
  tokensUsed?: number;
  latencyMs?: number;
  error?: string;
  createdAt: string;
}

interface ProjectsResponse {
  ok: boolean;
  projects?: Array<{ id: string; name: string }>;
}

interface RequestsResponse {
  ok: boolean;
  requests: ApiRequestItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "success"
      ? "default"
      : status === "failed_insufficient_credits"
        ? "destructive"
        : "secondary";
  const label =
    status === "success"
      ? "Success"
      : status === "failed_insufficient_credits"
        ? "Insufficient Credits"
        : "Error";
  return (
    <Badge variant={variant} className="capitalize">
      {label}
    </Badge>
  );
}

export default function Requests() {
  const [, setLocation] = useLocation();
  const [requests, setRequests] = useState<ApiRequestItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    projectId: "",
    actionName: "",
    status: "",
    from: "",
    to: "",
  });

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiRequest<ProjectsResponse>("/api/projects");
      const list = data?.projects ?? [];
      setProjects((list as Array<{ id: string; name: string }>).map((p) => ({ id: p.id, name: p.name ?? p.id })));
    } catch {
      setProjects([]);
    }
  }, []);

  const loadRequests = useCallback(
    async (pageOverride?: number) => {
      const page = pageOverride ?? pagination.page;
      if (page < 1) return;
      const isRefreshingCall = !isLoading;
      if (isRefreshingCall) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (filters.projectId) params.set("projectId", filters.projectId);
        if (filters.actionName) params.set("actionName", filters.actionName);
        if (filters.status) params.set("status", filters.status);
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);

        const data = await apiRequest<RequestsResponse>(`/api/requests?${params.toString()}`);
        setRequests(data.requests ?? []);
        setPagination((prev) => ({
          ...prev,
          page: data.pagination?.page ?? prev.page,
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 0,
        }));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          window.location.href = "/login";
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load requests";
        setErrorMessage(message);
        showErrorToast("Unable to load requests", message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.page, filters.projectId, filters.actionName, filters.status, filters.from, filters.to, isLoading]
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    void loadRequests(1);
  };

  const formatDate = (raw: string) => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
  };

  return (
    <AppShell
      title="API Requests"
      subtitle="View and debug your API request history"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Requests" },
      ]}
      actions={
        <Button
          variant="outline"
          onClick={() => void loadRequests()}
          disabled={isLoading || isRefreshing}
          className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          <span className="ml-2">Refresh</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Project</label>
              <select
                value={filters.projectId}
                onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Action</label>
              <input
                type="text"
                value={filters.actionName}
                onChange={(e) => setFilters((f) => ({ ...f, actionName: e.target.value }))}
                placeholder="Filter by action"
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">From (date)</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">To (date)</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={applyFilters}
                className="w-full border-[rgba(255,255,255,0.12)] bg-[#0b0e12] text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                Apply filters
              </Button>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        ) : null}

        {/* Table */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              Loading...
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p>No requests found</p>
              <p className="mt-1 text-sm">Try adjusting filters or run an action to see logs.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-[rgba(255,255,255,0.08)]">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Project</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-right text-gray-400">Tokens</TableHead>
                    <TableHead className="text-right text-gray-400">Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow
                      key={r.id}
                      className="border-[rgba(255,255,255,0.06)] cursor-pointer hover:bg-[rgba(255,255,255,0.04)]"
                      onClick={() => setLocation(`/app/requests/${r.id}`)}
                    >
                      <TableCell className="text-gray-300">{formatDate(r.createdAt)}</TableCell>
                      <TableCell className="text-gray-300">
                        {r.projectName || r.projectId}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-300">{r.actionName}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right text-gray-400">
                        {r.tokensUsed != null ? r.tokensUsed.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-gray-400">
                        {r.latencyMs != null ? `${r.latencyMs} ms` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] px-4 py-3">
                  <span className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1 || isLoading}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                      }
                      className="border-[rgba(255,255,255,0.12)] text-white"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages || isLoading}
                      onClick={() =>
                        setPagination((p) => ({
                          ...p,
                          page: Math.min(p.totalPages, p.page + 1),
                        }))
                      }
                      className="border-[rgba(255,255,255,0.12)] text-white"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
