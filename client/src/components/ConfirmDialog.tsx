import { ReactNode } from 'react';
import Modal from './Modal';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * ConfirmDialog Component
 * Design: Monochrome metallic theme
 * - Reusable confirmation dialog for destructive actions
 * - Danger styling for confirm button
 * - Clear warning message
 */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || confirmDisabled}
            className={`font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
              isDangerous
                ? 'bg-red-600/80 hover:bg-red-700 text-white'
                : 'bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {confirmText}...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isDangerous && (
          <div className="p-4 rounded-lg bg-red-600/10 border border-red-600/30 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">This action cannot be undone.</p>
          </div>
        )}
        {children}
      </div>
    </Modal>
  );
}
