# Story 5.4: Display Rate Limit Status

Status: ready-for-dev

## Story

As a **user**,
I want **to understand why downloads pause sometimes**,
so that **I don't think the app is broken**.

## Acceptance Criteria

1. **Given** the download queue encounters a rate limit (FR14)
   **When** the pause begins
   **Then** an inline banner appears: "Brief pause -- SoundCloud rate limit (this is normal)" (UX-3)
   **And** the banner uses warning color (#F59E0B) with amber background
   **And** the current track shows "Waiting..." status

2. **Given** the rate limit banner is displayed
   **When** the user views it
   **Then** the message frames the pause as expected behavior
   **And** no alarm or panic-inducing language is used
   **And** optional: a small timer or "resuming soon" indicator

3. **Given** the rate limit clears
   **When** downloads resume
   **Then** the banner auto-dismisses
   **And** the track status returns to "Downloading..."
   **And** the transition is smooth (no jarring UI change)

4. **Given** multiple rate limits occur
   **When** pauses happen repeatedly
   **Then** the banner reappears each time
   **And** the messaging remains consistent and calm

## Tasks / Subtasks

- [ ] Task 1: Extend queue store for rate limit state (AC: #1)
  - [ ] 1.1 Add `isRateLimited: boolean` to `QueueState` interface
  - [ ] 1.2 Add `rateLimitedAt: number | null` timestamp for optional timer display
  - [ ] 1.3 Add `setRateLimited: (isLimited: boolean) => void` action
  - [ ] 1.4 Export rate limit selectors from store

- [ ] Task 2: Create RateLimitBanner component (AC: #1, #2)
  - [ ] 2.1 Create `src/components/features/progress/RateLimitBanner.tsx`
  - [ ] 2.2 Use Shadcn Alert component as base (search registry first)
  - [ ] 2.3 Style with warning color (#F59E0B) and amber background
  - [ ] 2.4 Display message: "Brief pause -- SoundCloud rate limit (this is normal)"
  - [ ] 2.5 Add Clock or Pause icon from lucide-react
  - [ ] 2.6 Ensure message uses i18n key: `download.rateLimitMessage`

- [ ] Task 3: Add i18n translations for rate limit (AC: #1, #2)
  - [ ] 3.1 Add to `src/locales/en.json`:
    ```json
    "download": {
      "rateLimitMessage": "Brief pause -- SoundCloud rate limit (this is normal)",
      "rateLimitStatus": "Waiting...",
      "resumingSoon": "Resuming soon..."
    }
    ```
  - [ ] 3.2 Add to `src/locales/fr.json`:
    ```json
    "download": {
      "rateLimitMessage": "Courte pause -- limite SoundCloud (c'est normal)",
      "rateLimitStatus": "En attente...",
      "resumingSoon": "Reprise imminente..."
    }
    ```

- [ ] Task 4: Subscribe to rate limit events (AC: #1, #3)
  - [ ] 4.1 Listen for `download-progress` events with `status: 'rate_limited'` or error code `RATE_LIMITED`
  - [ ] 4.2 Update queue store when rate limit detected
  - [ ] 4.3 Update queue store when rate limit clears (next progress event)
  - [ ] 4.4 Handle rate limit state in `useDownloadProgress` hook

- [ ] Task 5: Update TrackCard for "Waiting..." status (AC: #1)
  - [ ] 5.1 Add conditional rendering for rate-limited state
  - [ ] 5.2 Show "Waiting..." text with amber/warning styling
  - [ ] 5.3 Use pause or clock icon instead of spinner during rate limit
  - [ ] 5.4 Ensure text uses i18n key: `download.rateLimitStatus`

- [ ] Task 6: Implement banner auto-dismiss behavior (AC: #3)
  - [ ] 6.1 Banner shows only when `isRateLimited === true`
  - [ ] 6.2 Banner auto-hides when rate limit clears (no manual dismiss needed)
  - [ ] 6.3 Add CSS transition for smooth appear/disappear (fade or slide)
  - [ ] 6.4 Ensure no layout shift when banner appears/disappears

- [ ] Task 7: Handle multiple rate limit occurrences (AC: #4)
  - [ ] 7.1 Banner reappears on each new rate limit event
  - [ ] 7.2 No "don't show again" option -- always show for transparency
  - [ ] 7.3 Counter state resets between rate limits

- [ ] Task 8: Accessibility compliance (AC: #1, #2, #3)
  - [ ] 8.1 Add `role="status"` and `aria-live="polite"` to banner
  - [ ] 8.2 Ensure screen reader announces rate limit message
  - [ ] 8.3 Announce when downloads resume
  - [ ] 8.4 Warning icon paired with text (not color-only)

- [ ] Task 9: Test rate limit display (AC: #1, #2, #3, #4)
  - [ ] 9.1 Write unit test for RateLimitBanner visibility toggle
  - [ ] 9.2 Write unit test for banner content and styling
  - [ ] 9.3 Write unit test for TrackCard "Waiting..." state
  - [ ] 9.4 Write integration test for event subscription flow

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates a **presentation-only component** with a thin hook. Following the custom hooks architecture:
- `RateLimitBanner` is a presentation component receiving `isRateLimited` as prop
- Create `useRateLimitStatus` hook to subscribe to rate limit events and update store
- Place hook in `src/hooks/download/useRateLimitStatus.ts`
- Component renders based on hook return value — no direct event handling

**Hook pattern:**
```typescript
// src/hooks/download/useRateLimitStatus.ts
export function useRateLimitStatus() {
  const isRateLimited = useQueueStore(state => state.isRateLimited);
  // Subscribe to rate-limit events from backend
  // Return { isRateLimited, rateLimitedAt }
}
```

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### RateLimitBanner Component Design

**From UX Specification:**
```
RateLimitBanner
Purpose: Inline rate limit status message
Content: "Brief pause -- SoundCloud rate limit (this is normal)"
Behavior: Amber background, auto-dismiss on resume
```
[Source: ux-design-specification.md#Custom Components]

**Visual Design:**
- Warning color: `#F59E0B` (amber)
- Background: Light amber (`bg-amber-50` or similar)
- Border: Amber accent (`border-amber-200`)
- Icon: Clock or Pause icon in amber
- Text: Dark amber or neutral for contrast

**Component Structure:**
```tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function RateLimitBanner() {
  const { t } = useTranslation();

  return (
    <Alert
      className="bg-amber-50 border-amber-200"
      role="status"
      aria-live="polite"
    >
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        {t('download.rateLimitMessage')}
      </AlertDescription>
    </Alert>
  );
}
```

### Warning Color (#F59E0B) Usage

**From UX Specification Color System:**
| Role | Hex | Purpose |
|------|-----|---------|
| Warning | #F59E0B | Rate limits, geo-blocks -- informed, not alarmed |

**Tailwind Classes:**
- Background: `bg-amber-50` (light) or `bg-amber-100`
- Border: `border-amber-200` or `border-amber-300`
- Icon: `text-amber-600`
- Text: `text-amber-800` (dark for contrast)

[Source: ux-design-specification.md#Semantic Colors]

### i18n Key Structure

**Namespace:** `download`
**Keys:**
```json
{
  "download": {
    "rateLimitMessage": "Brief pause -- SoundCloud rate limit (this is normal)",
    "rateLimitStatus": "Waiting...",
    "resumingSoon": "Resuming soon..."
  }
}
```

**French Translation:**
```json
{
  "download": {
    "rateLimitMessage": "Courte pause -- limite SoundCloud (c'est normal)",
    "rateLimitStatus": "En attente...",
    "resumingSoon": "Reprise imminente..."
  }
}
```

[Source: project-context.md#react-i18next]

### Event Subscription Pattern

**From Architecture:**
The rate limit status comes through the Tauri event system. The `download-progress` event payload includes:

```typescript
// download-progress event payload
{
  trackId: string;
  status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
  percent: number;
  error?: { code: string; message: string };
}
```

**Rate Limit Detection:**
Option A: Dedicated status value `status: 'rate_limited'` (if backend supports)
Option B: Error code check `error.code === 'RATE_LIMITED'`

**Implementation in useDownloadProgress hook:**
```typescript
// In src/hooks/useDownloadProgress.ts
import { listen } from '@tauri-apps/api/event';
import { useQueueStore } from '@/stores/queueStore';

export function useDownloadProgress() {
  const setRateLimited = useQueueStore((state) => state.setRateLimited);

  useEffect(() => {
    const unlisten = listen('download-progress', (event) => {
      const payload = event.payload as DownloadProgressPayload;

      // Detect rate limit
      if (payload.error?.code === 'RATE_LIMITED') {
        setRateLimited(true);
      } else if (payload.status === 'downloading') {
        // Rate limit cleared when downloading resumes
        setRateLimited(false);
      }
    });

    return () => { unlisten.then(fn => fn()); };
  }, [setRateLimited]);
}
```

[Source: project-context.md#Tauri IPC]

### Auto-Dismiss Behavior

**Requirements:**
1. Banner appears immediately when rate limit detected
2. Banner disappears automatically when downloads resume
3. No manual dismiss button needed (event-driven)
4. Smooth CSS transition for appearance/disappearance

**Transition Implementation:**
```tsx
// Using Tailwind + conditional rendering
<div className={cn(
  "transition-all duration-300 ease-in-out",
  isRateLimited
    ? "opacity-100 max-h-20"
    : "opacity-0 max-h-0 overflow-hidden"
)}>
  <RateLimitBanner />
</div>
```

**Alternative with AnimatePresence (if framer-motion available):**
```tsx
<AnimatePresence>
  {isRateLimited && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <RateLimitBanner />
    </motion.div>
  )}
</AnimatePresence>
```

### Queue Store Extensions

**Add to `src/stores/queueStore.ts`:**
```typescript
interface QueueState {
  // Existing state...
  tracks: Track[];
  currentIndex: number;

  // New rate limit state
  isRateLimited: boolean;
  rateLimitedAt: number | null;

  // Existing actions...
  setTracks: (tracks: Track[]) => void;
  updateTrackStatus: (id: string, status: Track['status'], error?: Track['error']) => void;
  clearQueue: () => void;

  // New rate limit action
  setRateLimited: (isLimited: boolean) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  // Existing state...
  tracks: [],
  currentIndex: 0,

  // New rate limit state
  isRateLimited: false,
  rateLimitedAt: null,

  // New action
  setRateLimited: (isLimited) => set({
    isRateLimited: isLimited,
    rateLimitedAt: isLimited ? Date.now() : null
  }),

  // Existing actions...
}));
```

### Anti-Patterns to Avoid

1. **Do NOT use alarming language** -- "ERROR", "FAILED", "PROBLEM" are wrong tone
2. **Do NOT require manual dismiss** -- auto-dismiss on resume is required
3. **Do NOT hide rate limit from user** -- transparency builds trust
4. **Do NOT use red/error color** -- warning (amber) is appropriate, not error (red)
5. **Do NOT create custom error codes** -- use defined `RATE_LIMITED` code
6. **Do NOT block UI interaction** -- banner is informational, not modal

[Source: project-context.md#Anti-Patterns to Avoid]

### UX Messaging Principles

**From UX Specification:**
> Rate limit messaging inline keeps context without modal interruption.
> "Brief pause -- SoundCloud rate limit (this is normal)" frames pause as expected behavior.

**Key Principles:**
1. Frame as expected, not exceptional
2. Use "pause" not "stop" or "error"
3. Include "(this is normal)" to preempt user concern
4. No countdown timers (creates anxiety) -- optional "resuming soon" is OK

[Source: ux-design-specification.md#Design Rationale]

### Testing Checklist

**Unit Tests:**
- [ ] RateLimitBanner renders correct message
- [ ] RateLimitBanner uses correct colors (amber theme)
- [ ] RateLimitBanner has correct ARIA attributes
- [ ] Banner shows when `isRateLimited === true`
- [ ] Banner hides when `isRateLimited === false`
- [ ] TrackCard shows "Waiting..." during rate limit
- [ ] TrackCard shows correct icon during rate limit

**Integration Tests:**
- [ ] Rate limit event triggers banner appearance
- [ ] Resume event triggers banner disappearance
- [ ] Multiple rate limits show/hide banner correctly
- [ ] Transition animation is smooth

**Accessibility Tests:**
- [ ] Screen reader announces rate limit message
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Status conveyed by icon + text, not color alone

### File Structure After This Story

```
src/
├── components/
│   └── features/
│       └── progress/
│           ├── RateLimitBanner.tsx    # NEW
│           ├── TrackCard.tsx          # MODIFIED (add rate limit state)
│           └── index.ts               # MODIFIED (export RateLimitBanner)
├── stores/
│   └── queueStore.ts                  # MODIFIED (add rate limit state)
├── hooks/
│   └── useDownloadProgress.ts         # MODIFIED (handle rate limit events)
├── locales/
│   ├── en.json                        # MODIFIED (add rate limit keys)
│   └── fr.json                        # MODIFIED (add rate limit keys)
└── ...
```

### Dependencies on Other Stories

**Requires Completion:**
- Story 5.1: Create Track List Component (TrackCard exists)
- Story 5.2: Implement Per-Track Status Display (status icons exist)
- Story 5.5: Subscribe to Backend Progress Events (event subscription exists)
- Story 1.4: Configure Zustand Stores (queueStore exists)
- Story 1.5: Configure react-i18next Foundation (i18n setup exists)

**Note:** If dependencies are not complete, this story creates the rate limit UI components but may need to mock event subscriptions until Story 5.5 is done.

### Shadcn Component Check

**Required Components:**
- Alert (for banner) -- verify via Shadcn MCP: `@shadcn/alert`

**Before Implementation:**
1. Check if Alert is installed: `ls src/components/ui/alert.tsx`
2. If not installed: `npx shadcn@latest add alert`

### References

- [Source: epics.md#Story 5.4: Display Rate Limit Status]
- [Source: ux-design-specification.md#RateLimitBanner Custom Component]
- [Source: ux-design-specification.md#Semantic Colors - Warning]
- [Source: project-context.md#Error Codes - RATE_LIMITED]
- [Source: architecture/implementation-patterns-consistency-rules.md#Event Payloads]
- [Source: prd.md#FR14 - Rate Limit Status Display]
- [Source: prd.md#UX-3 - Rate Limit Reassuring Message]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

