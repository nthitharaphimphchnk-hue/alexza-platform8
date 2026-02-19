import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type LowCreditsBannerProps = {
  balanceCredits: number;
  onAddCredits: () => void;
  onDismiss?: () => void;
};

export default function LowCreditsBanner({ balanceCredits, onAddCredits, onDismiss }: LowCreditsBannerProps) {
  const isZeroBalance = balanceCredits === 0;
  const title = isZeroBalance ? "No credits remaining" : "Credits running low";
  const message = isZeroBalance
    ? "You have 0 credits left. Top up now to restore uninterrupted service."
    : `You have ${balanceCredits.toLocaleString()} credits left. Top up to avoid service interruption.`;

  return (
    <div
      className={`rounded-xl px-4 py-3 ${
        isZeroBalance
          ? "border border-red-300/40 bg-red-500/10 text-red-100"
          : "border border-amber-300/40 bg-amber-500/10 text-amber-100"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className={`mt-0.5 ${isZeroBalance ? "text-red-300" : "text-amber-300"}`} />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className={`mt-1 text-sm ${isZeroBalance ? "text-red-100/90" : "text-amber-100/90"}`}>{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className={
                isZeroBalance
                  ? "border-red-300/40 text-red-100 hover:bg-red-500/15"
                  : "border-amber-300/40 text-amber-100 hover:bg-amber-500/15"
              }
            >
              Dismiss
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={onAddCredits}
            className={isZeroBalance ? "bg-red-300 text-black hover:bg-red-200" : "bg-amber-300 text-black hover:bg-amber-200"}
          >
            {isZeroBalance ? "Top up now" : "Add Credits"}
          </Button>
        </div>
      </div>
    </div>
  );
}
