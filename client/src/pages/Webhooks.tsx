import AppShell from "@/components/app/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Check, Copy, Plus, Trash2, Webhook } from "lucide-react";
import { useEffect, useState } from "react";

const WEBHOOK_EVENTS = [
  "auth.user.created",
  "wallet.topup.succeeded",
  "wallet.low_balance",
  "action.run.succeeded",
  "action.run.failed",
] as const;

interface WebhookEndpoint {
  id: string;
  url: string;
  enabled: boolean;
  events: string[];
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  attemptCount: number;
  lastStatusCode?: number;
  lastError?: string;
  createdAt: string;
}

export default function Webhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deliveriesByEndpoint, setDeliveriesByEndpoint] = useState<Record<string, WebhookDelivery[]>>({});

  const loadEndpoints = async () => {
    try {
      const response = await apiRequest<{ ok: true; endpoints: WebhookEndpoint[] }>("/api/webhooks");
      setEndpoints(response.endpoints || []);
      for (const ep of response.endpoints || []) {
        try {
          const delRes = await apiRequest<{ ok: true; deliveries: WebhookDelivery[] }>(
            `/api/webhooks/${ep.id}/deliveries?limit=5`
          );
          setDeliveriesByEndpoint((prev) => ({ ...prev, [ep.id]: delRes.deliveries || [] }));
        } catch {
          // ignore
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      showErrorToast("Unable to load webhooks", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEndpoints();
  }, []);

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    showSuccessToast("Secret copied", "Save it securely — it won't be shown again.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    const url = newUrl.trim();
    if (!url || !/^https?:\/\//.test(url)) {
      showErrorToast("Invalid URL", "Enter a valid https:// or http:// URL");
      return;
    }
    if (selectedEvents.size === 0) {
      showErrorToast("Select events", "Choose at least one event type");
      return;
    }
    setIsCreating(true);
    try {
      const response = await apiRequest<{
        ok: true;
        endpoint: WebhookEndpoint & { secret?: string };
      }>("/api/webhooks", {
        method: "POST",
        body: { url, events: Array.from(selectedEvents) },
      });
      if (response.endpoint.secret) {
        setCreatedSecret(response.endpoint.secret);
      }
      showSuccessToast("Webhook created");
      setNewUrl("");
      setSelectedEvents(new Set());
      await loadEndpoints();
      setShowCreateModal(false);
    } catch (error) {
      showErrorToast("Creation failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEnabled = async (ep: WebhookEndpoint) => {
    try {
      await apiRequest(`/api/webhooks/${ep.id}`, {
        method: "PATCH",
        body: { enabled: !ep.enabled },
      });
      showSuccessToast(ep.enabled ? "Webhook disabled" : "Webhook enabled");
      await loadEndpoints();
    } catch (error) {
      showErrorToast("Update failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleDelete = async () => {
    if (!selectedEndpointId) return;
    try {
      await apiRequest(`/api/webhooks/${selectedEndpointId}`, { method: "DELETE" });
      showSuccessToast("Webhook deleted");
      setShowDeleteConfirm(false);
      setSelectedEndpointId(null);
      await loadEndpoints();
    } catch (error) {
      showErrorToast("Delete failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  return (
    <AppShell
      title="Webhooks"
      subtitle="Receive real-time events via HTTP callbacks"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Webhooks" },
      ]}
      actions={
        <Button
          className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
          onClick={() => {
            setCreatedSecret(null);
            setShowCreateModal(true);
          }}
        >
          <Plus size={16} className="mr-2" />
          Add Endpoint
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Webhook size={18} />
            Webhook Endpoints
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure URLs to receive events. Each endpoint gets a secret for signature verification.
          </p>

          {isLoading ? (
            <p className="mt-6 text-sm text-gray-400">Loading...</p>
          ) : endpoints.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] p-8 text-center">
              <p className="text-gray-400">No webhook endpoints yet.</p>
              <Button
                className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} className="mr-2" />
                Add Endpoint
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {endpoints.map((ep) => {
                const deliveries = deliveriesByEndpoint[ep.id] || [];
                const lastDelivery = deliveries[0];
                return (
                  <div
                    key={ep.id}
                    className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-white break-all">{ep.url}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Events: {ep.events.join(", ")} • {ep.enabled ? "Enabled" : "Disabled"}
                        </p>
                        {lastDelivery && (
                          <p className="mt-1 text-xs text-gray-500">
                            Last: {lastDelivery.event} → {lastDelivery.status}
                            {lastDelivery.lastStatusCode != null && ` (${lastDelivery.lastStatusCode})`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnabled(ep)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            ep.enabled
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {ep.enabled ? "Disable" : "Enable"}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[rgba(255,255,255,0.08)] text-red-400 hover:bg-red-500/10"
                          onClick={() => {
                            setSelectedEndpointId(ep.id);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) setCreatedSecret(null);
          setShowCreateModal(open);
        }}
        title={createdSecret ? "Secret — Copy Now" : "Create Webhook Endpoint"}
      >
        {createdSecret ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Your webhook secret is shown only once. Store it securely to verify signatures.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3">
              <code className="flex-1 truncate text-sm text-[#c0c0c0]">{createdSecret}</code>
              <Button
                size="sm"
                variant="outline"
                className="border-[rgba(255,255,255,0.15)]"
                onClick={() => copySecret(createdSecret)}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
            <Button
              className="w-full bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
              onClick={() => {
                setCreatedSecret(null);
                setShowCreateModal(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Endpoint URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-server.com/webhooks/alexza"
                className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Events</label>
              <div className="mt-2 space-y-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(event)}
                      onChange={() => toggleEvent(event)}
                      className="accent-[#c0c0c0]"
                    />
                    <span className="text-sm text-gray-300">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-[rgba(255,255,255,0.08)]"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
                disabled={isCreating}
                onClick={() => void handleCreate()}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Webhook"
        description="This will permanently remove the endpoint. Pending deliveries will not be sent."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={() => void handleDelete()}
      />
    </AppShell>
  );
}
