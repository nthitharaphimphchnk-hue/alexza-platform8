import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

interface RequestDetailData {
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

export default function RequestDetail() {
  const [, params] = useRoute("/app/requests/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";
  const [data, setData] = useState<RequestDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiRequest<{ ok: boolean; request: RequestDetailData }>(
        `/api/requests/${encodeURIComponent(id)}`
      );
      setData(res.request ?? null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setErrorMessage("Request not found");
        setData(null);
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load request";
      setErrorMessage(message);
      showErrorToast("Unable to load request", message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const formatDate = (raw: string) => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
  };

  useEffect(() => {
    if (!id) setLocation("/app/requests");
  }, [id, setLocation]);

  if (!id) return null;

  return (
    <AppShell
      title="Request Detail"
      subtitle={id}
      backHref="/app/requests"
      backLabel="Back to Requests"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Requests", href: "/app/requests" },
        { label: id.slice(0, 12) + "..." },
      ]}
    >
      <div className="space-y-6">
        {errorMessage ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            Loading...
          </div>
        ) : data ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-gray-500">ID</span>
                <p className="font-mono text-sm text-gray-300 break-all">{data.id}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Created</span>
                <p className="text-sm text-gray-300">{formatDate(data.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Project</span>
                <p className="text-sm text-gray-300">{data.projectName || data.projectId}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Action</span>
                <p className="font-mono text-sm text-gray-300">{data.actionName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Status</span>
                <p>
                  <StatusBadge status={data.status} />
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Tokens used</span>
                <p className="text-sm text-gray-300">
                  {data.tokensUsed != null ? data.tokensUsed.toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Latency</span>
                <p className="text-sm text-gray-300">
                  {data.latencyMs != null ? `${data.latencyMs} ms` : "—"}
                </p>
              </div>
            </div>
            {data.error ? (
              <div>
                <span className="text-xs text-gray-500">Error</span>
                <pre className="mt-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 text-sm text-red-400 overflow-x-auto whitespace-pre-wrap">
                  {data.error}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
