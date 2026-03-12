import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { apiRequest, ApiError } from "@/lib/api";
import { useLocation } from "wouter";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type Mode = "allow" | "warn" | "block" | "fallback";

interface ProjectOption {
  id: string;
  name: string;
}

interface GuardRule {
  perRequestCreditLimit: number | null;
  dailyCreditBudget: number | null;
  monthlyCreditBudget: number | null;
  allowedModels: string[];
  fallbackModel: string;
  mode: Mode;
}

export default function BillingGuardsPage() {
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [rule, setRule] = useState<GuardRule>({
    perRequestCreditLimit: null,
    dailyCreditBudget: null,
    monthlyCreditBudget: null,
    allowedModels: [],
    fallbackModel: "",
    mode: "allow",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiRequest<{ ok: true; projects: { id: string; name: string }[] }>("/api/projects")
      .then((res) => {
        const opts = (res.projects || []).map((p) => ({ id: String(p.id), name: p.name || "Untitled" }));
        setProjects(opts);
        if (opts.length > 0) {
          setSelectedProjectId(opts[0].id);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setLocation("/login");
          return;
        }
        showErrorToast("Failed to load projects");
      })
      .finally(() => setLoading(false));
  }, [setLocation]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    apiRequest<{ ok: true; rule: GuardRule | null }>(`/api/projects/${selectedProjectId}/cost-guard`)
      .then((res) => {
        if (res.rule) {
          setRule(res.rule);
        } else {
          setRule({
            perRequestCreditLimit: null,
            dailyCreditBudget: null,
            monthlyCreditBudget: null,
            allowedModels: [],
            fallbackModel: "",
            mode: "allow",
          });
        }
      })
      .catch(() => {
        showErrorToast("Failed to load cost guard rule");
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const handleSave = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      await apiRequest<{ ok: true }>(`/api/projects/${selectedProjectId}/cost-guard`, {
        method: "PUT",
        body: {
          perRequestCreditLimit: rule.perRequestCreditLimit || undefined,
          dailyCreditBudget: rule.dailyCreditBudget || undefined,
          monthlyCreditBudget: rule.monthlyCreditBudget || undefined,
          allowedModels: rule.allowedModels,
          fallbackModel: rule.fallbackModel || undefined,
          mode: rule.mode,
        },
      });
      showSuccessToast("Cost guard updated");
    } catch {
      showErrorToast("Failed to save cost guard");
    } finally {
      setSaving(false);
    }
  };

  const parseNumber = (value: string): number | null =>
    value.trim() === "" ? null : Number.isNaN(Number(value)) ? null : Number(value);

  return (
    <AppShell
      title="AI Cost Guard"
      subtitle="Configure per-project credit limits and budgets to prevent runaway AI costs."
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Billing", href: "/app/billing" },
        { label: "Cost Guard" },
      ]}
    >
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0b0e12] p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">Project</h2>
          <p className="text-sm text-gray-400">
            Select a project to apply cost guard rules. Rules cap credits per request and per day/month for all actions in
            the project.
          </p>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loading || projects.length === 0}
            className="mt-2 w-full max-w-sm rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
          >
            {projects.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0b0e12] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Budgets & Limits</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Per-request credit limit</label>
              <input
                type="number"
                min={0}
                value={rule.perRequestCreditLimit ?? ""}
                onChange={(e) =>
                  setRule((r) => ({ ...r, perRequestCreditLimit: parseNumber(e.target.value) }))
                }
                className="w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
                placeholder="e.g. 200"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Maximum credits allowed for a single action run. Leave blank for no hard cap.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Daily credit budget</label>
              <input
                type="number"
                min={0}
                value={rule.dailyCreditBudget ?? ""}
                onChange={(e) => setRule((r) => ({ ...r, dailyCreditBudget: parseNumber(e.target.value) }))}
                className="w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
                placeholder="e.g. 5,000"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Monthly credit budget</label>
              <input
                type="number"
                min={0}
                value={rule.monthlyCreditBudget ?? ""}
                onChange={(e) =>
                  setRule((r) => ({ ...r, monthlyCreditBudget: parseNumber(e.target.value) }))
                }
                className="w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
                placeholder="e.g. 100,000"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mode</label>
              <select
                value={rule.mode}
                onChange={(e) =>
                  setRule((r) => ({ ...r, mode: e.target.value as Mode }))
                }
                className="w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
              >
                <option value="allow">Allow</option>
                <option value="warn">Warn (logs only)</option>
                <option value="block">Block when over budget</option>
                <option value="fallback">Use fallback model when over budget</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0b0e12] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Models</h2>
          <div className="space-y-2">
            <label className="text-xs text-gray-400 block mb-1">Allowed models (comma-separated)</label>
            <input
              type="text"
              value={rule.allowedModels.join(",")}
              onChange={(e) =>
                setRule((r) => ({
                  ...r,
                  allowedModels: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
              placeholder="e.g. gpt-4o-mini,gpt-4.1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400 block mb-1">Fallback model</label>
            <input
              type="text"
              value={rule.fallbackModel}
              onChange={(e) => setRule((r) => ({ ...r, fallbackModel: e.target.value }))}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[#050607] px-3 py-2 text-sm text-white"
              placeholder="e.g. gpt-4o-mini"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Used when mode is <code>fallback</code> and a request would exceed budgets or use a disallowed model.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !selectedProjectId}
            className="rounded-lg bg-[#c0c0c0] px-4 py-2 text-sm font-semibold text-black hover:bg-[#a8a8a8] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save guards"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

