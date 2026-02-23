import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE_URL, ApiError, apiRequest } from "@/lib/api";
import { getProjects, listActions, runAction, estimateCost } from "@/lib/alexzaApi";
import { invalidateWallet, useWalletBalance } from "@/hooks/useWallet";
import { generateSamplePayload, validatePayloadLight } from "@/lib/payloadFromSchema";
import type { Project, PublicAction } from "@/lib/alexzaApi";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { ArrowLeft, Play, MessageSquare, Key, Calculator } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

interface ProjectApiKeyItem {
  id: string;
  prefix: string;
  name: string;
  revokedAt: string | null;
}

interface RunUiError {
  code: string;
  message: string;
  hint?: string;
  retryable?: boolean;
  nextResetAt?: string;
}

type RoutingMode = "cheap" | "balanced" | "quality";

function getRoutingBadgeClass(mode: RoutingMode): string {
  switch (mode) {
    case "cheap":
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    case "balanced":
      return "bg-amber-500/20 text-amber-200 border-amber-500/30";
    case "quality":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";
    default:
      return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";
  }
}

export default function Playground() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [payloadJson, setPayloadJson] = useState('{"input": "Hello"}');
  const [apiKey, setApiKey] = useState("");
  const [output, setOutput] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [creditsCharged, setCreditsCharged] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [keys, setKeys] = useState<ProjectApiKeyItem[]>([]);
  const [runError, setRunError] = useState<RunUiError | null>(null);
  const [useLegacy, setUseLegacy] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [actions, setActions] = useState<PublicAction[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedActionName, setSelectedActionName] = useState<string>("");
  const [validateError, setValidateError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{
    estimatedTokens: number;
    estimatedCredits: number;
    routingMode: RoutingMode;
  } | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const { balanceCredits: walletBalance } = useWalletBalance();

  const projectIdFromUrl = useMemo(() => {
    const match = location.match(/^\/app\/projects\/([^/]+)\/playground$/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [location]);

  const projectId = selectedProjectId || projectIdFromUrl;

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
    } catch {
      setProjects([]);
    }
  }, []);

  const loadActions = useCallback(async () => {
    if (!projectId) {
      setActions([]);
      setSelectedActionName("");
      return;
    }
    try {
      const list = await listActions(projectId);
      setActions(list);
      setSelectedActionName((prev) => {
        const stillExists = list.some((a) => a.actionName === prev);
        return stillExists ? prev : list[0]?.actionName ?? "";
      });
    } catch {
      setActions([]);
      setSelectedActionName("");
    }
  }, [projectId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projectIdFromUrl) setSelectedProjectId(projectIdFromUrl);
  }, [projectIdFromUrl]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  useEffect(() => {
    const action = actions.find((a) => a.actionName === selectedActionName);
    if (action) {
      setPayloadJson(generateSamplePayload(action.inputSchema));
    }
  }, [selectedActionName, actions]);

  useEffect(() => {
    setEstimate(null);
  }, [payloadJson, projectId, selectedActionName]);

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
        // Non-blocking
      }
    })();
  }, [projectId]);

  const handleEstimate = async () => {
    if (!projectId || !selectedActionName) return;
    const validation = validatePayloadLight(payloadJson);
    if (!validation.valid) {
      setValidateError(validation.error);
      showErrorToast(validation.error);
      return;
    }
    setValidateError(null);
    setIsEstimating(true);
    setEstimate(null);
    try {
      const result = await estimateCost({
        projectId,
        actionName: selectedActionName,
        input: validation.payload,
      });
      setEstimate(result);
      showSuccessToast(t("estimate.success"));
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Estimate failed");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleRun = async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      showErrorToast("Validation error", "Please paste your API key.");
      setRunError({ code: "VALIDATION_ERROR", message: "Please paste your API key." });
      return;
    }

    if (useLegacy) {
      const trimmedInput = input.trim();
      if (!trimmedInput) {
        showErrorToast("Validation error", "Please enter input.");
        setRunError({ code: "VALIDATION_ERROR", message: "Please enter input." });
        return;
      }
      setIsRunning(true);
      setRunError(null);
      setRequestId(null);
      setCreditsCharged(null);
      try {
        const startedAt = performance.now();
        const response = await fetch(`${API_BASE_URL}/v1/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": trimmedApiKey },
          body: JSON.stringify({ input: trimmedInput }),
        });
        const payload = await response.json();
        const elapsed = Math.round(performance.now() - startedAt);
        setLatencyMs(elapsed);
        if (!response.ok) {
          const errObj = payload?.error;
          const message =
            typeof errObj === "object" && typeof errObj?.message === "string"
              ? errObj.message
              : typeof payload?.message === "string"
                ? payload.message
                : `Run failed with status ${response.status}`;
          throw new ApiError(message, response.status);
        }
        setOutput(typeof payload.output === "string" ? payload.output : "");
        showSuccessToast("Run complete", `Latency ${elapsed} ms`);
        setRunError(null);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setRunError({ code: "UNAUTHORIZED", message: "Invalid or revoked API key." });
          showErrorToast("Unauthorized", "Invalid API key");
          return;
        }
        setRunError({ code: "RUN_ERROR", message: error instanceof Error ? error.message : "Run failed" });
        showErrorToast("Run failed", error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsRunning(false);
      }
      return;
    }

    if (!projectId || !selectedActionName) {
      showErrorToast("Validation error", "Select a project and action.");
      setRunError({ code: "VALIDATION_ERROR", message: "Select a project and action." });
      return;
    }

    const validation = validatePayloadLight(payloadJson);
    if (!validation.valid) {
      setValidateError(validation.error);
      showErrorToast(validation.error);
      setRunError({ code: "VALIDATION_ERROR", message: validation.error });
      return;
    }
    setValidateError(null);
    const payload = validation.payload;

    setIsRunning(true);
    setRunError(null);
    setRequestId(null);
    setCreditsCharged(null);
    try {
      const startedAt = performance.now();
      const res = await runAction(projectId, selectedActionName, payload, trimmedApiKey);
      const elapsed = Math.round(performance.now() - startedAt);
      setLatencyMs(elapsed);
      setOutput(res.output);
      setRequestId(res.requestId ?? null);
      setCreditsCharged(res.usage?.creditsCharged ?? null);
      invalidateWallet();
      showSuccessToast("Run complete", `Latency ${elapsed} ms`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setRunError({ code: "UNAUTHORIZED", message: "Invalid or revoked API key." });
        showErrorToast("Unauthorized", "Invalid API key");
        return;
      }
      if (error instanceof ApiError && error.status === 402) {
        setRunError({ code: "INSUFFICIENT_CREDITS", message: "Insufficient ALEXZA Credits.", hint: "Top up your wallet." });
        showErrorToast("Insufficient credits", "Top up your wallet");
        return;
      }
      setRunError({ code: "RUN_ERROR", message: error instanceof Error ? error.message : "Run failed" });
      showErrorToast("Run failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  const insufficientCredits =
    !useLegacy &&
    estimate &&
    walletBalance < estimate.estimatedCredits;

  const canRun = useLegacy
    ? input.trim().length >= 1 && apiKey.trim().length >= 1
    : projectId &&
      selectedActionName &&
      apiKey.trim().length >= 1 &&
      !insufficientCredits;

  return (
    <div className="min-h-screen text-foreground">
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Playground</h1>
            <p className="text-gray-400 mt-2">
              Run actions via ALEXZA Managed Runtime
            </p>
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
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useLegacy}
                onChange={(e) => setUseLegacy(e.target.checked)}
                className="rounded border-[rgba(255,255,255,0.2)]"
              />
              <span className="text-sm text-gray-400">Legacy Endpoint (Deprecated)</span>
            </label>
          </div>

          {!useLegacy && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-4 flex flex-wrap gap-4">
              {projectId && (
                <div className="w-full flex items-center gap-2 mb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <span className="text-xs text-gray-500">{t("routing.mode.label")}:</span>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getRoutingBadgeClass(
                            (() => {
                              const p = projects.find((x) => x.id === projectId);
                              const mode = (p?.routingMode ?? "quality") as RoutingMode;
                              return ["cheap", "balanced", "quality"].includes(mode) ? mode : "quality";
                            })()
                          )}`}
                        >
                          {(() => {
                            const p = projects.find((x) => x.id === projectId);
                            const mode = (p?.routingMode ?? "quality") as RoutingMode;
                            const m = ["cheap", "balanced", "quality"].includes(mode) ? mode : "quality";
                            return t(`routing.mode.${m}`);
                          })()}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px]">
                      <p className="font-medium mb-1">{t("routing.mode.cheap")}: {t("routing.mode.description.cheap")}</p>
                      <p className="font-medium mb-1">{t("routing.mode.balanced")}: {t("routing.mode.description.balanced")}</p>
                      <p className="font-medium">{t("routing.mode.quality")}: {t("routing.mode.description.quality")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              <div className="space-y-1 min-w-[180px]">
                <label className="text-xs text-gray-500">Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProjectId(id);
                    setSelectedActionName("");
                    if (id) setLocation(`/app/projects/${id}/playground`);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm"
                >
                  <option value="">Select project</option>
                  {projectIdFromUrl && !projects.some((p) => p.id === projectIdFromUrl) && (
                    <option value={projectIdFromUrl}>{projectIdFromUrl}</option>
                  )}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || p.id}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 min-w-[180px]">
                <label className="text-xs text-gray-500">Action</label>
                <select
                  value={selectedActionName}
                  onChange={(e) => setSelectedActionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm"
                  disabled={!projectId}
                >
                  <option value="">Select action</option>
                  {actions.map((a) => (
                    <option key={a.id} value={a.actionName}>{a.actionName}</option>
                  ))}
                </select>
                {projectId && actions.length === 0 && (
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                    <p className="text-amber-200">No actions yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/app/projects/${projectId}/ai`)}
                      className="mt-2 border-amber-300/50 text-amber-100 hover:bg-amber-500/15"
                    >
                      <MessageSquare size={14} className="mr-2" />
                      Create in ChatBuilder
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

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
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="axza_..."
                className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
              />
              {!apiKey.trim() && projectId && (
                <div className="flex items-center gap-2 text-sm text-amber-200/90">
                  <Key size={14} />
                  <span>Create API key in API Keys tab</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/app/projects/${projectId}?tab=keys`)}
                    className="border-amber-300/50 text-amber-100 hover:bg-amber-500/15 shrink-0"
                  >
                    Open API Keys
                  </Button>
                </div>
              )}
            </div>

            {useLegacy ? (
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
            ) : (
              <div className="space-y-2">
                <label className="text-sm text-gray-300">JSON Payload</label>
                <div className="flex gap-2">
                  <textarea
                    value={payloadJson}
                    onChange={(event) => {
                      setPayloadJson(event.target.value);
                      setValidateError(null);
                    }}
                    rows={6}
                    placeholder='{"input": {"text": "Hello"}}'
                    className="flex-1 px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const r = validatePayloadLight(payloadJson);
                      if (r.valid) {
                        setValidateError(null);
                        showSuccessToast("Payload is valid");
                      } else {
                        setValidateError(r.error);
                        showErrorToast(r.error);
                      }
                    }}
                    className="border-[rgba(255,255,255,0.12)] text-gray-400 hover:bg-[rgba(255,255,255,0.06)] self-start shrink-0"
                  >
                    Validate
                  </Button>
                </div>
                {validateError && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                    <p className="text-sm text-amber-200 font-medium">Validation error</p>
                    <p className="text-xs text-amber-100 mt-1">{validateError}</p>
                  </div>
                )}
              </div>
            )}

            {!useLegacy && projectId && selectedActionName && (
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEstimate}
                  disabled={isEstimating}
                  className="border-[rgba(255,255,255,0.12)] text-gray-400 hover:bg-[rgba(255,255,255,0.06)]"
                >
                  <Calculator size={16} className="mr-2" />
                  {isEstimating ? t("estimate.loading") : t("estimate.button")}
                </Button>
                {estimate && (
                  <div className="flex items-center gap-4 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] px-4 py-2">
                    <span className="text-sm text-gray-400">{t("estimate.tokens")}: {estimate.estimatedTokens}</span>
                    <span className="text-sm text-gray-400">{t("estimate.credits")}: {estimate.estimatedCredits}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRoutingBadgeClass(estimate.routingMode)}`}
                    >
                      {t(`routing.mode.${estimate.routingMode}`)}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {t("estimate.costLabel")}: {estimate.estimatedCredits} {t("estimate.creditsUnit")}
                    </span>
                  </div>
                )}
                {insufficientCredits && (
                  <p className="text-sm text-amber-400">
                    {t("estimate.insufficientCredits", { needed: estimate?.estimatedCredits ?? 0, balance: walletBalance ?? 0 })}
                  </p>
                )}
              </div>
            )}

            <Button
              type="button"
              disabled={isRunning || !canRun}
              onClick={handleRun}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black disabled:opacity-50"
            >
              <Play size={16} className="mr-2" />
              {isRunning ? "Running..." : "Run"}
            </Button>

            {runError && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p className="font-medium">{runError.message}</p>
                {runError.hint && <p className="mt-1 text-xs text-amber-200">{runError.hint}</p>}
                {runError.code === "MONTHLY_QUOTA_EXCEEDED" && runError.nextResetAt && (
                  <p className="mt-1 text-xs text-amber-200">
                    Next reset: {new Date(runError.nextResetAt).toLocaleString()}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {runError.code === "INSUFFICIENT_CREDITS" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/app/billing/credits")}
                      className="border-amber-300/50 text-amber-100 hover:bg-amber-500/15"
                    >
                      Open Wallet
                    </Button>
                  )}
                  {runError.code === "MONTHLY_QUOTA_EXCEEDED" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/app/billing/plans")}
                        className="border-amber-300/50 text-amber-100 hover:bg-amber-500/15"
                      >
                        Upgrade Plan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/app/billing/credits")}
                        className="border-amber-300/50 text-amber-100 hover:bg-amber-500/15"
                      >
                        Open Wallet
                      </Button>
                    </>
                  )}
                  {runError.retryable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRun()}
                      disabled={isRunning}
                      className="border-amber-300/50 text-amber-100 hover:bg-amber-500/15"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0b0e12] p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-white font-semibold">Output</h3>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Latency: {latencyMs !== null ? `${latencyMs} ms` : "-"}</span>
                {requestId && <span>Request ID: {requestId}</span>}
                {creditsCharged !== null && <span>Credits: {creditsCharged}</span>}
              </div>
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
