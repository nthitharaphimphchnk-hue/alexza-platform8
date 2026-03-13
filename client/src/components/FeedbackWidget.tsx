import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type FeedbackType = "bug" | "feature_request" | "ux_issue" | "general";

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feature_request: "Feature request",
  ux_issue: "UX issue",
  general: "General feedback",
};

export default function FeedbackWidget() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setEmail(user?.email ?? "");
  }, [open, user?.email]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMessage("");
      setType("general");
    }
    setOpen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await apiRequest<{ ok: boolean; id: string }>("/api/feedback", {
        method: "POST",
        body: {
          type,
          message: trimmed,
          email: email.trim() || undefined,
          route: location,
          workspaceId: currentWorkspace?.id ?? undefined,
        },
      });
      showSuccessToast("Feedback sent", "Thank you for helping us improve.");
      setOpen(false);
      setMessage("");
    } catch (err) {
      showErrorToast(
        "Could not send feedback",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 z-40 h-10 gap-2 rounded-full border-[rgba(255,255,255,0.12)] bg-[#0b0e12]/90 text-gray-300 shadow-lg backdrop-blur hover:border-[rgba(255,255,255,0.2)] hover:bg-[#0b0e12] hover:text-white"
          aria-label="Send feedback"
        >
          <MessageSquarePlus size={16} />
          <span className="hidden sm:inline">Send Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[rgba(255,255,255,0.08)] bg-[#0b0e12] text-gray-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Send Feedback</DialogTitle>
          <DialogDescription className="text-gray-400">
            Share a bug, idea, or general feedback. We read every submission.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type" className="text-gray-300">
              Type
            </Label>
            <select
              id="feedback-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              className="w-full rounded-md border border-[rgba(255,255,255,0.12)] bg-[#050607] px-3 py-2 text-sm text-white focus:border-[rgba(192,192,192,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(192,192,192,0.3)]"
            >
              {(Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((k) => (
                <option key={k} value={k}>
                  {FEEDBACK_TYPE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="text-gray-300">
              Message
            </Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback..."
              required
              rows={4}
              className="min-h-[100px] resize-y border-[rgba(255,255,255,0.12)] bg-[#050607] text-white placeholder:text-gray-500 focus:border-[rgba(192,192,192,0.4)]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-email" className="text-gray-300">
              Email (optional)
            </Label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="border-[rgba(255,255,255,0.12)] bg-[#050607] text-white placeholder:text-gray-500 focus:border-[rgba(192,192,192,0.4)]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-[rgba(255,255,255,0.12)] text-gray-300 hover:bg-[rgba(255,255,255,0.06)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!message.trim() || submitting}
              className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
            >
              {submitting ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
