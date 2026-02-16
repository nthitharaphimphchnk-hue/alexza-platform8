# ALEXZA AI Credits System Documentation

## Overview

The Credits System is a **UI-only simulation** of a credits-based consumption model. It uses React Context for global state management with localStorage persistence.

## Architecture

### Global Store (CreditsContext)

Located at: `/client/src/contexts/CreditsContext.tsx`

**State:**
- `creditsRemaining`: Current available credits (number)
- `selectedMode`: Active mode (Normal/Pro/Premium)
- `transactions`: Full transaction ledger (array)

**Methods:**
- `deductCredits(amount, description)`: Deduct credits, returns boolean (success/fail)
- `addCredits(amount, description, type)`: Add credits with transaction
- `setSelectedMode(mode)`: Switch between modes
- `getModeMultiplier()`: Get current mode multiplier (1x/2x/4x)
- `resetCredits()`: Clear all state and localStorage

**Persistence:**
- Automatically saves to localStorage on state change
- Loads from localStorage on app mount
- Key: `alexza_credits_state`

## Mode System

| Mode | Multiplier | Description |
|------|-----------|-------------|
| Normal | 1x | Standard cost |
| Pro | 2x | 2x cost, 2x faster |
| Premium | 4x | 4x cost, 4x faster, priority |

**Mode Selector Component:** `/client/src/components/ModeSelector.tsx`

## Credits Estimation

### Playground Estimation

Formula: `(base + sizeFactor) × modeMultiplier`

- **base**: 2 credits
- **sizeFactor**: `ceil(charCount / 500)`
- **modeMultiplier**: 1x, 2x, or 4x

**Example:**
- Input: 1000 chars, Normal mode
- Calculation: (2 + ceil(1000/500)) × 1 = (2 + 2) × 1 = **4 credits**

### AI Builder Estimation

Fixed cost: `1 × modeMultiplier`

- Normal: 1 credit
- Pro: 2 credits
- Premium: 4 credits

**Utility:** `/client/src/lib/creditsEstimator.ts`

## Integration Points

### Playground (`/pages/Playground.tsx`)

**On message send:**
1. Calculate estimated credits
2. Check if sufficient credits available
3. If insufficient: show error toast + block action
4. If sufficient: deduct credits, show loading toast
5. On completion: show success toast with credits used

**UI Features:**
- Estimation display before send
- Insufficient credits warning (red alert)
- Disabled input/button during execution
- Real-time credits badge update

### AI Builder / ChatBuilder (`/pages/ChatBuilder.tsx`)

**On "Apply API" click:**
1. Calculate estimated credits (fixed 1 × multiplier)
2. Check if sufficient credits
3. If insufficient: show error toast + show red alert
4. If sufficient: deduct credits, show success toast

**UI Features:**
- Credits badge in top bar (realtime)
- Insufficient credits warning below Apply button
- Disabled Apply button when insufficient

### Wallet (`/pages/Wallet.tsx`)

**Features:**
- Display current `creditsRemaining`
- Show full transaction history
- "Add Credits" modal with validation
- On add: deduct from mock payment, add to credits

**Transaction Display:**
- Description (e.g., "Playground run", "API Apply")
- Credits change (positive/negative)
- Date/time
- Type (usage, purchase, bonus, refund)

## Toast Notifications

**Success:**
- "Playground executed" - Credits used: X
- "API applied" - Used X credits
- "Credits added" - Added X credits

**Error:**
- "Insufficient credits" - Need X, have Y
- "Failed to deduct credits"

**Loading:**
- "Running playground..."
- "Running..."

**Utilities:** `/client/src/lib/toast.ts`

## Data Flow

```
User Action
    ↓
Check Credits Available
    ↓
├─ Insufficient → Error Toast + Block Action
└─ Sufficient → Deduct Credits
    ↓
Update Global State
    ↓
Save to localStorage
    ↓
UI Updates Automatically (via useCredits hook)
    ↓
Show Success Toast
```

## Testing

### Manual Testing Checklist

- [ ] Switch modes (Normal/Pro/Premium) - see multiplier change
- [ ] Playground: type text, see estimation update
- [ ] Playground: run with sufficient credits - deduct works
- [ ] Playground: deplete credits, try to run - error toast
- [ ] ChatBuilder: Apply API - deducts 1×multiplier credits
- [ ] Wallet: Add credits - updates balance + ledger
- [ ] Refresh page - credits persist (localStorage)
- [ ] Check transaction history - all actions logged

### Initial State

- Starting credits: **50,000**
- Starting mode: **Normal**
- Empty transaction history

## Future Enhancements

1. **Backend Integration**
   - Replace localStorage with API calls
   - Real Stripe payment integration
   - Server-side credit validation

2. **Advanced Features**
   - Credit packages (starter, pro, enterprise)
   - Auto-refill on low balance
   - Usage alerts and warnings
   - Monthly credit reset

3. **Analytics**
   - Credits spent per feature
   - Cost breakdown by mode
   - Usage trends

4. **Billing**
   - Invoice generation
   - Payment history
   - Subscription management
