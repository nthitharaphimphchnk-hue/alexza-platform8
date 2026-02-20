'use client';

import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2 } from "lucide-react";
import { useState } from "react";

const MOCK_KEYS = [
  { id: "1", prefix: "axza_sk_", masked: "xxxxxxxx...", created: "Feb 15, 2026" },
  { id: "2", prefix: "axza_sk_", masked: "yyyyyyyy...", created: "Feb 10, 2026" },
];

export default function ApiKeysWidget() {
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    setCopiedId(id);
    navigator.clipboard.writeText("axza_sk_xxxxxxxx");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <section className="card-hover rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0b0e12]/70 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">API Keys</h2>
        <Button
          size="sm"
          className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-medium rounded-lg"
          onClick={() => {}}
        >
          <Plus size={16} className="mr-2" />
          Create New Secret Key
        </Button>
      </div>
      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#050607]/80 p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-gray-300 truncate">
                {key.prefix}
                <span className="text-gray-500">{key.masked}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Created {key.created}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleCopy(key.id)}
                className={`p-2 rounded-lg border transition ${
                  copiedId === key.id
                    ? "border-[#22c55e] text-[#22c55e]"
                    : "border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white"
                }`}
                title={copiedId === key.id ? "Copied!" : "Copy to clipboard"}
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handleRevoke(key.id)}
                className="p-2 rounded-lg border border-[rgba(255,255,255,0.08)] hover:bg-red-500/20 hover:border-red-500/50 text-gray-400 hover:text-red-400 transition"
                title="Revoke key"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Never share your secret keys. Keep them secure.
      </p>
    </section>
  );
}
