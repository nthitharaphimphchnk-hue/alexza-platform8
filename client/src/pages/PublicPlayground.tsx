import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, FileText, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import { API_BASE_URL } from "@/lib/api";
import { Link } from "wouter";

interface DemoAction {
  id: string;
  label: string;
}

const ACTION_INPUTS: Record<
  string,
  { fields: { key: string; label: string; placeholder: string; multiline?: boolean }[] }
> = {
  summarize_text: {
    fields: [
      { key: "text", label: "Text to summarize", placeholder: "Paste your text here...", multiline: true },
    ],
  },
  generate_blog: {
    fields: [
      { key: "topic", label: "Topic", placeholder: "e.g. The Future of Remote Work" },
      { key: "keyPoints", label: "Key points", placeholder: "e.g. hybrid models, async communication", multiline: true },
    ],
  },
  extract_contact_info: {
    fields: [
      { key: "text", label: "Text with contact info", placeholder: "e.g. Contact John at john@acme.com, +1-555-1234", multiline: true },
    ],
  },
  support_agent: {
    fields: [
      { key: "message", label: "Customer message", placeholder: "e.g. My order hasn't arrived..." },
      { key: "context", label: "Context (optional)", placeholder: "e.g. Premium customer, first complaint" },
    ],
  },
  research_agent: {
    fields: [
      { key: "topic", label: "Research topic", placeholder: "e.g. Impact of AI on healthcare" },
      { key: "notes", label: "Research notes", placeholder: "Paste your notes or sources...", multiline: true },
    ],
  },
};

export default function PublicPlayground() {
  const [actions, setActions] = useState<DemoAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("summarize_text");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/playground/actions`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.actions)) {
          setActions(data.actions);
          if (data.actions.length > 0 && !selectedAction) {
            setSelectedAction(data.actions[0].id);
          }
        }
      })
      .catch(() => setActions([
        { id: "summarize_text", label: "Summarize Text" },
        { id: "generate_blog", label: "Generate Blog" },
        { id: "extract_contact_info", label: "Extract Contact Info" },
        { id: "support_agent", label: "Support Agent" },
        { id: "research_agent", label: "Research Agent" },
      ]));
  }, []);

  const fields = ACTION_INPUTS[selectedAction]?.fields ?? ACTION_INPUTS.summarize_text.fields;

  const handleInputChange = (key: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleRun = async () => {
    const input: Record<string, string> = {};
    for (const f of fields) {
      input[f.key] = inputValues[f.key] ?? "";
    }

    const hasRequired = fields.some((f) => (input[f.key] ?? "").trim().length > 0);
    if (!hasRequired) {
      setError("Please fill in at least one field.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setOutput("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/playground/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction, input }),
      });

      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining !== null) setRateLimitRemaining(parseInt(remaining, 10));

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message ?? data?.message ?? `Request failed (${res.status})`;
        setError(msg);
        return;
      }

      setOutput(typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050607] text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-[#050607]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center gap-2">
              <Logo size="navbar" />
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <a href="/docs" className="text-sm text-gray-400 hover:text-white transition">Docs</a>
            <a href="/pricing" className="text-sm text-gray-400 hover:text-white transition">Pricing</a>
            <Button variant="outline" size="sm" className="border-[rgba(255,255,255,0.2)]" onClick={() => window.location.href = "/signup"}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-[#c0c0c0]" />
            AI Playground
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Try ALEXZA AI without an account. No signup required. Rate limited to 5 requests per minute per IP.
          </p>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
            <label className="block text-sm font-medium text-gray-300 mb-2">Demo Action</label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setInputValues({});
                setError(null);
              }}
              className="w-full max-w-md px-4 py-2.5 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white text-sm focus:outline-none focus:border-[rgba(255,255,255,0.28)]"
            >
              {actions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-300">Input</label>
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                {f.multiline ? (
                  <textarea
                    value={inputValues[f.key] ?? ""}
                    onChange={(e) => handleInputChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)] text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={inputValues[f.key] ?? ""}
                    onChange={(e) => handleInputChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,255,255,0.28)] text-sm"
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black disabled:opacity-70"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? "Running..." : "Run"}
            </Button>

            {rateLimitRemaining !== null && (
              <p className="text-xs text-gray-500">Requests remaining this minute: {rateLimitRemaining}</p>
            )}
          </div>

          <div className="p-6 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">Output</label>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-200 bg-[#050607] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 min-h-[120px] font-sans">
              {output || (isRunning ? "Processing..." : "-")}
            </pre>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Create an account to build your own AI actions, use the full API, and integrate with your apps.{" "}
          <a href="/signup" className="text-[#c0c0c0] hover:underline">Get started free</a>
        </p>
      </main>
    </div>
  );
}
