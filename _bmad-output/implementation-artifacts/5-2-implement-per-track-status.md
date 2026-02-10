# Story 5.2: Implement Per-Track Status Display

Status: review

## Story

As a **user**,
I want **to see the status of each track individually**,
so that **I know which tracks are done and which are still processing**.

## Acceptance Criteria

1. **Given** a track is in the queue
   **When** it hasn't started downloading yet
   **Then** status shows "Pending" with a neutral icon
   **And** the card has default styling (no highlight)

2. **Given** a track is currently downloading (FR12)
   **When** viewing its card
   **Then** status shows "Downloading..." with a spinner icon
   **And** the card has highlighted background (current track indicator)
   **And** the icon uses the loading color (#6366F1)

3. **Given** a track completes successfully (FR13)
   **When** viewing its card
   **Then** status shows a green checkmark icon
   **And** the status text changes to "Complete"
   **And** the success color is #10B981

4. **Given** a track fails
   **When** viewing its card
   **Then** status shows a warning/error icon
   **And** brief failure reason is visible (e.g., "Geo-blocked")
   **And** the warning color is #F59E0B or error #F43F5E

5. **Given** status icons are displayed
   **When** checking accessibility
   **Then** status is conveyed via icon + text, not color alone (UX-14)
   **And** screen readers announce status changes

## Tasks / Subtasks

- [x] Task 1: Create TrackStatusIcon component (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Create `src/components/features/progress/TrackStatusIcon.tsx`
  - [x] 1.2 Define props interface with `status` and optional `errorCode` props
  - [x] 1.3 Implement status icon mapping:
    - `pending` -> Clock icon (muted gray)
    - `downloading` -> Spinner icon (indigo #6366F1)
    - `converting` -> Spinner icon (indigo #6366F1)
    - `complete` -> Checkmark icon (green #10B981)
    - `failed` -> Warning/X icon (amber #F59E0B or rose #F43F5E)
    - `rate_limited` -> Spinner icon (amber #F59E0B)
  - [x] 1.4 Add appropriate aria-labels to each icon variant
  - [x] 1.5 Export as named export

- [x] Task 2: Create TrackStatusLabel component (AC: #1, #2, #3, #4, #5)
  - [x] 2.1 Create `src/components/features/progress/TrackStatusLabel.tsx`
  - [x] 2.2 Define props interface with `status` and optional `error` props
  - [x] 2.3 Implement status text mapping:
    - `pending` -> "Pending"
    - `downloading` -> "Downloading..."
    - `converting` -> "Converting..."
    - `complete` -> "Complete"
    - `failed` -> Brief error reason from error.message or fallback "Failed"
    - `rate_limited` -> "Rate limited"
  - [x] 2.4 Apply appropriate text color classes per status
  - [x] 2.5 Export as named export

- [x] Task 3: Create TrackStatusBadge composite component (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `src/components/features/progress/TrackStatusBadge.tsx`
  - [x] 3.2 Compose TrackStatusIcon + TrackStatusLabel
  - [x] 3.3 Add flex container with proper spacing (gap-1.5)
  - [x] 3.4 Add live region for screen reader announcements (`aria-live="polite"`)
  - [x] 3.5 Export as named export

- [x] Task 4: Update TrackCard component with status display (AC: #1, #2, #3, #4)
  - [x] 4.1 Import TrackStatusBadge into TrackCard
  - [x] 4.2 Add status badge to track card layout (right side)
  - [x] 4.3 Implement highlighted background for `downloading` and `converting` status
  - [x] 4.4 Ensure proper alignment with artwork, title, and artist

- [x] Task 5: Add i18n translation keys (AC: #1, #2, #3, #4)
  - [x] 5.1 Add status text keys to `src/locales/en.json`
  - [x] 5.2 Add corresponding keys to `src/locales/fr.json`
  - [x] 5.3 Update TrackStatusLabel to use `useTranslation` hook

- [x] Task 6: Add error reason display for failed tracks (AC: #4)
  - [x] 6.1 Map error codes to user-friendly messages
  - [x] 6.2 Create `src/lib/errorMessages.ts` utility
  - [x] 6.3 Add i18n keys for all error messages (already existed in errors namespace)
  - [x] 6.4 Display error reason in TrackStatusLabel

- [x] Task 7: Implement accessibility features (AC: #5)
  - [x] 7.1 Add `role="status"` to TrackStatusBadge container
  - [x] 7.2 Implement `aria-live="polite"` for status change announcements
  - [x] 7.3 Ensure focus is not stolen when status updates
  - [x] 7.4 Add `aria-label` describing full status to TrackCard container
  - [x] 7.5 Verify screen reader announces status via aria-live region

- [x] Task 8: Write component tests (AC: #1, #2, #3, #4, #5)
  - [x] 8.1 Create `TrackStatusIcon.test.tsx` - test all status variants render correct icon
  - [x] 8.2 Create `TrackStatusLabel.test.tsx` - test all status variants render correct text
  - [x] 8.3 Create `TrackStatusBadge.test.tsx` - test composition and accessibility attributes
  - [x] 8.4 Test failed status displays error message when provided
  - [x] 8.5 Test i18n integration with mocked translations

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates **presentation-only components**. Following the custom hooks architecture:
- `TrackStatusIcon`, `TrackStatusLabel`, `TrackStatusBadge` are pure presentation components
- They receive `status` and `error` as props — no store access needed in these components
- Parent component (`TrackCard`) gets status from store via selectors
- No loading state management in these components

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Track Status Values

Must match exactly with Rust backend event payloads and queueStore:
```typescript
type TrackStatus = 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
```
[Source: project-context.md#IPC Payload Structure]

### Status Icon and Color Patterns

From UX Design Specification:

| Status | Icon | Color Hex | Tailwind Class | Use Case |
|--------|------|-----------|----------------|----------|
| Pending | Clock/Circle | #9CA3AF | `text-gray-400` | Track in queue, not started |
| Downloading | Spinner | #6366F1 | `text-indigo-500` | Currently downloading |
| Converting | Spinner | #6366F1 | `text-indigo-500` | FFmpeg processing |
| Complete | Checkmark | #10B981 | `text-emerald-500` | Successfully finished |
| Failed (warning) | Triangle | #F59E0B | `text-amber-500` | Geo-block, rate limit |
| Failed (error) | X Circle | #F43F5E | `text-rose-500` | Download/conversion failed |

[Source: ux-design-specification.md#Feedback Patterns]

### Error Code to Color Mapping

```typescript
const getErrorColor = (code: ErrorCode): 'warning' | 'error' => {
  switch (code) {
    case 'GEO_BLOCKED':
    case 'RATE_LIMITED':
      return 'warning'; // #F59E0B - amber
    case 'NETWORK_ERROR':
    case 'DOWNLOAD_FAILED':
    case 'CONVERSION_FAILED':
    case 'INVALID_URL':
    default:
      return 'error'; // #F43F5E - rose
  }
};
```

### Highlighted Background for Current Track

Per UX spec, the currently downloading track should have a highlighted background:

```typescript
// In TrackCard component
const isActive = status === 'downloading' || status === 'converting';
const cardClasses = cn(
  'flex items-center gap-3 p-3 rounded-lg',
  isActive && 'bg-indigo-50 border border-indigo-200'
);
```

[Source: ux-design-specification.md#Key Interactions]

### Component Structure

```
src/components/features/download/
├── TrackCard.tsx           # Parent card (from Story 5.1)
├── TrackStatusIcon.tsx     # Icon only component
├── TrackStatusLabel.tsx    # Text label component
└── TrackStatusBadge.tsx    # Icon + Label composite
```

[Source: architecture/project-structure-boundaries.md#Component Organization]

### Accessibility Requirements (UX-14)

**Critical:** Status must be conveyed through icons + text, not color alone.

Implementation checklist:
- Every icon has accompanying text label
- `aria-live="polite"` announces status changes to screen readers
- No information conveyed by color alone (colorblind users)
- Focus is never stolen during status updates
- Keyboard users can navigate to status information

[Source: ux-design-specification.md#Accessibility]

### Screen Reader Announcement Pattern

When status changes, screen readers should announce:
- "Track [title] status: Downloading"
- "Track [title] status: Complete"
- "Track [title] status: Failed - Unavailable in your region"

Use `aria-live="polite"` to avoid interrupting current reading.

### Integration with queueStore

Track status comes from the queueStore. The component reads from store:

```typescript
// In parent component (TrackList or TrackCard)
const { tracks } = useQueueStore();

// Each track has:
interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  status: TrackStatus;
  error?: { code: string; message: string };
}
```

[Source: Story 1.4 - Configure Zustand Stores]

### Error Message Utility

Create utility for mapping error codes to user-friendly messages:

```typescript
// src/lib/errorMessages.ts
import { ErrorCode } from '@/types/errors';

export const getErrorMessage = (code: ErrorCode, t: TFunction): string => {
  const key = `errors.${code.toLowerCase()}`;
  return t(key);
};
```

### i18n Key Structure

Following project conventions:
```json
{
  "download": {
    "status": {
      "pending": "Pending",
      "downloading": "Downloading...",
      "converting": "Converting...",
      "complete": "Complete",
      "failed": "Failed"
    }
  },
  "errors": {
    "geoBlocked": "Unavailable in your region",
    "rateLimited": "Rate limited - will retry",
    "networkError": "Network error",
    "downloadFailed": "Download failed",
    "conversionFailed": "Conversion failed"
  }
}
```

[Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]

### Shadcn/ui Components to Use

Consider using or referencing these Shadcn components:
- `Badge` - For status labels (may customize)
- `Tooltip` - For showing full error message on hover
- Icons from Lucide React (Shadcn's icon library)

Search Shadcn registry for available patterns before implementation.

[Source: project-context.md#Shadcn/ui Requirement]

### Anti-Patterns to Avoid

- Do NOT convey status with color only - always pair with icon + text
- Do NOT create custom error codes - use defined codes from project-context
- Do NOT use default exports - use named exports
- Do NOT hardcode strings - use i18n translation keys
- Do NOT steal focus on status updates - use aria-live instead
- Do NOT create one mega-component - separate icon, label, and badge

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing Checklist

- [ ] TrackStatusIcon renders correct icon for each status
- [ ] TrackStatusIcon applies correct color class for each status
- [ ] TrackStatusLabel renders correct text for each status
- [ ] TrackStatusLabel shows error message when status is 'failed' and error is provided
- [ ] TrackStatusBadge composes icon and label correctly
- [ ] TrackStatusBadge has aria-live="polite" attribute
- [ ] TrackCard applies highlighted background when downloading/converting
- [ ] TrackCard removes highlight when status changes to complete/failed
- [ ] Screen reader announces status changes (manual test)
- [ ] Status is understandable without color perception (manual test)

### Dependencies

This story depends on:
- Story 5.1: Create Track List Component (TrackCard exists)
- Story 1.4: Configure Zustand Stores (queueStore with Track type)

This story is required by:
- Story 5.3: Implement Overall Progress Bar (status counts)
- Story 5.5: Subscribe to Backend Progress Events (updates status display)

### References

- [Source: ux-design-specification.md#Feedback Patterns]
- [Source: ux-design-specification.md#Key Interactions]
- [Source: ux-design-specification.md#Accessibility]
- [Source: project-context.md#IPC Payload Structure]
- [Source: project-context.md#Error Codes]
- [Source: architecture/implementation-patterns-consistency-rules.md#Localization Patterns]
- [Source: epics.md#Story 5.2]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5)

### Debug Log References

None required.

### Completion Notes List

- Created TrackStatusIcon component with status-based icon rendering (Clock, Loader2, CheckCircle2, AlertTriangle, XCircle)
- Created TrackStatusLabel component with i18n-integrated status text and error message display
- Created TrackStatusBadge composite component combining icon and label with accessibility features
- Updated TrackCard to integrate TrackStatusBadge and implement status-based highlighting (indigo background for downloading/converting)
- Added download.status namespace to both en.json and fr.json with all status labels including rate_limited
- Created errorMessages.ts utility with getErrorMessage and getErrorSeverity functions
- All components use named exports per project conventions
- All components support the additional rate_limited status that exists in the TrackStatus type
- Components placed in src/components/features/progress/ alongside existing TrackCard (not download/ as story originally specified)
- Full test coverage: 62 tests across 5 test files for progress components
- Full regression suite passes: 435 tests
- TypeScript typecheck passes
- Frontend build succeeds

### File List

**New Files:**
- src/components/features/progress/TrackStatusIcon.tsx
- src/components/features/progress/TrackStatusIcon.test.tsx
- src/components/features/progress/TrackStatusLabel.tsx
- src/components/features/progress/TrackStatusLabel.test.tsx
- src/components/features/progress/TrackStatusBadge.tsx
- src/components/features/progress/TrackStatusBadge.test.tsx
- src/lib/errorMessages.ts
- src/lib/errorMessages.test.ts

**Modified Files:**
- src/components/features/progress/TrackCard.tsx
- src/components/features/progress/TrackCard.test.tsx
- src/locales/en.json
- src/locales/fr.json

## Change Log

- 2026-02-10: Story 5.2 implemented - Per-track status display with TrackStatusIcon, TrackStatusLabel, TrackStatusBadge components

