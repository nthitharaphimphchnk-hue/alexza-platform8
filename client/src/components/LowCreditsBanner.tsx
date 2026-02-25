import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type LowCreditsBannerProps = {
  balanceCredits: number;
  onAddCredits: () => void;
  onDismiss?: () => void;
};

export default function LowCreditsBanner({ balanceCredits, onAddCredits, onDismiss }: LowCreditsBannerProps) {
  const isZeroBalance = balanceCredits === 0;
  const title = isZeroBalance ? "No ALEXZA Credits remaining" : "ALEXZA Credits running low";
  const message = isZeroBalance
    ? "You have 0 ALEXZA Credits left. Top up now to restore uninterrupted ALEXZA Managed Runtime service."
    : `You have ${balanceCredits.toLocaleString()} ALEXZA Credits left. Top up to avoid service interruption.`;

  return (
    <div
      className="rounded-xl px-4 py-3 border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/70 text-gray-200"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 text-[#c0c0c0]" />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm text-gray-400">{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="border-[rgba(255,255,255,0.08)] text-gray-200 hover:bg-[rgba(255,255,255,0.06)]"
            >
              Dismiss
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={onAddCredits}
            className="bg-[#c0c0c0] text-black hover:bg-[#a8a8a8]"
          >
            {isZeroBalance ? "Top up now" : "Add Credits"}
          </Button>
        </div>
      </div>
    </div>
  );
}
