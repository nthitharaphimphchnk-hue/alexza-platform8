import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal Component
 * Design: Monochrome metallic theme
 * - Focus trap (Tab/Shift+Tab stays inside)
 * - ESC closes modal
 * - Click overlay closes modal
 * - Premium animation (fade + scale)
 * - Full accessibility support
 */

interface ModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  closeOnEsc = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap implementation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // ESC to close
      if (closeOnEsc && e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      // Focus trap for Tab
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements) as HTMLElement[];

        if (focusableArray.length === 0) return;

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (e.shiftKey) {
          // Shift + Tab
          if (activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [closeOnEsc, onOpenChange]
  );

  useEffect(() => {
    if (!open) return;

    // Save previous active element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element
    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';

      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, handleKeyDown]);

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlay) {
      onOpenChange(false);
    }
  }, [closeOnOverlay, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            ref={modalRef}
            className={`bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl w-full ${sizeClasses[size]}`}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-[rgba(255,255,255,0.06)]">
              <div>
                <h2 id="modal-title" className="text-2xl font-bold text-white">
                  {title}
                </h2>
                {description && (
                  <p id="modal-description" className="text-sm text-gray-400 mt-2">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition text-gray-400 hover:text-white"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-8 border-t border-[rgba(255,255,255,0.06)] flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
