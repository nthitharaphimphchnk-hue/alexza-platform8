# Global Toast Notification System Documentation

## Overview

ALEXZA AI implements a global toast notification system using **Sonner**, a lightweight and elegant toast library. The system provides consistent, non-intrusive feedback across the entire application with full monochrome metallic theme integration.

## Features

- ✅ **Multiple Toast Types**: Success, Error, Warning, Info, Loading
- ✅ **Monochrome Metallic Theme**: Silver (#c0c0c0) for success, Red (#dc2626) for errors
- ✅ **Bottom-Right Position**: Non-intrusive placement
- ✅ **Auto-Dismiss**: Configurable duration per toast type
- ✅ **Close Button**: Users can manually dismiss toasts
- ✅ **Rich Colors**: Color-coded by type for quick visual recognition
- ✅ **Smooth Animations**: Fade and slide animations
- ✅ **Dark Theme**: Matches monochrome metallic design

## Installation

Sonner is already installed in the project:

```bash
pnpm add sonner
```

## Setup

The Toaster provider is configured in `App.tsx`:

```tsx
import { Toaster } from "sonner";

<Toaster
  position="bottom-right"
  theme="dark"
  richColors
  expand
  closeButton
  style={{
    '--sonner-color-success': '#c0c0c0',
    '--sonner-color-error': '#dc2626',
    '--sonner-color-warning': '#f59e0b',
    '--sonner-color-info': '#3b82f6',
    '--sonner-color-background': '#0b0e12',
    '--sonner-color-border': 'rgba(255,255,255,0.06)',
    '--sonner-color-text': 'rgba(255,255,255,0.92)',
  } as any}
/>
```

## Toast Helper Functions

All toast functions are in `client/src/lib/toast.ts`:

### Basic Toast Functions

```typescript
// Success toast (3000ms)
showSuccessToast(message: string, description?: string)

// Error toast (4000ms)
showErrorToast(message: string, description?: string)

// Warning toast (3500ms)
showWarningToast(message: string, description?: string)

// Info toast (3000ms)
showInfoToast(message: string, description?: string)

// Loading toast (manual dismiss)
showLoadingToast(message: string) -> toastId

// Dismiss specific toast
dismissToast(toastId: string | number)
```

### Action-Specific Toast Functions

```typescript
// Project actions
showProjectCreatedToast(projectName: string)
showProjectDeletedToast(projectName: string)

// API Key actions
showApiKeyCreatedToast(keyName: string)
showApiKeyDeletedToast(keyName: string)
showCopyToClipboardToast()

// Credits
showCreditsAddedToast(amount: number, credits: number)

// Forms
showFormSubmitSuccessToast(action?: string)
showFormSubmitErrorToast(error?: string)

// Playground
showPlaygroundRunToast(success: boolean, duration?: number)

// Validation
showValidationErrorToast(field: string)
```

## Usage Examples

### Success Toast

```tsx
import { showSuccessToast, showProjectCreatedToast } from '@/lib/toast';

// Generic success
showSuccessToast("Changes saved", "Your settings have been updated");

// Project-specific
showProjectCreatedToast("My AI Bot");
```

### Error Toast

```tsx
import { showErrorToast, showFormSubmitErrorToast } from '@/lib/toast';

// Generic error
showErrorToast("Something went wrong", "Please try again later");

// Form error
showFormSubmitErrorToast("Invalid email address");
```

### Loading Toast with Dismiss

```tsx
import { showLoadingToast, dismissToast } from '@/lib/toast';

const toastId = showLoadingToast("Processing...");

try {
  await processData();
  dismissToast(toastId);
  showSuccessToast("Done!");
} catch (error) {
  dismissToast(toastId);
  showErrorToast("Failed", error.message);
}
```

## Toast Durations

| Type | Duration | Use Case |
|------|----------|----------|
| Success | 3000ms | Quick confirmations |
| Error | 4000ms | Errors need more time to read |
| Warning | 3500ms | Important warnings |
| Info | 3000ms | General information |
| Loading | Manual | Long-running operations |

## Integration Points

### Pages with Toasts

1. **Projects Page** (`/app/projects`)
   - Create project success
   - Delete project success

2. **API Keys Page** (`/app/projects/:id/keys`)
   - Create API key success
   - Delete API key success
   - Copy to clipboard

3. **Wallet Page** (`/app/billing/credits`)
   - Add credits success
   - Credits added notification

4. **Login Page** (`/login`)
   - Login success
   - Login error

5. **Signup Page** (`/signup`)
   - Account created success
   - Signup error

## Color Scheme

| Type | Color | Hex | Use Case |
|------|-------|-----|----------|
| Success | Metallic Silver | #c0c0c0 | Successful actions |
| Error | Red | #dc2626 | Errors and failures |
| Warning | Amber | #f59e0b | Warnings and alerts |
| Info | Blue | #3b82f6 | Informational messages |
| Background | Dark Graphite | #0b0e12 | Toast background |
| Border | Subtle White | rgba(255,255,255,0.06) | Toast border |
| Text | White | rgba(255,255,255,0.92) | Toast text |

## Best Practices

1. **Be Concise**: Keep messages short and actionable
   ```tsx
   ✅ showSuccessToast("Saved")
   ❌ showSuccessToast("Your project has been successfully saved to the database")
   ```

2. **Use Descriptions for Context**: Add details in the description parameter
   ```tsx
   showSuccessToast("Project created", "You can now start building");
   ```

3. **Match Toast Type to Action**:
   - Success: Creation, deletion, update
   - Error: Failed operations
   - Warning: Irreversible actions
   - Info: General information

4. **Avoid Toast Spam**: Don't show multiple toasts for the same action
   ```tsx
   // ❌ Bad: Multiple toasts
   showSuccessToast("Saved");
   showInfoToast("Changes applied");
   
   // ✅ Good: Single toast
   showSuccessToast("Saved", "Changes applied");
   ```

5. **Handle Loading States**: Use loading toast for long operations
   ```tsx
   const toastId = showLoadingToast("Processing...");
   try {
     await longOperation();
     dismissToast(toastId);
     showSuccessToast("Done!");
   } catch (error) {
     dismissToast(toastId);
     showErrorToast("Failed");
   }
   ```

## Styling Customization

To customize toast styles globally, modify the `Toaster` props in `App.tsx`:

```tsx
<Toaster
  position="bottom-right"  // Change position
  theme="dark"            // dark or light
  richColors              // Enable color coding
  expand                  // Expand toast on hover
  closeButton             // Show close button
  style={{
    '--sonner-color-success': '#your-color',
    // ... other CSS variables
  } as any}
/>
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Accessibility

- Toasts are announced to screen readers
- Close button is keyboard accessible
- Auto-dismiss respects user preferences
- High contrast colors for visibility

## Testing Checklist

- [ ] Success toast shows and auto-dismisses
- [ ] Error toast shows and auto-dismisses
- [ ] Warning toast shows and auto-dismisses
- [ ] Info toast shows and auto-dismisses
- [ ] Loading toast shows and can be dismissed
- [ ] Close button works
- [ ] Multiple toasts stack properly
- [ ] Toasts work inside modals
- [ ] Toasts work on mobile
- [ ] Colors match monochrome metallic theme
- [ ] No console errors

## Future Enhancements

- [ ] Toast action buttons (undo, retry)
- [ ] Custom toast components
- [ ] Toast queue management
- [ ] Persistent toast option
- [ ] Sound notifications
- [ ] Toast history/log
