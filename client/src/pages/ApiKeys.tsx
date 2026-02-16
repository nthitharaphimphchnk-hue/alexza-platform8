import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2, Check, AlertCircle, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  showApiKeyCreatedToast,
  showApiKeyDeletedToast,
  showCopyToClipboardToast,
  showErrorToast,
} from "@/lib/toast";
import { ApiError, apiRequest } from "@/lib/api";

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

export default function ApiKeys({
  projectId: projectIdProp,
  embedded = false,
}: ApiKeysProps & Record<string, unknown>) {
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
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateKey = async () => {
    if (!projectId) {
      showErrorToast("Missing project", "Open this page from a project context.");
      return;
    }

    setIsCreating(true);
    try {
      const payload = newKeyName.trim()
        ? { name: newKeyName.trim() }
        : {};

      const response = await apiRequest<{
        ok: true;
        key: { id: string; prefix: string; name?: string; createdAt: string };
        rawKey: string;
      }>(`/api/projects/${projectId}/keys`, {
        method: "POST",
        body: payload,
      });

      setCreatedRawKey(response.rawKey);
      setCreatedPrefix(response.key.prefix);
      showApiKeyCreatedToast(response.key.name || response.key.prefix);
      setShowCreateModal(false);
      setNewKeyName("");

      setKeys((prev) => [
        {
          id: response.key.id,
          name: response.key.name || "",
          prefix: response.key.prefix,
          createdAt: response.key.createdAt,
          revokedAt: null,
        },
        ...prev.filter((item) => item.id !== response.key.id),
      ]);

      await loadKeys();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to create key";
      showErrorToast("Key creation failed", message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!projectId || !selectedKeyId) {
      return;
    }

    try {
      await apiRequest<{ ok: true }>(`/api/projects/${projectId}/keys/${selectedKeyId}/revoke`, {
        method: "POST",
      });

      if (selectedKey) {
        showApiKeyDeletedToast(selectedKey.name || selectedKey.prefix);
      }

      setKeys((prev) =>
        prev.map((item) =>
          item.id === selectedKeyId
            ? {
                ...item,
                revokedAt: new Date().toISOString(),
              }
            : item
        )
      );
      setSelectedKeyId(null);
      await loadKeys();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = "/login";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to revoke key";
      showErrorToast("Revoke failed", message);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  return (
    <div
      className={
        embedded
          ? "text-foreground"
          : "min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground"
      }
    >
      {!embedded && (
        <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
          <motion.div
            className="max-w-7xl mx-auto flex justify-between items-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-bold text-white">API Keys</h1>
              <p className="text-gray-400 mt-2">Manage keys for this project</p>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2"
              >
                <Plus size={18} /> Create Key
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}

      <div className={embedded ? "pt-4" : "p-8"}>
        <motion.div
          className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {embedded && (
            <motion.div variants={staggerItemVariants} className="flex justify-end">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2"
              >
                <Plus size={16} /> Create Key
              </Button>
            </motion.div>
          )}
          <motion.div
            className="p-4 rounded-lg bg-[#0b0e12]/50 border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <p className="text-sm text-gray-300">
              Raw keys are shown only once at creation time. Store them securely.
            </p>
          </motion.div>

          {!projectId && (
            <motion.div className="text-center py-10" variants={staggerItemVariants}>
              <p className="text-gray-400">Project context missing. Open API Keys from a project route.</p>
            </motion.div>
          )}

          {isLoading && (
            <motion.div className="text-center py-10" variants={staggerItemVariants}>
              <p className="text-gray-400">Loading keys...</p>
            </motion.div>
          )}

          {!isLoading &&
            projectId &&
            keys.map((keyItem) => (
              <motion.div
                key={keyItem.id}
                className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition"
                variants={staggerItemVariants}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#c0c0c0]/10">
                      <KeyRound size={18} className="text-[#c0c0c0]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{keyItem.name || "Unnamed Key"}</h3>
                      <p className="text-xs text-gray-500 mt-1">Created {formatDate(keyItem.createdAt)}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      keyItem.revokedAt
                        ? "bg-[#a8a8a8]/20 text-[#a8a8a8]"
                        : "bg-[#c0c0c0]/20 text-[#c0c0c0]"
                    }`}
                  >
                    {keyItem.revokedAt ? "Revoked" : "Active"}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <code className="text-sm text-gray-300 font-mono">{keyItem.prefix}************</code>
                    <button
                      onClick={() => copyToClipboard(keyItem.prefix, keyItem.id)}
                      className="p-2 rounded hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      {copied === keyItem.id ? (
                        <Check size={16} className="text-[#c0c0c0]" />
                      ) : (
                        <Copy size={16} className="text-gray-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(keyItem.revokedAt)}
                      onClick={() => {
                        setSelectedKeyId(keyItem.id);
                        setShowRevokeConfirm(true);
                      }}
                      className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}

          {!isLoading && projectId && keys.length === 0 && (
            <motion.div className="text-center py-10" variants={staggerItemVariants}>
              <p className="text-gray-400">No API keys yet.</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
              >
                <Plus size={16} className="mr-2" />
                Create your first key
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create API Key"
        description="Generate a new key for this project"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreating}
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isCreating}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateKey}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Key Name (Optional)</label>
            <input
              type="text"
              name="name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production API Key"
              disabled={isCreating}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] transition text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.12)] disabled:opacity-50"
            />
          </div>
          <div className="p-4 rounded-lg bg-[#c0c0c0]/5 border border-[#c0c0c0]/20">
            <p className="text-xs text-gray-300">
              The raw API key will be displayed only once after creation.
            </p>
          </div>
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
          <Button
            type="button"
            onClick={() => {
              setCreatedRawKey(null);
              setCreatedPrefix(null);
            }}
            className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black"
          >
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-gray-500 mb-2">Prefix: {createdPrefix || "-"}</p>
            <code className="text-sm text-gray-200 break-all">{createdRawKey}</code>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => createdRawKey && copyToClipboard(createdRawKey, "raw_key")}
            className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
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
        isDangerous={true}
        onConfirm={handleRevokeKey}
      />
    </div>
  );
}
