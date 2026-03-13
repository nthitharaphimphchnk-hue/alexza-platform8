import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { runAction } from "@/lib/alexzaApi";

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category?: string;
  /** Starter label from onboarding API (e.g. "Text summarizer", "Translator") */
  label?: string;
}

type Step = 1 | 2 | 3 | 4;

export default function Onboarding() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [actionName, setActionName] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      setLocation("/app/dashboard");
    }
  }, [user, setLocation]);

  const updateOnboardingState = async (step: Step, completed = false) => {
    try {
      await apiRequest("/api/onboarding/state", {
        method: "POST",
        body: { step, completed },
      });
      await refetch();
    } catch {
      // Non-fatal
    }
  };

  /** Skip onboarding: mark complete on backend, refetch user, then navigate to dashboard. Prevents redirect loop. */
  const handleSkip = async () => {
    if (isSkipping) return;
    setIsSkipping(true);
    try {
      await apiRequest("/api/onboarding/complete", { method: "POST" });
      await refetch();
      setLocation("/app/dashboard");
    } catch (err) {
      showErrorToast(
        "Could not skip onboarding",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsSkipping(false);
    }
  };

  const handleCreateProject = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        project: { id: string; name: string };
      }>("/api/projects", {
        method: "POST",
        body: {
          name: "My First AI Project",
          description: "Created via onboarding wizard",
          model: "gpt-4o-mini",
        },
      });
      const id = res.project.id;
      setProjectId(id);
      showSuccessToast("Project created", "Your first project is ready.");
      setCurrentStep(2);
      await updateOnboardingState(2);
    } catch (err) {
      showErrorToast(
        "Failed to create project",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const onboardingRes = await apiRequest<{
        ok: boolean;
        templates: Array<{ id: string; name: string; description: string; category?: string; label?: string }>;
      }>("/api/onboarding/templates").catch(() => null);
      if (onboardingRes?.ok && Array.isArray(onboardingRes.templates) && onboardingRes.templates.length > 0) {
        setTemplates(onboardingRes.templates);
        setSelectedTemplateId(onboardingRes.templates[0].id);
        return;
      }
      const res = await apiRequest<{
        ok: boolean;
        templates: Array<{ id: string; name: string; description: string; category?: string }>;
      }>("/api/templates?limit=20");
      const starters = res.templates.filter((t) =>
        /summariz|translate|lead|email/i.test(t.name + " " + t.description)
      );
      setTemplates(starters.length ? starters : res.templates);
      if ((starters.length || res.templates.length) > 0) {
        setSelectedTemplateId((starters[0] || res.templates[0]).id);
      }
    } catch (err) {
      showErrorToast(
        "Failed to load templates",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const handleApplyTemplate = async () => {
    if (!projectId || !selectedTemplateId) return;
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        action: { actionName: string };
      }>(`/api/templates/${selectedTemplateId}/apply`, {
        method: "POST",
        body: { projectId },
      });
      setActionName(res.action.actionName);
      showSuccessToast("Template applied", "Action created in your project.");
      setCurrentStep(3);
      await updateOnboardingState(3);
    } catch (err) {
      showErrorToast(
        "Failed to apply template",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        rawKey: string;
      }>(`/api/projects/${projectId}/keys`, {
        method: "POST",
        body: { name: "Onboarding Key" },
      });
      setApiKey(res.rawKey);
      showSuccessToast("API key created", "Keep this key safe.");
      setCurrentStep(4);
      await updateOnboardingState(4);
    } catch (err) {
      showErrorToast(
        "Failed to create API key",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunFirstRequest = async () => {
    if (!projectId || !actionName || !apiKey) return;
    setIsLoading(true);
    try {
      const res = await runAction(
        projectId,
        actionName,
        { input: { text: "Hello from my first AI project" } },
        apiKey,
        { source: "onboarding" }
      );
      setRunOutput(res.output);
      showSuccessToast("First run complete", "Your AI action ran successfully.");
      await apiRequest("/api/onboarding/complete", { method: "POST" });
      await refetch();
      setTimeout(() => setLocation("/app/dashboard"), 1200);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Run failed";
      showErrorToast("Run failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 4) * 100;

  return (
    <AppShell
      title="Welcome to ALEXZA AI"
      subtitle="Let's create your first AI project in a few guided steps."
      backHref="/app/dashboard"
      backLabel={isSkipping ? "Skipping..." : "Skip"}
      onBackClick={handleSkip}
      backDisabled={isSkipping}
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Onboarding" },
      ]}
    >
      <div className="space-y-6">
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1.5fr]">
          <div className="space-y-6">
            {currentStep === 1 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-white">Step 1 · Create your first project</h2>
                <p className="text-gray-300">
                  A project groups your AI actions, agents, and workflows. We'll start by creating a
                  starter project for you.
                </p>
                <Button disabled={isLoading} onClick={() => void handleCreateProject()}>
                  {isLoading ? "Creating..." : "Create Project"}
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-white">Step 2 · Choose a starter template</h2>
                <p className="text-gray-300">
                  Pick an AI template to start with. You can always add more later.
                </p>
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition ${
                        selectedTemplateId === tpl.id
                          ? "border-cyan-400 bg-cyan-500/10 text-white"
                          : "border-[rgba(255,255,255,0.06)] bg-[#050607] text-gray-200 hover:border-cyan-500/60"
                      }`}
                    >
                      <div className="font-medium">{tpl.label ?? tpl.name}</div>
                      {tpl.label && tpl.name !== tpl.label && (
                        <div className="text-xs text-gray-500 mt-0.5">{tpl.name}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">{tpl.description}</div>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-sm text-gray-500">
                      No templates found yet. You can create actions manually from the Dashboard later.
                    </div>
                  )}
                </div>
                <Button
                  disabled={isLoading || !selectedTemplateId || !projectId}
                  onClick={() => void handleApplyTemplate()}
                >
                  {isLoading ? "Applying..." : "Use Selected Template"}
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-white">Step 3 · Generate an API key</h2>
                <p className="text-gray-300">
                  API keys let your application call the ALEXZA runtime. We'll create a development key
                  you can use right away.
                </p>
                {apiKey ? (
                  <div className="rounded-lg bg-black/40 border border-[rgba(255,255,255,0.12)] p-3">
                    <div className="text-xs text-gray-400 mb-1">Your new API key</div>
                    <code className="text-xs text-gray-100 break-all">{apiKey}</code>
                    <div className="mt-2 text-[11px] text-orange-300">
                      Copy this key now. For security reasons we won't show it again.
                    </div>
                  </div>
                ) : null}
                <Button disabled={isLoading || !projectId} onClick={() => void handleCreateApiKey()}>
                  {isLoading ? "Creating..." : apiKey ? "Create Another Key" : "Create API Key"}
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-white">Step 4 · Run your first AI request</h2>
                <p className="text-gray-300">
                  We&apos;ll send a small test input to your new action using your API key so you can see
                  a live response.
                </p>
                <Button
                  disabled={isLoading || !projectId || !actionName || !apiKey}
                  onClick={() => void handleRunFirstRequest()}
                >
                  {isLoading ? "Running..." : "Run Test Request"}
                </Button>
                {runOutput && (
                  <div className="rounded-lg bg-black/40 border border-[rgba(255,255,255,0.12)] p-3 mt-3">
                    <div className="text-xs text-gray-400 mb-1">Sample response</div>
                    <pre className="text-xs text-gray-100 whitespace-pre-wrap">
                      {runOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Wizard steps</h3>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className={currentStep === 1 ? "text-white font-medium" : ""}>
                  1. Create Project
                </li>
                <li className={currentStep === 2 ? "text-white font-medium" : ""}>
                  2. Choose Template
                </li>
                <li className={currentStep === 3 ? "text-white font-medium" : ""}>
                  3. Generate API Key
                </li>
                <li className={currentStep === 4 ? "text-white font-medium" : ""}>
                  4. Run First Request
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 text-sm text-gray-300 space-y-2">
              <h3 className="text-sm font-semibold text-white mb-1">Starter templates</h3>
              <p>
                Choose one of: <strong className="text-white">Text summarizer</strong>,{" "}
                <strong className="text-white">Translator</strong>,{" "}
                <strong className="text-white">Lead extractor</strong>, or{" "}
                <strong className="text-white">Email generator</strong> to add your first action.
              </p>
              <p className="text-xs text-gray-500">
                You can always explore more advanced templates, workflows, and agents from the Dashboard
                after you finish this wizard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

