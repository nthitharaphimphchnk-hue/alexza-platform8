# Playground Chat History & Simulation Documentation

## Overview

The Playground now features a complete chat experience with message persistence, typing indicators, simulated API delays, and realistic error handling—all UI-only, no backend required.

## Features

### 1. Message Persistence

**Storage:** localStorage with key `alexza_chat_{projectId}`

**Data Structure:**
```typescript
interface ChatMessage {
  id: string;              // Unique message ID
  role: 'user' | 'assistant' | 'system';
  content: string;         // Message text
  timestamp: string;       // HH:MM format
  error?: boolean;         // Error flag
}
```

**Utilities:** `/client/src/lib/chatPersistence.ts`

- `getChatHistory(projectId)` - Load messages from localStorage
- `saveChatHistory(projectId, messages)` - Save messages
- `addMessage(projectId, role, content, error)` - Add single message
- `clearChatHistory(projectId)` - Clear all messages
- `initializeChatIfEmpty(projectId)` - Initialize with welcome message

### 2. Typing Indicator

**Component:** `/client/src/components/TypingIndicator.tsx`

**Features:**
- Animated dots (3 dots, staggered animation)
- Monochrome metallic styling (silver #c0c0c0)
- Smooth fade-in/out
- Framer Motion powered

**Usage:**
```tsx
{msg.id === "typing" && <TypingIndicator />}
```

### 3. Simulated API

**Module:** `/client/src/lib/simulatedAPI.ts`

**Behavior:**
- Random delay: 600-1800ms
- 10% failure rate
- Mock response templates (8 variations)
- Error messages (5 variations)

**Function:**
```typescript
async function simulateAPICall(): Promise<SimulatedResponse> {
  // Returns: { content, delay, isError, errorMessage? }
}
```

### 4. Error Handling

**Error Display:**
- Red border: `border-red-500/30`
- Red background: `bg-red-500/10`
- Red text: `text-red-400`
- Error icon: AlertCircle

**Error Cases:**
- API failure (10% random)
- Insufficient credits (blocks action)
- Invalid input (empty message)

**Toast Notifications:**
- Success: "Done" + credits used
- Error: "API Error" + error message
- Loading: "Running..."

### 5. Clear Chat

**Component:** ConfirmDialog with danger styling

**Behavior:**
- Requires explicit confirmation
- Clears localStorage
- Reinitializes with welcome message
- Shows success toast

## Integration with Credits

### Before Run
1. Calculate estimated credits
2. Check if sufficient credits available
3. If insufficient: show error toast + block action
4. If sufficient: proceed to run

### On Run
1. Deduct credits from global store
2. Add message to chat (user)
3. Show typing indicator
4. Simulate API call (with delay)
5. Remove typing indicator
6. Add response to chat (assistant or error)
7. Update credits badge in realtime
8. Show success/error toast

### Credits Deduction
- Playground: `(2 + ceil(charCount/500)) × modeMultiplier`
- Example: 1000 chars, Normal mode = 4 credits

## Data Flow

```
User Types Message
    ↓
User Presses Enter/Send
    ↓
Check Credits Available
    ├─ Insufficient → Error Toast + Block
    └─ Sufficient → Proceed
    ↓
Deduct Credits
    ↓
Add User Message to Chat
    ↓
Show Typing Indicator
    ↓
Simulate API Call (600-1800ms delay)
    ├─ 90% Success → Generate Response
    └─ 10% Failure → Generate Error
    ↓
Remove Typing Indicator
    ↓
Add Assistant/Error Message to Chat
    ↓
Save to localStorage
    ↓
Show Success/Error Toast
    ↓
Update Credits Badge
```

## Testing Checklist

- [ ] Type message, press Enter → message appears
- [ ] Typing indicator shows while waiting
- [ ] Response appears after delay (600-1800ms)
- [ ] Timestamp shows correct time
- [ ] Credits deduct on successful run
- [ ] Insufficient credits blocks run
- [ ] ~10% of runs fail with error message
- [ ] Error message shows red styling + icon
- [ ] Refresh page → messages persist
- [ ] Clear chat → all messages removed + welcome message back
- [ ] Clear chat confirmation works
- [ ] Success toast shows credits used
- [ ] Error toast shows error message

## Browser Compatibility

- localStorage: All modern browsers
- Framer Motion: All modern browsers
- CSS Grid/Flexbox: All modern browsers

## Performance Notes

- Messages stored in localStorage (max ~5-10MB per domain)
- Typing indicator uses Framer Motion (GPU accelerated)
- No external API calls (all simulated)
- Minimal re-renders (React hooks optimization)

## Future Enhancements

1. **Message Search** - Search through chat history
2. **Export Chat** - Download conversation as PDF/JSON
3. **Multi-thread** - Support multiple chat threads per project
4. **Message Editing** - Edit sent messages
5. **Reactions** - Add emoji reactions to messages
6. **Real API Integration** - Replace simulateAPICall with actual API
7. **Streaming Responses** - Stream response tokens as they arrive
8. **Voice Input** - Speech-to-text for messages
