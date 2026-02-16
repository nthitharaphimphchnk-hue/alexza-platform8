import { toast } from 'sonner';

/**
 * Toast Notification Helpers
 * Reusable toast functions with consistent styling and messaging
 */

export const showSuccessToast = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 3000,
  });
};

export const showErrorToast = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 4000,
  });
};

export const showWarningToast = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    duration: 3500,
  });
};

export const showInfoToast = (message: string, description?: string) => {
  toast.info(message, {
    description,
    duration: 3000,
  });
};

export const showLoadingToast = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

// Specific action toasts
export const showProjectCreatedToast = (projectName: string) => {
  showSuccessToast(`Project "${projectName}" created`, 'You can now start building');
};

export const showProjectDeletedToast = (projectName: string) => {
  showSuccessToast(`Project "${projectName}" deleted`, 'The project has been removed');
};

export const showApiKeyCreatedToast = (keyName: string) => {
  showSuccessToast(`API key "${keyName}" created`, 'Copy and save it in a secure location');
};

export const showApiKeyDeletedToast = (keyName: string) => {
  showSuccessToast(`API key "${keyName}" deleted`, 'Applications using this key will stop working');
};

export const showCreditsAddedToast = (amount: number, credits: number) => {
  showSuccessToast(`$${amount.toFixed(2)} added`, `You now have ${credits.toLocaleString()} credits`);
};

export const showFormSubmitSuccessToast = (action: string = 'Saved') => {
  showSuccessToast(`${action} successfully`, 'Your changes have been saved');
};

export const showFormSubmitErrorToast = (error?: string) => {
  showErrorToast('Something went wrong', error || 'Please try again');
};

export const showPlaygroundRunToast = (success: boolean, duration?: number) => {
  if (success) {
    showSuccessToast('Playground executed', `Completed in ${duration || '1.2'}s`);
  } else {
    showErrorToast('Execution failed', 'Check your input and try again');
  }
};

export const showCopyToClipboardToast = () => {
  showSuccessToast('Copied to clipboard', 'The text has been copied');
};

export const showValidationErrorToast = (field: string) => {
  showErrorToast('Validation error', `Please check the ${field} field`);
};
