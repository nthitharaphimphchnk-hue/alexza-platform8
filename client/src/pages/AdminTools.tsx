import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useEffect, useMemo, useState } from "react";

interface NotificationsStatusResponse {
  ok: boolean;
  resendConfigured: boolean;
  emailFrom: string;
  threshold: number;
}

export default function AdminTools() {
  const [adminKey, setAdminKey] = useState("");
  const [status, setStatus] = useState<NotificationsStatusResponse | null>(null);
  const [responseLog, setResponseLog] = useState<string>("");
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const adminHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (adminKey.trim().length > 0) {
      headers["x-admin-key"] = adminKey.trim();
    }
    return headers;
  }, [adminKey]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await apiRequest<NotificationsStatusResponse>("/api/admin/notifications/status", {
        headers: adminHeaders,
      });
      setStatus(res);
      setResponseLog(JSON.stringify(res, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notification status";
      showErrorToast("Status check failed", message);
      if (error instanceof ApiError) {
        setResponseLog(JSON.stringify({ ok: false, error: error.code, message: error.message }, null, 2));
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const sendTestLowCreditEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        userId?: string;
        sent?: boolean;
        skippedReason?: string;
        balance?: number;
      }>("/api/admin/notifications/test-low-credits", {
        method: "POST",
        headers: adminHeaders,
        body: {},
      });
      setResponseLog(JSON.stringify(res, null, 2));
      if (res.sent) {
        showSuccessToast("Test low-credit email sent");
      } else {
        showSuccessToast("Test call completed", res.skippedReason ?? "No email sent");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send test low-credit email";
      showErrorToast("Test email failed", message);
      if (error instanceof ApiError) {
        setResponseLog(JSON.stringify({ ok: false, error: error.code, message: error.message }, null, 2));
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <AppShell
      title="Admin Tools"
      subtitle="Internal operational tools and notification runners"
      backHref="/app/dashboard"
      backLabel="Back to Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/app/dashboard" },
        { label: "Admin" },
        { label: "Tools" },
      ]}
    >
      <section className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 p-6">
        <h2 className="text-lg font-semibold text-white">Low Credits Email Runner</h2>
        <p className="mt-1 text-sm text-gray-400">
          Run a one-click test for low-credit notifications and inspect backend response JSON.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="x-admin-key (required in production)"
            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] px-3 py-2 text-white"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isLoadingStatus}
            onClick={() => void loadStatus()}
            className="border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.06)]"
          >
            {isLoadingStatus ? "Checking..." : "Check Status"}
          </Button>
          <Button
            type="button"
            disabled={isSendingTest}
            onClick={() => void sendTestLowCreditEmail()}
            className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
          >
            {isSendingTest ? "Sending..." : "Send Test Low Credit Email"}
          </Button>
        </div>

        {status ? (
          <div className="mt-4 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3 text-sm text-gray-300">
            <div>Resend configured: {status.resendConfigured ? "Yes" : "No"}</div>
            <div>Email from: {status.emailFrom || "-"}</div>
            <div>Threshold: {status.threshold}</div>
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 text-sm text-gray-400">Response JSON</p>
          <pre className="max-h-[360px] overflow-auto rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050607] p-3 text-xs text-gray-200">
            {responseLog || "{ }"}
          </pre>
        </div>
      </section>
    </AppShell>
  );
}
