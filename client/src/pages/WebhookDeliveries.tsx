import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { RefreshCw } from "lucide-react";
import { useRoute } from "wouter";
import { useCallback, useEffect, useState } from "react";

const WEBHOOK_EVENTS = [
  "auth.user.created",
  "wallet.topup.succeeded",
  "wallet.low_balance",
  "action.run.succeeded",
  "action.run.failed",
] as const;

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  statusCode?: number;
  latencyMs?: number;
  attemptCount: number;
  error?: string;
  createdAt: string;
}

interface WebhookDeliveryDetail extends WebhookDelivery {
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  response?: { statusCode?: number; body?: string } | null;
}

interface WebhookEndpoint {
  id: string;
  url: string;
}

export default function WebhookDeliveries() {
  const [, params] = useRoute("/app/webhooks/:id/deliveries");
  const id = params?.id ?? "";
  const [endpoint, setEndpoint] = useState<WebhookEndpoint | null>(null);
  const [items, setItems] = useState<WebhookDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterEvent, setFilterEvent] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryDetail | null>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const loadDeliveries = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("pageSize", String(pageSize));
      if (filterStatus) q.set("status", filterStatus);
      if (filterEvent) q.set("event", filterEvent);
      if (filterDateFrom) q.set("dateFrom", filterDateFrom);
      if (filterDateTo) q.set("dateTo", filterDateTo);
      const res = await apiRequest<{
        ok: true;
        items: WebhookDelivery[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/api/webhooks/${id}/deliveries?${q}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Failed to load deliveries", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [id, page, pageSize, filterStatus, filterEvent, filterDateFrom, filterDateTo]);

  const loadEndpoint = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiRequest<{ ok: true; endpoints: WebhookEndpoint[] }>("/api/webhooks");
      const ep = res.endpoints?.find((e) => e.id === id);
      setEndpoint(ep || null);
    } catch {
      setEndpoint(null);
    }
  }, [id]);

  useEffect(() => {
    void loadEndpoint();
  }, [loadEndpoint]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  const loadDeliveryDetail = async (deliveryId: string) => {
    try {
      const res = await apiRequest<{ ok: true; delivery: WebhookDeliveryDetail }>(
        `/api/webhooks/${id}/deliveries/${deliveryId}`
      );
      setSelectedDelivery(res.delivery);
    } catch (error) {
      showErrorToast("Failed to load delivery", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleRetry = async (deliveryId: string) => {
    setIsRetrying(deliveryId);
    try {
      await apiRequest<{ ok: true }>(`/api/webhooks/${id}/deliveries/${deliveryId}/retry`, {
        method: "POST",
      });
      showSuccessToast("Retry sent");
      await loadDeliveries();
      if (selectedDelivery?.id === deliveryId) {
        await loadDeliveryDetail(deliveryId);
      }
    } catch (error) {
      showErrorToast("Retry failed", error instanceof ApiError ? error.message : "Unknown error");
    } finally {
      setIsRetrying(null);
    }
  };

  const applyFilters = () => {
    setPage(1);
    void loadDeliveries();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppShell
      title="Webhook Deliveries"
      subtitle={endpoint ? endpoint.url : "Loading..."}
      backHref="/app/settings/webhooks"
      backLabel="Back to Webhooks"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Settings", href: "/app/settings" },
        { label: "Webhooks", href: "/app/settings/webhooks" },
        { label: "Deliveries" },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Event</label>
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="mt-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                {WEBHOOK_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">From date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="mt-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">To date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="mt-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="border-[rgba(255,255,255,0.08)]"
                onClick={applyFilters}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[#050607]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Latency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      No deliveries yet.
                    </td>
                  </tr>
                ) : (
                  items.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-white/5 cursor-pointer"
                      onClick={() => void loadDeliveryDetail(d.id)}
                    >
                      <td className="px-4 py-3 text-sm text-white">{d.event}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            d.status === "success"
                              ? "bg-green-500/20 text-green-400"
                              : d.status === "failed"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{d.statusCode ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {d.latencyMs != null ? `${d.latencyMs} ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{d.attemptCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {d.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[rgba(255,255,255,0.08)]"
                            disabled={isRetrying === d.id}
                            onClick={() => void handleRetry(d.id)}
                          >
                            {isRetrying === d.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <>
                                <RefreshCw size={14} className="mr-1" />
                                Retry
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto bg-[#0b0e12] border-l border-[rgba(255,255,255,0.08)]">
          <SheetHeader>
            <SheetTitle className="text-white">Delivery details</SheetTitle>
            <SheetDescription className="text-gray-400">
              {selectedDelivery?.event} — {selectedDelivery?.status}
            </SheetDescription>
          </SheetHeader>
          {selectedDelivery && (
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Payload</h4>
                <pre className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 text-xs text-[#c0c0c0] overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(selectedDelivery.payload ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Headers</h4>
                <pre className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 text-xs text-[#c0c0c0] overflow-x-auto">
                  {JSON.stringify(selectedDelivery.headers ?? {}, null, 2)}
                </pre>
              </div>
              {selectedDelivery.response && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Response</h4>
                  <pre className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 text-xs text-[#c0c0c0] overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(selectedDelivery.response, null, 2)}
                  </pre>
                </div>
              )}
              {selectedDelivery.error && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Error</h4>
                  <pre className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400 overflow-x-auto">
                    {selectedDelivery.error}
                  </pre>
                </div>
              )}
              {selectedDelivery.status === "failed" && (
                <Button
                  className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                  disabled={isRetrying === selectedDelivery.id}
                  onClick={() => void handleRetry(selectedDelivery.id)}
                >
                  {isRetrying === selectedDelivery.id ? (
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                  ) : (
                    <RefreshCw size={16} className="mr-2" />
                  )}
                  Retry
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
