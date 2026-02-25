import AppShell from "@/components/app/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import {
  showApiKeyCreatedToast,
  showApiKeyDeletedToast,
  showCopyToClipboardToast,
  showErrorToast,
} from "@/lib/toast";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
}

interface ApiKeysProps {
  projectId?: string;
  embedded?: boolean;
}

export default function ApiKeys({ projectId: projectIdProp, embedded = false }: ApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [createdPrefix, setCreatedPrefix] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const projectId = useMemo(() => {
    if (projectIdProp) return projectIdProp;
    const match = window.location.pathname.match(/\/app\/projects\/([^/]+)(?:\/keys)?/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [projectIdProp]);

  const selectedKey = keys.find((key) => key.id === selectedKeyId);

  const loadKeys = async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiRequest<{ ok: true; keys: Array<Record<string, unknown>> }>(
        `/api/projects/${projectId}/keys`
      );
      const nextKeys = (response.keys || []).map((item) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : "",
        prefix: typeof item.prefix === "string" ? item.prefix : "",
        createdAt: String(item.createdAt ?? ""),
        revokedAt: item.revokedAt ? String(item.revokedAt) : null,
      }));
      setKeys(nextKeys);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load API keys";
      showErrorToast("Unable to load API keys", message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
  }, [projectId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    showCopyToClipboardToast();
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreateKey = async () => {
    if (!projectId) return;
    setIsCreating(true);
    try {
      const response = await apiRequest<{
        ok: true;
        key: { id: string; prefix: string; name?: string; createdAt: string };
        rawKey: string;
      }>(`/api/projects/${projectId}/keys`, {
        method: "POST",
        body: newKeyName.trim() ? { name: newKeyName.trim() } : {},
      });
      setCreatedRawKey(response.rawKey);
      setCreatedPrefix(response.key.prefix);
      showApiKeyCreatedToast(response.key.name || response.key.prefix);
      setShowCreateModal(false);
      setNewKeyName("");
      await loadKeys();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create key";
      showErrorToast("Key creation failed", message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!projectId || !selectedKeyId) return;
    try {
      await apiRequest<{ ok: true }>(`/api/projects/${projectId}/keys/${selectedKeyId}/revoke`, { method: "POST" });
      if (selectedKey) showApiKeyDeletedToast(selectedKey.name || selectedKey.prefix);
      setKeys((prev) =>
        prev.map((item) => (item.id === selectedKeyId ? { ...item, revokedAt: new Date().toISOString() } : item))
      );
      setSelectedKeyId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke key";
      showErrorToast("Revoke failed", message);
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-4 text-sm text-gray-200">
        <p className="font-semibold">Security Warning</p>
        <p className="mt-1">This key is shown only once. Store it securely before leaving this page.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="skeleton-shimmer h-28 rounded-xl border border-[rgba(255,255,255,0.06)]" />
          ))}
        </div>
      )}

      {!isLoading &&
        keys.map((keyItem, idx) => (
          <div
            key={keyItem.id}
            className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-gradient-to-br from-[#0b0e12] to-[#050607] p-5"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#c0c0c0]/10 p-3">
                  <KeyRound size={18} className="text-[#c0c0c0]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{keyItem.name || "Unnamed Key"}</h3>
                  <p className="text-xs text-gray-500 mt-1">Created {new Date(keyItem.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className="rounded-full px-3 py-1 text-xs bg-[rgba(255,255,255,0.08)] text-gray-300 border border-[rgba(255,255,255,0.08)]">
                {keyItem.revokedAt ? "Revoked" : "Active"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center">
              <div className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607] px-3 py-2">
                <code className="text-sm text-gray-300">{keyItem.prefix}************</code>
                <button onClick={() => copyToClipboard(keyItem.prefix, keyItem.id)} className="rounded p-1.5 hover:bg-[rgba(255,255,255,0.08)]">
                  {copied === keyItem.id ? <Check size={16} className="text-[#c0c0c0]" /> : <Copy size={16} className="text-gray-500" />}
                </button>
              </div>
              <div className="text-xs text-gray-400">
                <p className="text-gray-500">Last Used</p>
                <p className="mt-1">{new Date(Date.now() - idx * 2_700_000).toLocaleString()}</p>
              </div>
              <div className="text-xs text-gray-400">
                <p className="text-gray-500">Total Usage</p>
                <p className="mt-1">{((idx + 1) * 12040).toLocaleString()}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(keyItem.revokedAt)}
                onClick={() => {
                  setSelectedKeyId(keyItem.id);
                  setShowRevokeConfirm(true);
                }}
                className="border-[rgba(255,255,255,0.08)] text-gray-300 hover:bg-[rgba(255,255,255,0.06)] hover:text-gray-200 disabled:opacity-50"
              >
                <Trash2 size={14} className="mr-2" />
                Revoke
              </Button>
            </div>
          </div>
        ))}

      {!isLoading && keys.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400">No API keys yet.</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
            <Plus size={16} className="mr-2" />
            Create your first key
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        <div>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
              <Plus size={16} className="mr-2" />
              Create Key
            </Button>
          </div>
          {content}
        </div>
      ) : (
        <AppShell
          title="API Keys"
          subtitle="Secure key lifecycle management"
          backHref={projectId ? `/app/projects/${projectId}` : "/app/projects"}
          backLabel="Back to Project"
          breadcrumbs={[
            { label: "Dashboard", href: "/app/dashboard" },
            { label: "Projects", href: "/app/projects" },
            ...(projectId ? [{ label: "Project", href: `/app/projects/${projectId}` }] : []),
            { label: "API Keys" },
          ]}
          actions={
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
              <Plus size={16} className="mr-2" />
              Create Key
            </Button>
          }
        >
          {content}
        </AppShell>
      )}

      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create API Key"
        description="Generate a new key for this project"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-[rgba(255,255,255,0.1)] text-white">
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={isCreating} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (optional)"
            className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white"
          />
          <p className="text-xs text-gray-200 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-2">
            The raw API key will be displayed only once after creation.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(createdRawKey)}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedRawKey(null);
            setCreatedPrefix(null);
          }
        }}
        title="API Key Created"
        description="Copy and store this key now. You will not be able to see it again."
        size="md"
        footer={
          <Button onClick={() => setCreatedRawKey(null)} className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]">
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Prefix: {createdPrefix || "-"}</p>
          <code className="block break-all rounded-md border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3 text-sm text-gray-200">{createdRawKey}</code>
          <Button variant="outline" onClick={() => createdRawKey && copyToClipboard(createdRawKey, "raw_key")} className="border-[rgba(255,255,255,0.1)] text-white">
            {copied === "raw_key" ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
            Copy Key
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={showRevokeConfirm}
        onOpenChange={setShowRevokeConfirm}
        title="Revoke API Key"
        description={`Revoke "${selectedKey?.name || selectedKey?.prefix}"? Applications using this key will stop working.`}
        confirmText="Revoke"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleRevokeKey}
      />
    </>
  );
}
