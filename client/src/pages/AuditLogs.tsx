import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiRequest } from "@/lib/api";
import { getProjects } from "@/lib/alexzaApi";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { showErrorToast } from "@/lib/toast";
import { ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 50;
const ACTION_TYPE_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "auth.user.created", label: "User created" },
  { value: "api_key.created", label: "API key created" },
  { value: "api_key.revoked", label: "API key revoked" },
  { value: "project.created", label: "Project created" },
  { value: "project.updated", label: "Project updated" },
  { value: "project.deleted", label: "Project deleted" },
  { value: "action.created", label: "Action created" },
  { value: "action.updated", label: "Action updated" },
  { value: "action.deleted", label: "Action deleted" },
  { value: "webhook.created", label: "Webhook created" },
  { value: "webhook.updated", label: "Webhook updated" },
  { value: "webhook.deleted", label: "Webhook deleted" },
  { value: "wallet.topup.succeeded", label: "Wallet topup" },
  { value: "team.member.invited", label: "Member invited" },
  { value: "team.member.role_changed", label: "Role changed" },
  { value: "team.member.removed", label: "Member removed" },
];
const RESOURCE_OPTIONS = [
  { value: "", label: "All resources" },
  { value: "project", label: "Project" },
  { value: "action", label: "Action" },
  { value: "api_key", label: "API Key" },
  { value: "webhook", label: "Webhook" },
  { value: "wallet", label: "Wallet" },
  { value: "team", label: "Team" },
  { value: "user", label: "User" },
];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

interface AuditItem {
  id: string;
  actorEmail: string;
  actorUserId: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  status: string;
  createdAt: string;
}

interface AuditResponse {
  ok: boolean;
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface ProjectsResponse {
  ok: boolean;
  projects?: Array<{ id: string; name: string }>;
}

function formatActionType(actionType: string): string {
  return actionType.replace(/\./g, " ").replace(/_/g, " ");
}

export default function AuditLogs() {
  const { workspaces } = useWorkspace();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pageSize: PAGE_SIZE });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    workspaceId: "",
    projectId: "",
    actionType: "",
    resourceType: "",
    status: "",
    dateFrom: "",
    dateTo: "",
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

  const loadLogs = useCallback(
    async (pageOverride?: number) => {
      const page = pageOverride ?? pagination.page;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
        if (filters.projectId) params.set("projectId", filters.projectId);
        if (filters.actionType) params.set("actionType", filters.actionType);
        if (filters.resourceType) params.set("resourceType", filters.resourceType);
        if (filters.status) params.set("status", filters.status);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);

        const data = await apiRequest<AuditResponse>(`/api/audit-logs?${params.toString()}`);
        setItems(data.items ?? []);
        setPagination((prev) => ({
          ...prev,
          page: data.page ?? prev.page,
          total: data.total ?? 0,
          pageSize: data.pageSize ?? PAGE_SIZE,
        }));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          window.location.href = "/login";
          return;
        }
        showErrorToast("Failed to load audit logs", error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, filters]
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    void loadLogs(1);
  };

  const exportCsv = () => {
    const headers = ["Time", "Actor", "Action", "Resource", "Status"];
    const rows = items.map((i) => [
      new Date(i.createdAt).toISOString(),
      i.actorEmail,
      formatActionType(i.actionType),
      `${i.resourceType}:${i.resourceId}`,
      i.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (raw: string) => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize) || 1;

  return (
    <AppShell
      title="Audit Logs"
      subtitle="Track important actions for security and compliance"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Audit Logs" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={items.length === 0}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
            <Download size={16} />
            <span className="ml-2">Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadLogs()}
            disabled={isLoading}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-8">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Workspace</label>
              <select
                value={filters.workspaceId}
                onChange={(e) => setFilters((f) => ({ ...f, workspaceId: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              >
                <option value="">All workspaces</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
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
              <select
                value={filters.actionType}
                onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              >
                {ACTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Resource</label>
              <select
                value={filters.resourceType}
                onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              >
                {RESOURCE_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
              <label className="mb-1 block text-xs text-gray-500">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 text-sm text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={applyFilters}
                className="w-full border-[rgba(255,255,255,0.12)] bg-[#0b0e12] text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p>No audit logs found</p>
              <p className="mt-1 text-sm">Actions will appear here as they occur.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-[rgba(255,255,255,0.08)] hover:bg-transparent">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Actor</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Resource</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="w-12 text-gray-400" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell className="text-white text-sm">{formatDate(item.createdAt)}</TableCell>
                      <TableCell className="text-white text-sm">{item.actorEmail}</TableCell>
                      <TableCell className="text-white text-sm capitalize">
                        {formatActionType(item.actionType)}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {item.resourceType}:{item.resourceId.length > 12 ? `${item.resourceId.slice(0, 12)}...` : item.resourceId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "success" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] px-4 py-3">
                  <p className="text-sm text-gray-400">
                    Page {pagination.page} of {totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1 || isLoading}
                      onClick={() => {
                        setPagination((p) => ({ ...p, page: p.page - 1 }));
                        void loadLogs(pagination.page - 1);
                      }}
                      className="border-[rgba(255,255,255,0.12)] text-white"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= totalPages || isLoading}
                      onClick={() => {
                        setPagination((p) => ({ ...p, page: p.page + 1 }));
                        void loadLogs(pagination.page + 1);
                      }}
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

      {/* Detail drawer */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="bg-[#0b0e12] border-[rgba(255,255,255,0.08)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Audit Log Detail</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-gray-500">Time:</span>
                <p className="text-white mt-0.5">{formatDate(selectedItem.createdAt)}</p>
              </div>
              <div>
                <span className="text-gray-500">Actor:</span>
                <p className="text-white mt-0.5">{selectedItem.actorEmail}</p>
              </div>
              <div>
                <span className="text-gray-500">Action:</span>
                <p className="text-white mt-0.5 capitalize">{formatActionType(selectedItem.actionType)}</p>
              </div>
              <div>
                <span className="text-gray-500">Resource:</span>
                <p className="text-white mt-0.5">
                  {selectedItem.resourceType} / {selectedItem.resourceId}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <p className="text-white mt-0.5 capitalize">{selectedItem.status}</p>
              </div>
              {Object.keys(selectedItem.metadata ?? {}).length > 0 && (
                <div>
                  <span className="text-gray-500">Metadata:</span>
                  <pre className="mt-1 p-3 rounded-lg bg-[#050607] text-gray-300 overflow-auto max-h-48 text-xs">
                    {JSON.stringify(selectedItem.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
