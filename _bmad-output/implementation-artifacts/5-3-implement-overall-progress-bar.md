# Story 5.3: Implement Overall Progress Bar

Status: ready-for-dev

## Story

As a **user**,
I want **to see overall download progress**,
so that **I know how much of my playlist is complete**.

## Acceptance Criteria

1. **Given** a download is in progress (FR11)
   **When** viewing the progress section
   **Then** an overall progress bar is displayed above the track list
   **And** a counter shows "X of Y tracks" (e.g., "12 of 47 tracks")

2. **Given** tracks complete
   **When** the counter updates
   **Then** the "X" value increments in real-time
   **And** the progress bar fills proportionally
   **And** updates appear within 500ms of status change (NFR3)

3. **Given** some tracks fail
   **When** viewing the counter
   **Then** completed tracks are counted (not failed)
   **And** the final state shows accurate completion (e.g., "45 of 47 tracks")

4. **Given** the progress bar is displayed
   **When** checking accessibility
   **Then** the progress has an aria-label describing completion
   **And** screen readers can announce progress updates

## Tasks / Subtasks

- [ ] Task 1: Add Shadcn/ui Progress component (AC: #1)
  - [ ] 1.1 Run `npx shadcn@latest add progress` to add Progress component
  - [ ] 1.2 Verify `/src/components/ui/progress.tsx` is created
  - [ ] 1.3 Review component API and customization options

- [ ] Task 2: Create OverallProgress component (AC: #1, #2)
  - [ ] 2.1 Create `src/components/features/progress/OverallProgress.tsx`
  - [ ] 2.2 Define component props interface:
    ```typescript
    interface OverallProgressProps {
      completedCount: number;
      totalCount: number;
      className?: string;
    }
    ```
  - [ ] 2.3 Implement component with Progress bar and counter text
  - [ ] 2.4 Calculate percentage: `(completedCount / totalCount) * 100`
  - [ ] 2.5 Export component as named export

- [ ] Task 3: Add i18n translations for progress text (AC: #1, #2, #3)
  - [ ] 3.1 Add English translation in `src/locales/en.json`:
    ```json
    {
      "download": {
        "progress": "{{current}} of {{total}} tracks",
        "progressSingle": "{{current}} of {{total}} track",
        "progressComplete": "Download complete",
        "progressPartial": "{{current}} of {{total}} tracks downloaded"
      }
    }
    ```
  - [ ] 3.2 Add French translation in `src/locales/fr.json`:
    ```json
    {
      "download": {
        "progress": "{{current}} sur {{total}} pistes",
        "progressSingle": "{{current}} sur {{total}} piste",
        "progressComplete": "Telechargement termine",
        "progressPartial": "{{current}} sur {{total}} pistes telechargees"
      }
    }
    ```
  - [ ] 3.3 Use `useTranslation` hook in component with interpolation

- [ ] Task 4: Connect to queueStore (AC: #2, #3)
  - [ ] 4.1 Import `useQueueStore` in OverallProgress
  - [ ] 4.2 Create selector for completed count:
    ```typescript
    const completedCount = useQueueStore(
      (state) => state.tracks.filter((t) => t.status === 'complete').length
    );
    ```
  - [ ] 4.3 Create selector for total count:
    ```typescript
    const totalCount = useQueueStore((state) => state.tracks.length);
    ```
  - [ ] 4.4 Verify real-time updates when track status changes

- [ ] Task 5: Implement accessibility features (AC: #4)
  - [ ] 5.1 Add `aria-label` to Progress component with dynamic text
  - [ ] 5.2 Add `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
  - [ ] 5.3 Use `aria-live="polite"` on counter text for screen reader announcements
  - [ ] 5.4 Ensure progress bar has `role="progressbar"`
  - [ ] 5.5 Test with screen reader (VoiceOver on macOS, or NVDA on Windows)

- [ ] Task 6: Style component to match design system (AC: #1)
  - [ ] 6.1 Apply primary color (#6366F1) to progress bar fill
  - [ ] 6.2 Set progress bar height to appropriate size (8px recommended)
  - [ ] 6.3 Add subtle animation for progress bar fill transitions
  - [ ] 6.4 Position counter text above or beside progress bar
  - [ ] 6.5 Use Typography system (14px Body for counter text)

- [ ] Task 7: Integrate into ProgressPanel (AC: #1)
  - [ ] 7.1 Import OverallProgress into `src/components/features/progress/ProgressPanel.tsx`
  - [ ] 7.2 Position above TrackList component
  - [ ] 7.3 Add appropriate spacing (8px multiples per UX spec)
  - [ ] 7.4 Conditionally render only when tracks exist in queue

- [ ] Task 8: Verify performance requirements (AC: #2)
  - [ ] 8.1 Test with simulated rapid status changes
  - [ ] 8.2 Verify updates appear within 500ms (NFR3)
  - [ ] 8.3 Ensure UI remains responsive during updates (NFR2: <100ms input response)
  - [ ] 8.4 Check for unnecessary re-renders using React DevTools

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates a **presentation-only component**. Following the custom hooks architecture:
- `OverallProgress` receives `completedCount` and `totalCount` as props
- Parent component uses `useQueueStore` selectors to get counts
- No direct store access in the progress component itself
- Consider creating `useQueueProgress` hook if logic becomes complex

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Shadcn/ui Progress Component

**Installation:**
```bash
npx shadcn@latest add progress
```

**Component Location:** `src/components/ui/progress.tsx`

**Basic Usage:**
```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={33} />  // 33% complete
```

**Customization:**
The Progress component from Shadcn/ui uses Radix UI primitives under the hood. The fill color can be customized via Tailwind classes:
```tsx
<Progress
  value={percentage}
  className="h-2 w-full"
  // Fill color is controlled via CSS variable or indicator class
/>
```

[Source: Shadcn/ui Progress documentation]

### i18n Integration Pattern

**From project-context.md:**
```typescript
import { useTranslation } from 'react-i18next';

export function OverallProgress({ completedCount, totalCount }: OverallProgressProps) {
  const { t } = useTranslation();

  const progressText = t('download.progress', {
    current: completedCount,
    total: totalCount
  });

  return (
    <div>
      <span aria-live="polite">{progressText}</span>
      <Progress value={(completedCount / totalCount) * 100} />
    </div>
  );
}
```

**Key structure:** `{namespace}.{section}.{element}`
**Interpolation syntax:** `{{variable}}`

[Source: project-context.md#react-i18next]

### Queue Store Integration

**Selector pattern for derived state:**
```typescript
import { useQueueStore } from '@/stores/queueStore';

// Efficient selectors - only re-render when derived value changes
const completedCount = useQueueStore(
  (state) => state.tracks.filter((t) => t.status === 'complete').length
);
const totalCount = useQueueStore((state) => state.tracks.length);
```

**Track status values (must match Rust backend):**
```typescript
type TrackStatus = 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
```

[Source: project-context.md#IPC Payload Structure]

### Accessibility Requirements

**WCAG 2.1 AA compliance (UX-10):**
- Progress bar must have `role="progressbar"` (Shadcn/ui provides this)
- Include `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- Dynamic `aria-label` for context: "Download progress: 12 of 47 tracks complete"

**Screen reader announcements (UX-13):**
```tsx
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {t('download.progress', { current: completedCount, total: totalCount })}
</div>
```

**Status conveyed via icon + text, not color alone (UX-14):**
- Progress text is always visible alongside the bar
- Percentage or count provides non-visual indicator

[Source: ux-design-specification.md#Accessibility]

### Component Structure

```tsx
// src/components/features/progress/OverallProgress.tsx
import { Progress } from '@/components/ui/progress';
import { useQueueStore } from '@/stores/queueStore';
import { useTranslation } from 'react-i18next';

interface OverallProgressProps {
  className?: string;
}

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const completedCount = useQueueStore(
    (state) => state.tracks.filter((t) => t.status === 'complete').length
  );
  const totalCount = useQueueStore((state) => state.tracks.length);

  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const ariaLabel = t('download.progressAriaLabel', {
    current: completedCount,
    total: totalCount,
    percentage: Math.round(percentage)
  });

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span
          aria-live="polite"
          className="text-sm text-gray-700"
        >
          {t('download.progress', { current: completedCount, total: totalCount })}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(percentage)}%
        </span>
      </div>
      <Progress
        value={percentage}
        aria-label={ariaLabel}
        className="h-2"
      />
    </div>
  );
}
```

### Visual Design from UX Spec

**Color System:**
| Role | Hex | Usage |
|------|-----|-------|
| Primary | #6366F1 | Progress bar fill |
| Text Primary | #111827 | Counter text |
| Text Secondary | #6B7280 | Percentage text |

**Typography:**
- Counter text: 14px Body
- Use Inter font (clean, modern, screen-optimized)

**Spacing:**
- Base unit: 4px
- Use 8px multiples for consistent rhythm
- mb-2 (8px) between counter and progress bar

[Source: ux-design-specification.md#Visual Design Foundation]

### Performance Requirements

**NFR3: Progress updates display within 500ms of status change**
- Zustand selector pattern ensures efficient re-renders
- Only components using affected state will re-render

**NFR2: UI responds to user input within 100ms during downloads**
- Avoid heavy computations in render path
- Use memoization if filter operations become expensive:
  ```typescript
  import { useMemo } from 'react';

  const completedCount = useMemo(
    () => tracks.filter((t) => t.status === 'complete').length,
    [tracks]
  );
  ```

[Source: epics.md#NonFunctional Requirements]

### File Structure After This Story

```
src/
├── components/
│   ├── ui/
│   │   └── progress.tsx          # Shadcn/ui Progress (added)
│   └── features/
│       └── progress/
│           ├── ProgressPanel.tsx  # Parent container
│           ├── TrackList.tsx      # Story 5.1
│           └── OverallProgress.tsx # This story (new)
├── locales/
│   ├── en.json                   # Updated with progress keys
│   └── fr.json                   # Updated with progress keys
└── ...
```

[Source: architecture/project-structure-boundaries.md]

### Anti-Patterns to Avoid

- **Do NOT** subscribe to entire store state - use selectors for specific values
- **Do NOT** calculate derived state outside of selectors (causes unnecessary re-renders)
- **Do NOT** hardcode text strings - use i18n for all user-visible text
- **Do NOT** rely on color alone for status - always pair with text
- **Do NOT** use default exports - use named exports
- **Do NOT** skip accessibility attributes - screen reader support is required

[Source: project-context.md#Anti-Patterns to Avoid]

### Edge Cases to Handle

1. **Zero tracks:** Don't render progress bar when `totalCount === 0`
2. **Single track:** Use singular "track" instead of "tracks" (i18n pluralization)
3. **All failed:** Show "0 of 47 tracks" - completed count excludes failed
4. **Division by zero:** Guard against `totalCount === 0` before calculating percentage

### Testing Checklist

- [ ] Progress bar renders when tracks exist in queue
- [ ] Progress bar does NOT render when queue is empty
- [ ] Counter shows correct "X of Y tracks" format
- [ ] Progress bar fills proportionally to completion
- [ ] Updates appear within 500ms of track status change
- [ ] Failed tracks are NOT counted in completed count
- [ ] Screen reader announces progress updates
- [ ] `aria-label` accurately describes current progress
- [ ] Singular "track" used when total is 1
- [ ] French translation displays correctly when language is 'fr'
- [ ] No console errors or TypeScript warnings
- [ ] Component re-renders only when completion count changes

### Dependencies

**Stories that must be completed first:**
- Story 1.4: Configure Zustand Stores (queueStore with track status)
- Story 1.5: Configure react-i18next Foundation (i18n setup)
- Story 5.1: Create Track List Component (TrackList to display below)

**Stories that depend on this:**
- Story 5.5: Subscribe to Backend Progress Events (will trigger updates)
- Story 6.4: Display Completion Panel (uses final progress state)

### References

- [Source: epics.md#Story 5.3: Implement Overall Progress Bar]
- [Source: epics.md#FR11: Overall download progress]
- [Source: epics.md#NFR3: Progress updates within 500ms]
- [Source: ux-design-specification.md#Stacked Progress Layout]
- [Source: ux-design-specification.md#Accessibility (WCAG 2.1 AA)]
- [Source: project-context.md#react-i18next]
- [Source: project-context.md#Zustand Rules]
- [Source: architecture/project-structure-boundaries.md#Progress & Status]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
