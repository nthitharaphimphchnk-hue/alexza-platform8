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
    <section className="group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6 transition-all duration-300 hover:border-[rgba(192,192,192,0.4)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">API Keys</h2>
          <Button
            size="sm"
            className="rounded-full bg-[#c0c0c0] px-4 hover:bg-[#a8a8a8] text-black font-semibold transition-all"
            onClick={() => {}}
          >
            <Plus size={14} className="mr-2" />
            Create New Secret Key
          </Button>
        </div>
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12]/70 p-3 transition-colors hover:border-[rgba(255,255,255,0.1)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-gray-300 truncate">
                  <span className="rounded bg-[rgba(255,255,255,0.08)] px-1.5 py-0.5">{key.prefix}</span>
                  <span className="text-gray-500">{key.masked}</span>
                </p>
                <span className="mt-1.5 inline-block rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-gray-500">
                  Created {key.created}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleCopy(key.id)}
                  className={`rounded-lg p-2 transition ${
                    copiedId === key.id
                      ? "bg-[rgba(192,192,192,0.2)] text-[#c0c0c0]"
                      : "bg-[rgba(255,255,255,0.06)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
                  }`}
                  title={copiedId === key.id ? "Copied!" : "Copy to clipboard"}
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="rounded-lg bg-[rgba(255,255,255,0.06)] p-2 text-gray-400 transition hover:bg-[rgba(255,255,255,0.1)] hover:text-gray-200"
                  title="Revoke key"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Never share your secret keys. Keep them secure.
        </p>
      </div>
    </section>
  );
}
