# Story 7.3: Create Error Panel Component

Status: ready-for-dev

## Story

As a **user**,
I want **to review all failed tracks in one place**,
so that **I can understand what didn't download and why**.

## Acceptance Criteria (FR18)

1. **Given** one or more tracks failed during download (FR18)
   **When** the download completes
   **Then** an "X tracks failed" indicator is visible
   **And** the indicator is clickable/expandable

2. **Given** the user expands the error panel
   **When** viewing the contents
   **Then** a list of all failed tracks is shown
   **And** each entry shows: track title, artist, failure reason

3. **Given** the error panel is displayed
   **When** viewing individual failures
   **Then** failures are grouped or sorted by reason type
   **And** the panel is scrollable if many failures exist

4. **Given** the error panel exists
   **When** checking accessibility
   **Then** the panel is keyboard navigable
   **And** screen readers can traverse the failure list
   **And** each failure reason is announced

5. **Given** no tracks failed
   **When** download completes
   **Then** no error panel or indicator is shown
   **And** only the success completion panel appears

6. **Given** the error panel is expanded
   **When** the user wants to dismiss it
   **Then** a close button or collapse action is available
   **And** the panel can be reopened if needed

## Tasks / Subtasks

- [ ] Task 1: Create ErrorPanelTrigger component (AC: #1, #5)
  - [ ] 1.1 Create `src/components/features/download/ErrorPanelTrigger.tsx`
  - [ ] 1.2 Accept `failedCount: number` prop
  - [ ] 1.3 Render nothing when `failedCount === 0` (AC #5)
  - [ ] 1.4 Render clickable indicator: "{X} tracks failed" with warning icon
  - [ ] 1.5 Use warning color (#F59E0B amber) for indicator
  - [ ] 1.6 Accept `onClick` callback for expand action
  - [ ] 1.7 Ensure button is keyboard accessible (Enter/Space to activate)
  - [ ] 1.8 Export as named export

- [ ] Task 2: Create ErrorPanel container component (AC: #2, #3, #6)
  - [ ] 2.1 Create `src/components/features/download/ErrorPanel.tsx`
  - [ ] 2.2 Accept `failedTracks: FailedTrack[]` prop with shape:
    ```typescript
    interface FailedTrack {
      id: string;
      title: string;
      artist: string;
      error: {
        code: string;
        message: string;
      };
    }
    ```
  - [ ] 2.3 Render panel header with count and close button
  - [ ] 2.4 Implement expand/collapse toggle state
  - [ ] 2.5 Use Shadcn Collapsible component for expand/collapse animation
  - [ ] 2.6 Ensure panel is scrollable when content exceeds max height
  - [ ] 2.7 Set max height to ~200px (approximately 4 failure entries)
  - [ ] 2.8 Export as named export

- [ ] Task 3: Implement failure grouping by reason (AC: #3)
  - [ ] 3.1 Create `src/lib/groupFailuresByReason.ts` utility
  - [ ] 3.2 Define failure reason categories:
    ```typescript
    type FailureReasonCategory =
      | 'geo_blocked'
      | 'unavailable'
      | 'network'
      | 'other';
    ```
  - [ ] 3.3 Implement grouping function:
    ```typescript
    export const groupFailuresByReason = (
      tracks: FailedTrack[]
    ): Map<FailureReasonCategory, FailedTrack[]>
    ```
  - [ ] 3.4 Map error codes to categories:
    - `GEO_BLOCKED` -> `geo_blocked`
    - `DOWNLOAD_FAILED` with unavailable message -> `unavailable`
    - `NETWORK_ERROR` -> `network`
    - All others -> `other`
  - [ ] 3.5 Export as named export

- [ ] Task 4: Create FailureGroup component (AC: #2, #3)
  - [ ] 4.1 Create `src/components/features/download/FailureGroup.tsx`
  - [ ] 4.2 Accept `category: FailureReasonCategory` and `tracks: FailedTrack[]` props
  - [ ] 4.3 Render group header with category label and count (e.g., "Unavailable in your region (3)")
  - [ ] 4.4 Render list of FailedTrackItem components for each track
  - [ ] 4.5 Use subtle divider between groups
  - [ ] 4.6 Export as named export

- [ ] Task 5: Create FailedTrackItem component (AC: #2)
  - [ ] 5.1 Create `src/components/features/download/FailedTrackItem.tsx`
  - [ ] 5.2 Accept `track: FailedTrack` prop
  - [ ] 5.3 Display track title (truncate with ellipsis if too long)
  - [ ] 5.4 Display artist name in muted text
  - [ ] 5.5 Display warning icon matching failure category color
  - [ ] 5.6 Ensure consistent spacing and alignment
  - [ ] 5.7 Export as named export

- [ ] Task 6: Implement keyboard navigation (AC: #4)
  - [ ] 6.1 Add `tabIndex={0}` to ErrorPanelTrigger
  - [ ] 6.2 Ensure expand/collapse responds to Enter and Space keys
  - [ ] 6.3 Ensure close button is focusable and keyboard accessible
  - [ ] 6.4 Implement focus trap when panel is expanded (optional, for modal-like behavior)
  - [ ] 6.5 Support Escape key to close/collapse panel
  - [ ] 6.6 Ensure Tab navigation flows through failure list items

- [ ] Task 7: Implement accessibility features (AC: #4)
  - [ ] 7.1 Add `role="region"` and `aria-label="Failed downloads"` to ErrorPanel
  - [ ] 7.2 Add `aria-expanded` attribute to ErrorPanelTrigger
  - [ ] 7.3 Add `aria-controls` linking trigger to panel content
  - [ ] 7.4 Use `role="list"` and `role="listitem"` for failure entries
  - [ ] 7.5 Announce panel expansion state changes with `aria-live="polite"`
  - [ ] 7.6 Ensure each failure reason is readable by screen readers
  - [ ] 7.7 Add `aria-label` to close button: "Close error panel"

- [ ] Task 8: Add i18n translation keys (AC: #2, #3, #4)
  - [ ] 8.1 Add error panel keys to `src/locales/en.json`:
    ```json
    "errors": {
      "panelTitle": "Failed Downloads",
      "tracksFailed": "{{count}} track failed",
      "tracksFailed_plural": "{{count}} tracks failed",
      "closePanel": "Close error panel",
      "groupGeoBlocked": "Unavailable in your region",
      "groupUnavailable": "Track removed or private",
      "groupNetwork": "Network errors",
      "groupOther": "Other errors"
    }
    ```
  - [ ] 8.2 Add corresponding keys to `src/locales/fr.json`:
    ```json
    "errors": {
      "panelTitle": "Telechargements echoues",
      "tracksFailed": "{{count}} piste echouee",
      "tracksFailed_plural": "{{count}} pistes echouees",
      "closePanel": "Fermer le panneau d'erreurs",
      "groupGeoBlocked": "Indisponible dans votre region",
      "groupUnavailable": "Piste supprimee ou privee",
      "groupNetwork": "Erreurs reseau",
      "groupOther": "Autres erreurs"
    }
    ```
  - [ ] 8.3 Use i18next pluralization for track count
  - [ ] 8.4 Update all components to use translation keys via `useTranslation` hook

- [ ] Task 9: Integrate ErrorPanel with CompletionPanel (AC: #1, #5)
  - [ ] 9.1 Import ErrorPanelTrigger and ErrorPanel into CompletionPanel
  - [ ] 9.2 Extract failed tracks from queue store
  - [ ] 9.3 Conditionally render ErrorPanelTrigger when `failedTracks.length > 0`
  - [ ] 9.4 Position error panel below success message, before "Open Folder" button
  - [ ] 9.5 Manage expanded state in CompletionPanel or via local state

- [ ] Task 10: Create useFailedTracks hook (AC: #1, #2)
  - [ ] 10.1 Create `src/hooks/useFailedTracks.ts`
  - [ ] 10.2 Subscribe to queue store and filter tracks with status `failed`
  - [ ] 10.3 Return typed array of FailedTrack objects:
    ```typescript
    export const useFailedTracks = (): FailedTrack[] => {
      const tracks = useQueueStore((state) => state.tracks);
      return tracks
        .filter((track) => track.status === 'failed')
        .map((track) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          error: track.error!
        }));
    };
    ```
  - [ ] 10.4 Export as named export

- [ ] Task 11: Write component and integration tests (AC: #1-6)
  - [ ] 11.1 Test ErrorPanelTrigger renders nothing when failedCount is 0
  - [ ] 11.2 Test ErrorPanelTrigger renders indicator when failedCount > 0
  - [ ] 11.3 Test ErrorPanelTrigger calls onClick when clicked
  - [ ] 11.4 Test ErrorPanel renders list of failed tracks
  - [ ] 11.5 Test ErrorPanel groups failures by reason category
  - [ ] 11.6 Test ErrorPanel scrolls when many failures exist
  - [ ] 11.7 Test ErrorPanel expand/collapse functionality
  - [ ] 11.8 Test keyboard navigation (Tab, Enter, Space, Escape)
  - [ ] 11.9 Test screen reader accessibility attributes
  - [ ] 11.10 Test i18n keys render in both English and French
  - [ ] 11.11 Test useFailedTracks hook returns correct failed tracks
  - [ ] 11.12 Test groupFailuresByReason utility categorizes correctly

## Dev Notes

### ErrorPanel Component Design

The ErrorPanel provides a consolidated view of all download failures, enabling users to understand what didn't download and why without cluttering the main progress view.

```
+--------------------------------------------------+
|  ! 3 tracks failed                        [v]    |  <- ErrorPanelTrigger (collapsed)
+--------------------------------------------------+

+--------------------------------------------------+
|  Failed Downloads                           [x]  |  <- Panel header with close
+--------------------------------------------------+
|  Unavailable in your region (2)                  |  <- FailureGroup header
|  ------------------------------------------------|
|  !  Artist Name - Track Title                    |  <- FailedTrackItem
|  !  Another Artist - Another Track               |
|                                                  |
|  Track removed or private (1)                    |  <- FailureGroup header
|  ------------------------------------------------|
|  !  Some Artist - Private Track                  |
+--------------------------------------------------+
```

[Source: ux-design-specification.md#Graceful Failure, epics.md#Story 7.3]

### Expandable/Collapsible Pattern

Use Shadcn's Collapsible component for smooth expand/collapse animation:

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const ErrorPanel = ({ failedTracks }: ErrorPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  if (failedTracks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-2 text-amber-600"
          aria-expanded={isOpen}
          aria-controls="error-panel-content"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>{t('errors.tracksFailed', { count: failedTracks.length })}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent id="error-panel-content">
        {/* Panel content */}
      </CollapsibleContent>
    </Collapsible>
  );
};
```

Search Shadcn registry for Collapsible component patterns before implementation.

[Source: project-context.md#Shadcn/ui Requirement]

### Failure Grouping by Reason

Group failures to help users understand patterns (e.g., "all these tracks are geo-blocked"):

```typescript
// src/lib/groupFailuresByReason.ts
import type { FailedTrack, FailureReasonCategory } from '@/types/download';

const categorizeError = (error: { code: string; message: string }): FailureReasonCategory => {
  if (error.code === 'GEO_BLOCKED') return 'geo_blocked';
  if (error.code === 'NETWORK_ERROR') return 'network';
  if (error.code === 'DOWNLOAD_FAILED') {
    const msg = error.message.toLowerCase();
    if (msg.includes('unavailable') || msg.includes('private') || msg.includes('removed')) {
      return 'unavailable';
    }
  }
  return 'other';
};

export const groupFailuresByReason = (
  tracks: FailedTrack[]
): Map<FailureReasonCategory, FailedTrack[]> => {
  const groups = new Map<FailureReasonCategory, FailedTrack[]>();

  for (const track of tracks) {
    const category = categorizeError(track.error);
    const existing = groups.get(category) || [];
    groups.set(category, [...existing, track]);
  }

  return groups;
};
```

[Source: project-context.md#Error Codes, epics.md#Story 7.1, Story 7.2]

### Keyboard Navigation Requirements

Per UX Design Specification, the error panel must support full keyboard navigation:

| Key | Action |
|-----|--------|
| Tab | Move focus forward through trigger, close button, and list items |
| Shift+Tab | Move focus backward |
| Enter/Space | Toggle expand/collapse on trigger, activate close button |
| Escape | Close/collapse the panel |

```tsx
// Keyboard handling example
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen) {
    setIsOpen(false);
    triggerRef.current?.focus(); // Return focus to trigger
  }
};
```

[Source: ux-design-specification.md#Keyboard Navigation (UX-12)]

### Accessibility Requirements

The error panel must meet WCAG 2.1 AA standards:

1. **Visible focus rings** on all interactive elements (UX-11)
2. **Screen reader announcements** for expansion state changes (UX-13)
3. **Semantic structure** with proper ARIA roles and labels
4. **Status conveyed through icons + text**, not color alone (UX-14)

```tsx
// Accessibility attributes
<div
  role="region"
  aria-label={t('errors.panelTitle')}
  aria-live="polite"
>
  <button
    aria-expanded={isOpen}
    aria-controls="error-panel-content"
    aria-label={t('errors.tracksFailed', { count: failedTracks.length })}
  >
    {/* Trigger content */}
  </button>
  <div id="error-panel-content" role="list">
    {/* List items with role="listitem" */}
  </div>
</div>
```

[Source: ux-design-specification.md#Accessibility (UX-10 through UX-14)]

### i18n Pluralization

Use i18next pluralization for track counts:

```json
// en.json
{
  "errors": {
    "tracksFailed": "{{count}} track failed",
    "tracksFailed_plural": "{{count}} tracks failed"
  }
}

// fr.json
{
  "errors": {
    "tracksFailed": "{{count}} piste echouee",
    "tracksFailed_plural": "{{count}} pistes echouees"
  }
}
```

```tsx
// Usage
const { t } = useTranslation();
const message = t('errors.tracksFailed', { count: failedTracks.length });
// count=1: "1 track failed" / "1 piste echouee"
// count=3: "3 tracks failed" / "3 pistes echouees"
```

[Source: project-context.md#react-i18next]

### Component File Structure

```
src/components/features/download/
├── TrackCard.tsx                # Existing (from Story 5.1)
├── TrackStatusBadge.tsx         # Existing (from Story 5.2)
├── CompletionPanel.tsx          # Existing (from Story 6.4) - UPDATE
├── ErrorPanel.tsx               # NEW - Main error panel container
├── ErrorPanelTrigger.tsx        # NEW - Clickable indicator
├── FailureGroup.tsx             # NEW - Grouped failures section
└── FailedTrackItem.tsx          # NEW - Individual failed track entry

src/lib/
├── errorMessages.ts             # Existing (from Story 7.1, 7.2)
└── groupFailuresByReason.ts     # NEW - Failure grouping utility

src/hooks/
├── useDownloadProgress.ts       # Existing (from Story 5.5)
└── useFailedTracks.ts           # NEW - Failed tracks hook
```

[Source: architecture/project-structure-boundaries.md#Component Organization]

### Visual Design Specifications

| Element | Style |
|---------|-------|
| Trigger text color | Warning amber (#F59E0B) |
| Trigger icon | AlertTriangle (amber) |
| Panel background | Surface white (#FFFFFF) |
| Panel border | Border gray (#E5E7EB) |
| Group header | Text primary (#111827), semibold |
| Track title | Text primary (#111827), truncate |
| Track artist | Text muted (#9CA3AF) |
| Close button | Ghost style, keyboard accessible |

[Source: ux-design-specification.md#Color System, Button Hierarchy]

### Error Panel State Management

The error panel state (open/closed) should be managed locally within CompletionPanel, not in global store:

```tsx
// In CompletionPanel.tsx
export const CompletionPanel = () => {
  const [isErrorPanelOpen, setIsErrorPanelOpen] = useState(false);
  const failedTracks = useFailedTracks();

  return (
    <div className="completion-panel">
      {/* Success message */}
      <SuccessMessage totalTracks={totalTracks} completedTracks={completedTracks} />

      {/* Error panel (conditionally rendered) */}
      {failedTracks.length > 0 && (
        <ErrorPanel
          failedTracks={failedTracks}
          isOpen={isErrorPanelOpen}
          onOpenChange={setIsErrorPanelOpen}
        />
      )}

      {/* Actions */}
      <CompletionActions />
    </div>
  );
};
```

[Source: project-context.md#Zustand]

### Shadcn/ui Components to Use

Search the Shadcn registry for these components before implementation:

- `Collapsible` - For expand/collapse animation
- `CollapsibleTrigger` - Trigger element
- `CollapsibleContent` - Animated content container
- `ScrollArea` - For scrollable list when many failures
- `Button` - For close button (ghost variant)

[Source: project-context.md#Shadcn/ui Requirement]

### Anti-Patterns to Avoid

- Do NOT use modal for error panel - use inline collapsible pattern
- Do NOT create custom error codes - use existing error codes from project-context.md
- Do NOT use default exports - use named exports
- Do NOT hardcode error messages - use i18n translation keys
- Do NOT rely on color alone to convey information - use icons + text
- Do NOT block "Open Folder" action while error panel is expanded
- Do NOT persist error panel state to disk - keep in component state
- Do NOT show technical error details (stack traces, HTTP codes) to users
- Do NOT use apologetic language ("Sorry", "Unfortunately")

[Source: project-context.md#Anti-Patterns to Avoid]

### Integration with CompletionPanel

The error panel should appear within the completion flow:

```
+--------------------------------------------------+
|  Download complete!                              |
|  45 of 47 tracks downloaded                      |
+--------------------------------------------------+
|  ! 2 tracks failed                        [v]    |  <- Error panel trigger
+--------------------------------------------------+
|  [Open Folder]    [Download Another]             |
+--------------------------------------------------+
```

Position the error panel between the completion message and action buttons. This placement:
- Keeps success message prominent
- Makes failures visible but not blocking
- Allows immediate access to "Open Folder" action

[Source: ux-design-specification.md#UX-5, epics.md#Story 6.4]

### Testing Checklist

- [ ] ErrorPanelTrigger renders nothing when failedCount is 0
- [ ] ErrorPanelTrigger renders "{count} tracks failed" indicator
- [ ] ErrorPanelTrigger uses amber/warning color
- [ ] ErrorPanelTrigger is keyboard accessible (Tab, Enter, Space)
- [ ] ErrorPanel expands on trigger click
- [ ] ErrorPanel collapses on close button click
- [ ] ErrorPanel collapses on Escape key
- [ ] ErrorPanel lists all failed tracks with title and artist
- [ ] ErrorPanel groups failures by reason category
- [ ] ErrorPanel scrolls when content exceeds max height
- [ ] FailureGroup headers show category and count
- [ ] FailedTrackItem truncates long titles with ellipsis
- [ ] Focus returns to trigger after closing panel
- [ ] Screen reader announces expansion state changes
- [ ] Screen reader can traverse failure list
- [ ] All ARIA attributes are correctly set
- [ ] English translations render correctly
- [ ] French translations render correctly
- [ ] Pluralization works correctly (1 track vs. 2 tracks)
- [ ] useFailedTracks hook returns only failed tracks
- [ ] groupFailuresByReason correctly categorizes all error types
- [ ] Integration with CompletionPanel works correctly

### Dependencies

This story depends on:
- Story 5.1: Create Track List Component (TrackCard patterns)
- Story 5.2: Implement Per-Track Status Display (status badge patterns)
- Story 6.4: Display Completion Panel (CompletionPanel to integrate with)
- Story 7.1: Display Geo-Block Error Messages (geo-block error handling)
- Story 7.2: Display Unavailable Track Messages (unavailable error handling)

This story enables:
- Complete error transparency as described in UX Design Specification
- FR18 functional requirement fulfillment

### References

- [Source: ux-design-specification.md#Graceful Failure]
- [Source: ux-design-specification.md#Error Transparency as Trust]
- [Source: ux-design-specification.md#Keyboard Navigation]
- [Source: ux-design-specification.md#Accessibility]
- [Source: project-context.md#Error Codes]
- [Source: project-context.md#react-i18next]
- [Source: project-context.md#Shadcn/ui Requirement]
- [Source: project-context.md#Anti-Patterns to Avoid]
- [Source: epics.md#Story 7.3]
- [Source: prd/functional-requirements.md#FR18]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

