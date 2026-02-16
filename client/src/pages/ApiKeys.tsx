import { Button } from "@/components/ui/button";
import { Plus, Copy, Eye, EyeOff, Trash2, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";
import { useForm } from "@/hooks/useForm";
import { validateApiKeyForm, getFieldError, hasFieldError } from "@/lib/validation";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showCopyToClipboardToast, showApiKeyCreatedToast, showApiKeyDeletedToast } from "@/lib/toast";

/**
 * ALEXZA AI API Keys Page
 * Design: Monochrome metallic theme
 * - Manage API keys with show/hide functionality
 * - Create new API key with validation
 * - Delete API key confirmation
 */

interface ApiKeyFormData {
  name: string;
}

export default function ApiKeys() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    showCopyToClipboardToast();
    setTimeout(() => setCopied(null), 2000);
  };

  const mockKeys = [
    {
      id: "key_1",
      name: "Production Key",
      key: "axza_live_demo_51234567890abcdefghijklmnop",
      created: "2 weeks ago",
      lastUsed: "2 hours ago",
      status: "Active",
    },
    {
      id: "key_2",
      name: "Development Key",
      key: "axza_test_demo_87654321abcdefghijklmnopqrs",
      created: "1 month ago",
      lastUsed: "5 minutes ago",
      status: "Active",
    },
    {
      id: "key_3",
      name: "Testing Key",
      key: "axza_test_demo_abcdefghijklmnopqrstuvwxyz",
      created: "2 months ago",
      lastUsed: "Never",
      status: "Inactive",
    },
  ];

  const selectedKey = mockKeys.find((k) => k.id === selectedKeyId);

  const form = useForm<ApiKeyFormData>({
    initialValues: {
      name: "",
    },
    validate: validateApiKeyForm,
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      showApiKeyCreatedToast(values.name);
      setShowCreateModal(false);
      form.reset();
    },
  });

  const handleDeleteKey = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (selectedKey) {
      showApiKeyDeletedToast(selectedKey.name);
    }
    setShowDeleteConfirm(false);
    setSelectedKeyId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
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
            <p className="text-gray-400 mt-2">Manage your API keys and authentication</p>
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

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-6"
          variants={staggerContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Info Box */}
          <motion.div
            className="p-4 rounded-lg bg-[#0b0e12]/50 border border-[rgba(255,255,255,0.06)]"
            variants={staggerItemVariants}
          >
            <p className="text-sm text-gray-300">
              Keep your API keys secure. Never share them publicly or commit them to version control. Rotate keys regularly for security.
            </p>
          </motion.div>

          {/* Keys List */}
          {mockKeys.map((keyItem) => (
            <motion.div
              key={keyItem.id}
              className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition"
              variants={staggerItemVariants}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{keyItem.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Created {keyItem.created}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    keyItem.status === "Active"
                      ? "bg-[#c0c0c0]/20 text-[#c0c0c0]"
                      : "bg-[#a8a8a8]/20 text-[#a8a8a8]"
                  }`}
                >
                  {keyItem.status}
                </span>
              </div>

              <div className="space-y-4">
                {/* Key Display */}
                <div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <code className="text-sm text-gray-300 font-mono">
                    {showKeys[keyItem.id]
                      ? keyItem.key
                      : keyItem.key.substring(0, 10) + "..." + keyItem.key.substring(keyItem.key.length - 10)}
                  </code>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowKeys({ ...showKeys, [keyItem.id]: !showKeys[keyItem.id] })}
                      className="p-2 rounded hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      {showKeys[keyItem.id] ? (
                        <EyeOff size={16} className="text-gray-500" />
                      ) : (
                        <Eye size={16} className="text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(keyItem.key, keyItem.id)}
                      className="p-2 rounded hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      {copied === keyItem.id ? (
                        <Check size={16} className="text-[#c0c0c0]" />
                      ) : (
                        <Copy size={16} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Last Used</p>
                    <p className="text-white mt-1">{keyItem.lastUsed}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      Rotate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedKeyId(keyItem.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Create API Key Modal */}
      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create API Key"
        description="Generate a new API key for your application"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={form.isSubmitting}
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={form.isSubmitting}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => form.handleSubmit(e as any)}
            >
              {form.isSubmitting ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Key Name</label>
            <input
              type="text"
              name="name"
              value={form.values.name}
              onChange={form.handleChange}
              placeholder="e.g., Production API Key"
              disabled={form.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg bg-[#050607] border transition text-white placeholder-gray-600 focus:outline-none ${
                hasFieldError(form.errors, "name")
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
              } disabled:opacity-50`}
            />
            {hasFieldError(form.errors, "name") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "name")}</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-[#c0c0c0]/5 border border-[#c0c0c0]/20">
            <p className="text-xs text-gray-300">
              Your API key will be displayed only once. Make sure to copy and save it in a secure location.
            </p>
          </div>
        </form>
      </Modal>

      {/* Delete API Key Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete API Key"
        description={`Are you sure you want to delete "${selectedKey?.name}"? Any applications using this key will stop working.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDeleteKey}
      />
    </div>
  );
}
