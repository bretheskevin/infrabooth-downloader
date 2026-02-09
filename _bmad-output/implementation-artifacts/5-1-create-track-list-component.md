# Story 5.1: Create Track List Component

Status: ready-for-dev

## Story

As a **user**,
I want **to see all tracks in my download queue**,
so that **I know exactly what's being downloaded**.

## Acceptance Criteria

1. **Given** a playlist has been validated and Download clicked
   **When** the progress section appears
   **Then** a stacked list of track cards is displayed (UX-8)
   **And** each card shows: artwork placeholder (48x48), title, artist
   **And** the list is scrollable if tracks exceed visible area

2. **Given** the track list is displayed
   **When** viewing the layout
   **Then** the list follows the Transmit-inspired design
   **And** cards are visually distinct with consistent spacing
   **And** the currently downloading track is highlighted

3. **Given** the window is resized
   **When** the height changes
   **Then** more or fewer tracks are visible accordingly
   **And** the list remains scrollable
   **And** no horizontal scrollbar appears

4. **Given** a single track download (not playlist)
   **When** the progress section appears
   **Then** a single track card is displayed
   **And** the layout remains consistent

## Tasks / Subtasks

- [ ] Task 1: Add required Shadcn/ui components (AC: #1, #2, #3)
  - [ ] 1.1 Run `npx shadcn@latest add scroll-area`
  - [ ] 1.2 Run `npx shadcn@latest add avatar` (for artwork placeholders)
  - [ ] 1.3 Run `npx shadcn@latest add skeleton` (for loading states)
  - [ ] 1.4 Run `npx shadcn@latest add spinner` (for status indicators)
  - [ ] 1.5 Verify all components are installed in `src/components/ui/`

- [ ] Task 2: Create TrackCard component (AC: #1, #2)
  - [ ] 2.1 Create `src/components/features/progress/TrackCard.tsx`
  - [ ] 2.2 Define `TrackCardProps` interface:
    ```typescript
    interface TrackCardProps {
      track: Track;
      isCurrentTrack: boolean;
    }
    ```
  - [ ] 2.3 Implement track card layout:
    - Artwork placeholder (48x48) using Avatar or custom div
    - Track title (truncate with ellipsis if too long)
    - Artist name (secondary text)
    - Status indicator area (for Story 5.2)
  - [ ] 2.4 Add highlighted state for current track
  - [ ] 2.5 Ensure WCAG AA compliance for contrast
  - [ ] 2.6 Export as named export

- [ ] Task 3: Create TrackList component (AC: #1, #2, #3, #4)
  - [ ] 3.1 Create `src/components/features/progress/TrackList.tsx`
  - [ ] 3.2 Import `useQueueStore` to access tracks
  - [ ] 3.3 Implement scrollable container using Shadcn ScrollArea
  - [ ] 3.4 Map tracks to TrackCard components
  - [ ] 3.5 Calculate and pass `isCurrentTrack` prop
  - [ ] 3.6 Handle empty state (no tracks)
  - [ ] 3.7 Export as named export

- [ ] Task 4: Style track cards following UX spec (AC: #1, #2)
  - [ ] 4.1 Apply 8px spacing rhythm between cards
  - [ ] 4.2 Add subtle border/separator between cards
  - [ ] 4.3 Style current track highlight:
    - Background: Primary Light (#A5B4FC at 10% opacity)
    - Border-left: 2px solid Primary (#6366F1)
  - [ ] 4.4 Style artwork placeholder with gray background
  - [ ] 4.5 Apply typography scale:
    - Title: 14px, medium weight
    - Artist: 12px, regular weight, Text Secondary color

- [ ] Task 5: Implement responsive scroll behavior (AC: #3)
  - [ ] 5.1 Set ScrollArea to fill available height
  - [ ] 5.2 Configure smooth scrolling
  - [ ] 5.3 Test with minimum window size (400x500)
  - [ ] 5.4 Test with default window size (600x700)
  - [ ] 5.5 Verify no horizontal scrollbar appears
  - [ ] 5.6 Verify vertical scrollbar only appears when needed

- [ ] Task 6: Add i18n translations (AC: #1, #4)
  - [ ] 6.1 Add to `src/locales/en.json`:
    ```json
    "progress": {
      "trackList": {
        "emptyState": "No tracks in queue",
        "singleTrack": "1 track",
        "multipleTracks": "{{count}} tracks"
      }
    }
    ```
  - [ ] 6.2 Add to `src/locales/fr.json`:
    ```json
    "progress": {
      "trackList": {
        "emptyState": "Aucune piste dans la file",
        "singleTrack": "1 piste",
        "multipleTracks": "{{count}} pistes"
      }
    }
    ```

- [ ] Task 7: Add accessibility features (AC: #1, #2, #3)
  - [ ] 7.1 Add ARIA labels to track list (`aria-label="Download queue"`)
  - [ ] 7.2 Add role="list" to container, role="listitem" to cards
  - [ ] 7.3 Ensure visible focus rings on focusable elements
  - [ ] 7.4 Test keyboard navigation (Tab through items)
  - [ ] 7.5 Verify screen reader announces track info

- [ ] Task 8: Integration and testing (AC: #1, #2, #3, #4)
  - [ ] 8.1 Import TrackList in ProgressPanel or main progress view
  - [ ] 8.2 Verify component renders with mock track data
  - [ ] 8.3 Verify current track highlight updates correctly
  - [ ] 8.4 Verify scrolling works with 50+ tracks
  - [ ] 8.5 Verify single track layout is consistent

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates **presentation-only components**. Following the custom hooks architecture:
- Components consume state from `useQueueStore` via selectors
- No direct `invoke()` calls in components
- No loading state management in components
- Transform logic lives in `src/lib/transforms.ts`

**Component responsibility:** Render UI based on store state. That's it.

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Dependencies from Previous Stories

**Story 4.6 (Download Queue Processing)** provides:
- `useQueueStore` with `tracks` array, `currentIndex`
- `Track` interface with `id`, `title`, `artist`, `artworkUrl`, `status`
- Queue events: `queue-progress`, `download-progress`

The TrackList component consumes the queue store state set up in Story 4.6.

### Shadcn/ui Components to Use

| Component | Purpose | Installation |
|-----------|---------|--------------|
| `ScrollArea` | Scrollable track list container | `npx shadcn@latest add scroll-area` |
| `Avatar` | Artwork placeholder (48x48) | `npx shadcn@latest add avatar` |
| `Skeleton` | Loading state placeholders | `npx shadcn@latest add skeleton` |
| `Spinner` | Status indicator (downloading) | `npx shadcn@latest add spinner` |

[Source: Shadcn registry - card, scroll-area, avatar, badge, skeleton, spinner]

### Component Architecture

```
ProgressPanel (parent - Story 5.3)
└── TrackList
    ├── ScrollArea (Shadcn)
    │   └── [Track cards mapped]
    │       └── TrackCard
    │           ├── Avatar/Artwork (48x48)
    │           ├── Track info (title, artist)
    │           └── Status indicator (Story 5.2)
    └── Empty state (if no tracks)
```

### Track Interface (from queueStore)

```typescript
// From src/types/track.ts (Story 1.4)
interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
  error?: { code: string; message: string };
}
```
[Source: _bmad-output/implementation-artifacts/1-4-configure-zustand-stores.md]

### Queue Store State (from 4.6)

```typescript
// From src/stores/queueStore.ts (Story 4.6)
interface QueueState {
  tracks: Track[];
  currentIndex: number;
  totalTracks: number;
  isProcessing: boolean;
  isComplete: boolean;
  completedCount: number;
  failedCount: number;
  // ... actions
}
```
[Source: _bmad-output/implementation-artifacts/4-6-implement-download-queue.md]

### TrackCard Component Pattern

```typescript
// src/components/features/progress/TrackCard.tsx
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Track } from '@/types/track';

interface TrackCardProps {
  track: Track;
  isCurrentTrack: boolean;
}

export function TrackCard({ track, isCurrentTrack }: TrackCardProps) {
  return (
    <div
      role="listitem"
      className={cn(
        'flex items-center gap-3 p-3 rounded-md',
        'transition-colors duration-150',
        isCurrentTrack && 'bg-primary/10 border-l-2 border-l-primary'
      )}
    >
      {/* Artwork */}
      <Avatar className="h-12 w-12 rounded-md flex-shrink-0">
        {track.artworkUrl ? (
          <AvatarImage src={track.artworkUrl} alt={track.title} />
        ) : null}
        <AvatarFallback className="rounded-md bg-muted">
          {/* Music note icon or initials */}
        </AvatarFallback>
      </Avatar>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Status indicator placeholder - implemented in Story 5.2 */}
      <div className="flex-shrink-0 w-6">
        {/* Status icon will go here */}
      </div>
    </div>
  );
}
```

### TrackList Component Pattern

```typescript
// src/components/features/progress/TrackList.tsx
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueueStore } from '@/stores/queueStore';
import { useTranslation } from 'react-i18next';
import { TrackCard } from './TrackCard';

export function TrackList() {
  const { t } = useTranslation();
  const { tracks, currentIndex } = useQueueStore();

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        {t('progress.trackList.emptyState')}
      </div>
    );
  }

  return (
    <ScrollArea
      className="h-full"
      aria-label={t('progress.trackList.ariaLabel', 'Download queue')}
    >
      <div role="list" className="space-y-1 p-2">
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id}
            track={track}
            isCurrentTrack={index === currentIndex}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
```

### UX Design Reference

**From UX Specification:**
- Transmit-inspired stacked track list with per-track status (UX-8)
- Track cards show: artwork (48x48), title, artist, status icon + label
- Current track has highlighted background
- Stacked checkmarks create visual momentum and completion satisfaction
- 8px spacing rhythm (multiples of base 4px unit)

**Visual Styling:**
| Element | Value |
|---------|-------|
| Card spacing | 4px (space-y-1) |
| Card padding | 12px (p-3) |
| Artwork size | 48x48px |
| Title font | 14px, medium |
| Artist font | 12px, regular |
| Current highlight | bg-primary/10, border-l-2 border-primary |

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction]

### Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #6366F1 | Current track border |
| Primary Light | #A5B4FC | Current track background (10% opacity) |
| Text Primary | #111827 | Track title |
| Text Secondary | #6B7280 | Artist name |
| Text Muted | #9CA3AF | Empty state |
| Background | #FAFAFA | List background |
| Surface | #FFFFFF | Card background |
| Border | #E5E7EB | Card separator |

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System]

### File Structure After This Story

```
src/
├── components/
│   ├── ui/
│   │   ├── scroll-area.tsx    # Added (Shadcn)
│   │   ├── avatar.tsx         # Added (Shadcn)
│   │   ├── skeleton.tsx       # Added (Shadcn)
│   │   └── spinner.tsx        # Added (Shadcn)
│   └── features/
│       └── progress/
│           ├── TrackCard.tsx   # New - individual track display
│           └── TrackList.tsx   # New - scrollable track list
├── locales/
│   ├── en.json               # Updated with progress.trackList keys
│   └── fr.json               # Updated with progress.trackList keys
└── ...
```
[Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md]

### What This Story Does NOT Include

- Status icons (pending, downloading, complete, failed) - **Story 5.2**
- Overall progress bar and counter - **Story 5.3**
- Rate limit banner display - **Story 5.4**
- Completion panel - **Epic 6**
- Error panel - **Epic 7**

This story focuses on the track list structure and layout. Status indicators are added in the next story.

### Anti-Patterns to Avoid

- Do NOT use default exports - use named exports
- Do NOT use inline styles - use Tailwind classes
- Do NOT hardcode strings - use i18n translations
- Do NOT create custom scroll implementations - use Shadcn ScrollArea
- Do NOT skip accessibility attributes - WCAG AA compliance required
- Do NOT use color alone for current track indicator - use border + background
- Do NOT use class components - functional components only

[Source: _bmad-output/project-context.md#Anti-Patterns to Avoid]

### Accessibility Checklist (UX-10 through UX-14)

- [ ] WCAG 2.1 AA compliance (4.5:1 contrast minimum)
- [ ] Visible focus rings on all interactive elements
- [ ] Full keyboard navigation support (Tab, Shift+Tab)
- [ ] Screen reader announces track info correctly
- [ ] Status conveyed through icons + text, not color alone (prep for 5.2)
- [ ] role="list" and role="listitem" attributes applied
- [ ] aria-label on scrollable container

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility]

### Testing Checklist

After completing all tasks:
1. [ ] TrackList renders with tracks from queueStore
2. [ ] TrackCard displays artwork, title, artist correctly
3. [ ] Current track is visually highlighted
4. [ ] List scrolls when tracks exceed visible area
5. [ ] No horizontal scrollbar appears
6. [ ] Empty state renders when no tracks
7. [ ] Single track displays correctly
8. [ ] Window resize adjusts visible tracks
9. [ ] Minimum window size (400x500) doesn't break layout
10. [ ] Keyboard navigation works (Tab through items)
11. [ ] Screen reader announces track information
12. [ ] TypeScript compiles without errors
13. [ ] No ESLint warnings

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1]
- [Source: _bmad-output/planning-artifacts/epics.md#FR11, FR12]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-8]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/implementation-artifacts/1-4-configure-zustand-stores.md]
- [Source: _bmad-output/implementation-artifacts/4-6-implement-download-queue.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

