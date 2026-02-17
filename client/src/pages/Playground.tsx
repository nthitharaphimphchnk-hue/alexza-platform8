import { Button } from "@/components/ui/button";
import { API_BASE_URL, ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { ArrowLeft, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

interface ProjectApiKeyItem {
  id: string;
  prefix: string;
  name: string;
  revokedAt: string | null;
}

export default function Playground() {
  const [location, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [output, setOutput] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [keys, setKeys] = useState<ProjectApiKeyItem[]>([]);

  const projectId = useMemo(() => {
    const match = location.match(/^\/app\/projects\/([^/]+)\/playground$/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [location]);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const response = await apiRequest<{ ok: true; keys: Array<Record<string, unknown>> }>(
          `/api/projects/${projectId}/keys`
        );
        setKeys(
          (response.keys || []).map((item) => ({
            id: String(item.id ?? ""),
            prefix: String(item.prefix ?? ""),
            name: typeof item.name === "string" ? item.name : "",
            revokedAt: item.revokedAt ? String(item.revokedAt) : null,
          }))
        );
      } catch {
        // Non-blocking: user can still manually paste raw API key.
      }
    })();
  }, [projectId]);

  const handleRun = async () => {
    const trimmedInput = input.trim();
    const trimmedApiKey = apiKey.trim();
    if (!trimmedInput) {
      showErrorToast("Validation error", "Please enter input.");
      return;
    }
    if (!trimmedApiKey) {
      showErrorToast("Validation error", "Please paste your raw API key.");
      return;
    }

    setIsRunning(true);
    try {
      const startedAt = performance.now();
      const response = await fetch(`${API_BASE_URL}/v1/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": trimmedApiKey,
        },
        body: JSON.stringify({ input: trimmedInput }),
      });
      const payload = await response.json();
      const elapsed = Math.round(performance.now() - startedAt);
      setLatencyMs(elapsed);

      if (!response.ok) {
        const message =
          payload?.message || payload?.error || `Run failed with status ${response.status}`;
        throw new ApiError(message, response.status, payload?.error);
      }

      setOutput(typeof payload.output === "string" ? payload.output : "");
      showSuccessToast("Run complete", `Latency ${elapsed} ms`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        showErrorToast("Unauthorized", "Invalid or revoked API key.");
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to run";
      showErrorToast("Run failed", message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Playground</h1>
            <p className="text-gray-400 mt-2">Run test requests against /v1/run using your API key</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (projectId) {
                setLocation(`/app/projects/${projectId}`);
              } else {
                setLocation("/app/projects");
              }
            }}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.08)]"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {projectId && keys.length > 0 && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-4">
              <p className="text-sm text-gray-300 mb-2">Project keys (prefix only):</p>
              <div className="flex flex-wrap gap-2">
                {keys.map((key) => (
                  <span
                    key={key.id}
                    className="px-2 py-1 text-xs rounded-full bg-[rgba(255,255,255,0.08)] text-gray-200"
                  >
                    {key.name || "Unnamed"} - {key.prefix}
                    {key.revokedAt ? " (revoked)" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Raw API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="axza_..."
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Input</label>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                placeholder="Type input to run..."
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              />
            </div>

            <Button
              type="button"
              disabled={isRunning || input.trim().length < 1 || apiKey.trim().length < 1}
              onClick={handleRun}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black disabled:opacity-50"
            >
              <Play size={16} className="mr-2" />
              {isRunning ? "Running..." : "Run"}
            </Button>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Output</h3>
              <span className="text-xs text-gray-400">
                Latency: {latencyMs !== null ? `${latencyMs} ms` : "-"}
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-200 bg-[#050607] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 min-h-[90px]">
              {output || "-"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
