# Modal Dialog System Documentation

## Overview

ALEXZA AI implements a comprehensive, reusable Modal Dialog System with full accessibility support, focus trap, and premium animations. This system is used across the application for create, delete, and confirmation flows.

## Components

### 1. Modal Component

**Location:** `client/src/components/Modal.tsx`

**Purpose:** Reusable modal dialog with accessibility and keyboard navigation.

**Features:**
- ✅ Focus trap (Tab/Shift+Tab stays inside)
- ✅ ESC key closes modal
- ✅ Click overlay closes modal (configurable)
- ✅ Premium animation (fade + scale)
- ✅ Full ARIA support (role="dialog", aria-modal, aria-labelledby, aria-describedby)
- ✅ Body scroll lock while open
- ✅ Mobile responsive
- ✅ Automatic focus restoration

**Props:**

```typescript
interface ModalProps {
  open: boolean;                    // Modal visibility state
  onOpenChange: (next: boolean) => void;  // Callback to change open state
  title: string;                    // Modal title
  description?: string;             // Optional description
  children: ReactNode;              // Modal content
  footer?: ReactNode;               // Optional footer (usually buttons)
  size?: 'sm' | 'md' | 'lg';        // Modal size (default: 'md')
  closeOnOverlay?: boolean;         // Close on overlay click (default: true)
  closeOnEsc?: boolean;             // Close on ESC key (default: true)
}
```

**Usage Example:**

```tsx
import Modal from '@/components/Modal';
import { Button } from '@/components/ui/button';

export default function MyPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create Item"
        description="Fill in the details below"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Create</Button>
          </>
        }
      >
        <form className="space-y-4">
          {/* Form fields */}
        </form>
      </Modal>
    </>
  );
}
```

### 2. ConfirmDialog Component

**Location:** `client/src/components/ConfirmDialog.tsx`

**Purpose:** Reusable confirmation dialog for destructive actions (delete, revoke, etc.).

**Features:**
- ✅ Built on Modal component
- ✅ Danger styling for destructive actions
- ✅ Clear warning message
- ✅ Loading state during confirmation
- ✅ Accessible confirmation flow

**Props:**

```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;             // Button text (default: 'Confirm')
  cancelText?: string;              // Button text (default: 'Cancel')
  isDangerous?: boolean;            // Show danger styling (default: false)
  isLoading?: boolean;              // Show loading state
  onConfirm: () => void | Promise<void>;  // Confirmation callback
  children?: ReactNode;             // Optional additional content
}
```

**Usage Example:**

```tsx
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ProjectCard({ project }) {
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    // API call
    await deleteProject(project.id);
  };

  return (
    <>
      <button onClick={() => setShowDelete(true)}>Delete</button>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"?`}
        confirmText="Delete"
        isDangerous={true}
        onConfirm={handleDelete}
      />
    </>
  );
}
```

## Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Move focus to next focusable element (wraps at end) |
| `Shift+Tab` | Move focus to previous focusable element (wraps at start) |
| `ESC` | Close modal (if `closeOnEsc={true}`) |
| `Enter` | Submit form or activate button |

## Accessibility Features

1. **Focus Management**
   - Focus automatically moves to first focusable element when modal opens
   - Focus is restored to trigger element when modal closes
   - Focus trap prevents tab navigation outside modal

2. **ARIA Labels**
   - `role="dialog"` - Identifies modal as dialog
   - `aria-modal="true"` - Indicates modal behavior
   - `aria-labelledby="modal-title"` - Links title to dialog
   - `aria-describedby="modal-description"` - Links description to dialog

3. **Semantic HTML**
   - Proper heading hierarchy
   - Button elements for interactive controls
   - Form elements for input

4. **Visual Indicators**
   - Clear focus rings on interactive elements
   - Hover states for buttons
   - Error states with red borders and icons

## Styling (Monochrome Metallic Theme)

All modals follow the monochrome metallic design system:

- **Background:** `#0b0e12` (dark graphite)
- **Border:** `rgba(255,255,255,0.06)` (subtle white)
- **Primary Button:** `#c0c0c0` (metallic silver)
- **Primary Button Hover:** `#a8a8a8` (darker silver)
- **Danger Button:** `#dc2626` (red)
- **Text:** `rgba(255,255,255,0.92)` (white)
- **Secondary Text:** `rgba(255,255,255,0.68)` (gray)

## Implementation Checklist

When adding a new modal to a page:

- [ ] Import Modal or ConfirmDialog component
- [ ] Create state for `open` and `onOpenChange`
- [ ] Add form validation if needed
- [ ] Implement `onSubmit` handler
- [ ] Add loading state during submission
- [ ] Include proper ARIA labels
- [ ] Test keyboard navigation (Tab, Shift+Tab, ESC)
- [ ] Test focus trap (Tab doesn't escape modal)
- [ ] Test on mobile viewport
- [ ] Verify overlay click closes modal (if enabled)

## Pages Using Modal System

1. **Projects Page** (`/projects`)
   - Create Project Modal
   - Delete Project ConfirmDialog

2. **API Keys Page** (`/api-keys`)
   - Create API Key Modal
   - Delete API Key ConfirmDialog

3. **Wallet Page** (`/wallet`)
   - Add Credits Modal

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Performance Considerations

- Modals use `AnimatePresence` from Framer Motion for smooth animations
- Focus trap uses event delegation (no external dependencies)
- Body scroll lock is properly cleaned up on unmount
- Previous active element is restored on close

## Testing Checklist

- [ ] Modal opens and closes correctly
- [ ] Tab navigation works within modal
- [ ] Shift+Tab works within modal
- [ ] ESC key closes modal
- [ ] Click on overlay closes modal (if enabled)
- [ ] Focus returns to trigger element on close
- [ ] Form validation works
- [ ] Loading state displays correctly
- [ ] Animations are smooth
- [ ] Mobile viewport works
- [ ] Screen reader announces modal title and description
- [ ] No console errors or warnings

## Future Enhancements

- [ ] Add scroll lock for mobile (prevent body scroll)
- [ ] Add nested modal support (stacking)
- [ ] Add animation customization options
- [ ] Add backdrop blur intensity control
- [ ] Add custom transition timing
