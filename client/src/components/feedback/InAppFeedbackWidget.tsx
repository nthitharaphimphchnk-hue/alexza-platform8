import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiRequest, ApiError } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type FeedbackType = "bug" | "feature" | "ux" | "general";

export default function InAppFeedbackWidget() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      showErrorToast("Feedback message required", "Please describe your issue or idea.");
      return;
    }
    setIsSubmitting(true);
    try {
      const route =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : undefined;
      await apiRequest<{ ok: boolean; id: string }>("/api/feedback", {
        method: "POST",
        body: {
          type,
          message,
          email: email.trim() || undefined,
          route,
          workspaceId: currentWorkspace?.id,
        },
      });
      showSuccessToast("Feedback sent", "Thanks for helping improve ALEXZA AI.");
      setMessage("");
      setType("bug");
      setOpen(false);
    } catch (err) {
      const description =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to send feedback right now.";
      showErrorToast("Failed to send feedback", description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.18)] bg-black/80 px-3 py-1.5 text-xs font-medium text-gray-200 shadow-lg backdrop-blur hover:bg-white/5 hover:text-white transition-colors"
      >
        <MessageCircle size={14} className="text-[#c0c0c0]" />
        <span>Send Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="feedback-type">Type</Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as FeedbackType)}
              >
                <SelectTrigger id="feedback-type">
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature request</SelectItem>
                  <SelectItem value="ux">UX issue</SelectItem>
                  <SelectItem value="general">General feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                placeholder="Describe the problem, idea, or feedback you have…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback-email">
                Email (optional, for follow-up)
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>
                We&apos;ll automatically attach your current page, workspace, and environment
                details.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

