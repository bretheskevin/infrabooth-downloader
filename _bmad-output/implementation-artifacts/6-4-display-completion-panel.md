# Story 6.4: Display Completion Panel

Status: ready-for-dev

## Story

As a **user**,
I want **to know when my download is complete and access my files immediately**,
so that **I can enjoy my music right away**.

## Acceptance Criteria (UX-4, UX-5)

1. **Given** all tracks in the queue have been processed
   **When** the queue completes
   **Then** a completion panel appears prominently
   **And** the panel shows success message (e.g., "Download complete!")

2. **Given** all tracks succeeded
   **When** viewing the completion panel
   **Then** it shows "47/47 tracks downloaded" (full success)
   **And** the message conveys satisfaction/accomplishment

3. **Given** some tracks failed (UX-5)
   **When** viewing the completion panel
   **Then** it shows "45/47 tracks downloaded" (partial success)
   **And** the message frames this as success with context, not failure
   **And** a link/button to view failed tracks is available

4. **Given** the completion panel is displayed (UX-4)
   **When** viewing available actions
   **Then** an "Open Folder" button is prominently shown
   **And** the button uses secondary style (outline)
   **And** optionally: "Download Another" button to reset UI

5. **Given** the user clicks "Open Folder"
   **When** the action is triggered
   **Then** the system file browser opens to the download location
   **And** the downloaded files are visible
   **And** the app remains open in the background

6. **Given** completion is announced
   **When** using a screen reader (UX-13)
   **Then** "Download complete, X of Y tracks" is announced
   **And** available actions are discoverable via keyboard

## Tasks / Subtasks

- [ ] Task 1: Create Rust Command for Opening Folder (AC: #5)
  - [ ] 1.1 Add `tauri-plugin-shell` to Cargo.toml dependencies
  - [ ] 1.2 Register shell plugin in `src-tauri/src/lib.rs`
  - [ ] 1.3 Add shell permission in `tauri.conf.json` capabilities
  - [ ] 1.4 Create `open_folder` command in `src-tauri/src/commands/files.rs`
  - [ ] 1.5 Implement cross-platform folder opening (macOS: `open`, Windows: `explorer`)

- [ ] Task 2: Create CompletionPanel Component (AC: #1, #2, #3, #4)
  - [ ] 2.1 Create `src/components/features/download/CompletionPanel.tsx`
  - [ ] 2.2 Define props interface with `completedCount`, `totalCount`, `failedCount`
  - [ ] 2.3 Implement success message with track count display
  - [ ] 2.4 Implement partial success framing for failed tracks
  - [ ] 2.5 Add "Open Folder" button with outline variant
  - [ ] 2.6 Add "Download Another" button to reset UI state
  - [ ] 2.7 Export as named export

- [ ] Task 3: Implement "Open Folder" Functionality (AC: #5)
  - [ ] 3.1 Create `src/lib/shellCommands.ts` utility
  - [ ] 3.2 Import and use `open` from `@tauri-apps/plugin-shell`
  - [ ] 3.3 Call open folder with download path from settingsStore
  - [ ] 3.4 Handle errors gracefully (folder doesn't exist, permission denied)
  - [ ] 3.5 Ensure app stays in foreground on macOS (no focus steal)

- [ ] Task 4: Create SuccessMessage Component (AC: #1, #2, #3)
  - [ ] 4.1 Create `src/components/features/download/SuccessMessage.tsx`
  - [ ] 4.2 Implement full success variant: "Download complete!"
  - [ ] 4.3 Implement partial success variant: "X of Y tracks downloaded"
  - [ ] 4.4 Add success icon (checkmark) with animation
  - [ ] 4.5 Apply success color scheme (#10B981)

- [ ] Task 5: Create FailedTracksLink Component (AC: #3)
  - [ ] 5.1 Create `src/components/features/download/FailedTracksLink.tsx`
  - [ ] 5.2 Display "X tracks couldn't be downloaded" with link styling
  - [ ] 5.3 Implement click handler to scroll/expand error panel (from Story 7.3)
  - [ ] 5.4 Use warning color (#F59E0B) for failed count
  - [ ] 5.5 Hide component when no tracks failed

- [ ] Task 6: Integrate with queueStore Completion State (AC: #1, #2, #3)
  - [ ] 6.1 Add `isComplete` selector to queueStore
  - [ ] 6.2 Add `getCompletedCount` selector to queueStore
  - [ ] 6.3 Add `getFailedCount` selector to queueStore
  - [ ] 6.4 Create `useDownloadCompletion` hook for component consumption
  - [ ] 6.5 Implement `resetQueue` action for "Download Another"

- [ ] Task 7: Add i18n Translation Keys (AC: #1, #2, #3, #4, #6)
  - [ ] 7.1 Add English translations to `src/locales/en.json`:
    ```json
    "completion": {
      "title": "Download complete!",
      "titlePartial": "Download finished",
      "tracksDownloaded": "{{completed}} of {{total}} tracks downloaded",
      "allTracksDownloaded": "All {{total}} tracks downloaded",
      "openFolder": "Open Folder",
      "downloadAnother": "Download Another",
      "failedTracks": "{{count}} tracks couldn't be downloaded",
      "failedTracksSingular": "1 track couldn't be downloaded",
      "viewFailed": "View details"
    }
    ```
  - [ ] 7.2 Add French translations to `src/locales/fr.json`:
    ```json
    "completion": {
      "title": "Telechargement termine !",
      "titlePartial": "Telechargement termine",
      "tracksDownloaded": "{{completed}} sur {{total}} pistes telechargees",
      "allTracksDownloaded": "Les {{total}} pistes ont ete telechargees",
      "openFolder": "Ouvrir le dossier",
      "downloadAnother": "Telecharger autre chose",
      "failedTracks": "{{count}} pistes n'ont pas pu etre telechargees",
      "failedTracksSingular": "1 piste n'a pas pu etre telechargee",
      "viewFailed": "Voir les details"
    }
    ```

- [ ] Task 8: Implement Accessibility Features (AC: #6)
  - [ ] 8.1 Add `role="status"` to completion panel container
  - [ ] 8.2 Implement `aria-live="polite"` for completion announcement
  - [ ] 8.3 Add `aria-label` to buttons for screen reader context
  - [ ] 8.4 Ensure focus moves to completion panel when it appears
  - [ ] 8.5 Test keyboard navigation (Tab between buttons, Enter to activate)

- [ ] Task 9: Add Completion Animation (AC: #1, #2)
  - [ ] 9.1 Add subtle fade-in animation when panel appears
  - [ ] 9.2 Add success icon animation (checkmark drawing or bounce)
  - [ ] 9.3 Ensure animation respects `prefers-reduced-motion`
  - [ ] 9.4 Keep animation duration under 300ms

- [ ] Task 10: Testing and Verification (AC: #1-6)
  - [ ] 10.1 Test full success completion (all tracks succeed)
  - [ ] 10.2 Test partial success completion (some tracks failed)
  - [ ] 10.3 Test "Open Folder" on macOS (opens Finder)
  - [ ] 10.4 Test "Open Folder" on Windows (opens Explorer)
  - [ ] 10.5 Test "Download Another" resets UI state
  - [ ] 10.6 Test keyboard navigation and screen reader announcements
  - [ ] 10.7 Test with single track download

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates `useDownloadCompletion` which follows the **custom hooks architecture**:
- Single responsibility: derive completion state from queueStore
- Returns `isComplete`, `completedCount`, `failedCount`, `resetQueue`
- Components are thin — just render based on hook return values

**Hook placement:**
```
src/hooks/
├── download/
│   ├── useDownloadFlow.ts       # From Story 0.1
│   ├── useDownloadProgress.ts   # From Story 5.5
│   └── useDownloadCompletion.ts # NEW - This story
└── index.ts
```

**Component responsibility:** `CompletionPanel` only renders UI. All state derivation happens in the hook.

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Tauri 2.0 Shell Plugin Setup

**Cargo.toml dependencies:**
```toml
[dependencies]
tauri-plugin-shell = "2"
```

**Plugin registration in lib.rs:**
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // ... other plugins
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Capability permissions (src-tauri/capabilities/default.json):**
```json
{
  "permissions": [
    "shell:allow-open"
  ]
}
```

[Source: Tauri 2.0 Shell Plugin Documentation]

### "Open Folder" Implementation (Tauri Shell API)

The Tauri shell plugin provides cross-platform folder opening:

```typescript
// src/lib/shellCommands.ts
import { open } from '@tauri-apps/plugin-shell';

export async function openDownloadFolder(path: string): Promise<void> {
  try {
    // The 'open' function uses the OS default handler:
    // - macOS: Uses 'open' command -> opens Finder
    // - Windows: Uses 'start' command -> opens Explorer
    // - Linux: Uses 'xdg-open' -> opens file manager
    await open(path);
  } catch (error) {
    console.error('Failed to open folder:', error);
    throw new Error('Could not open folder');
  }
}
```

**Important:** Install the frontend package:
```bash
npm install @tauri-apps/plugin-shell
```

[Source: Tauri 2.0 Shell Plugin - Open API]

### Partial Success Framing (UX-5)

Per UX specification, partial completion must be framed as success with context, not failure:

**Do:**
- "45 of 47 tracks downloaded" (emphasizes success count)
- "Download finished" with success styling
- Secondary mention of failed tracks with link to details

**Don't:**
- "Download failed: 2 tracks could not be downloaded"
- Error styling/colors for the main message
- Making failed tracks the primary focus

```typescript
// Framing logic
const getCompletionTitle = (completed: number, total: number, t: TFunction) => {
  if (completed === total) {
    return t('completion.title'); // "Download complete!"
  }
  return t('completion.titlePartial'); // "Download finished"
};

const getCompletionMessage = (completed: number, total: number, t: TFunction) => {
  if (completed === total) {
    return t('completion.allTracksDownloaded', { total }); // "All 47 tracks downloaded"
  }
  return t('completion.tracksDownloaded', { completed, total }); // "45 of 47 tracks downloaded"
};
```

[Source: ux-design-specification.md - Emotional Design Principles]

### CompletionPanel Component Design

```typescript
// src/components/features/download/CompletionPanel.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle, FolderOpen, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { openDownloadFolder } from '@/lib/shellCommands';
import { SuccessMessage } from './SuccessMessage';
import { FailedTracksLink } from './FailedTracksLink';

interface CompletionPanelProps {
  completedCount: number;
  totalCount: number;
  failedCount: number;
  onDownloadAnother: () => void;
  onViewFailedTracks: () => void;
}

export function CompletionPanel({
  completedCount,
  totalCount,
  failedCount,
  onDownloadAnother,
  onViewFailedTracks,
}: CompletionPanelProps) {
  const { t } = useTranslation();
  const { downloadPath } = useSettingsStore();

  const handleOpenFolder = async () => {
    if (downloadPath) {
      await openDownloadFolder(downloadPath);
    }
  };

  const isFullSuccess = failedCount === 0;

  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="status"
      aria-live="polite"
      aria-label={t('completion.tracksDownloaded', {
        completed: completedCount,
        total: totalCount
      })}
    >
      <CardContent className="pt-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-emerald-100 p-3">
            <CheckCircle
              className="h-8 w-8 text-emerald-500"
              aria-hidden="true"
            />
          </div>

          <SuccessMessage
            completedCount={completedCount}
            totalCount={totalCount}
            isFullSuccess={isFullSuccess}
          />

          {failedCount > 0 && (
            <FailedTracksLink
              failedCount={failedCount}
              onClick={onViewFailedTracks}
            />
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-center gap-3 pb-6">
        <Button
          variant="outline"
          onClick={handleOpenFolder}
          aria-label={t('completion.openFolder')}
          className="gap-2"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          {t('completion.openFolder')}
        </Button>

        <Button
          variant="ghost"
          onClick={onDownloadAnother}
          aria-label={t('completion.downloadAnother')}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('completion.downloadAnother')}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

[Source: ux-design-specification.md - CompletionPanel Component]

### SuccessMessage Component

```typescript
// src/components/features/download/SuccessMessage.tsx
import { useTranslation } from 'react-i18next';

interface SuccessMessageProps {
  completedCount: number;
  totalCount: number;
  isFullSuccess: boolean;
}

export function SuccessMessage({
  completedCount,
  totalCount,
  isFullSuccess
}: SuccessMessageProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1 text-center">
      <h2 className="text-xl font-semibold text-gray-900">
        {isFullSuccess
          ? t('completion.title')
          : t('completion.titlePartial')
        }
      </h2>
      <p className="text-sm text-gray-600">
        {isFullSuccess
          ? t('completion.allTracksDownloaded', { total: totalCount })
          : t('completion.tracksDownloaded', {
              completed: completedCount,
              total: totalCount
            })
        }
      </p>
    </div>
  );
}
```

### FailedTracksLink Component

```typescript
// src/components/features/download/FailedTracksLink.tsx
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FailedTracksLinkProps {
  failedCount: number;
  onClick: () => void;
}

export function FailedTracksLink({ failedCount, onClick }: FailedTracksLinkProps) {
  const { t } = useTranslation();

  if (failedCount === 0) return null;

  const message = failedCount === 1
    ? t('completion.failedTracksSingular')
    : t('completion.failedTracks', { count: failedCount });

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
      aria-label={`${message}. ${t('completion.viewFailed')}`}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>{message}</span>
    </button>
  );
}
```

### queueStore Selectors

Add these selectors to the queueStore for completion state:

```typescript
// src/stores/queueStore.ts
interface QueueState {
  tracks: Track[];
  // ... existing state

  // Selectors
  isComplete: () => boolean;
  getCompletedCount: () => number;
  getFailedCount: () => number;
  getTotalCount: () => number;

  // Actions
  resetQueue: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  tracks: [],

  isComplete: () => {
    const tracks = get().tracks;
    if (tracks.length === 0) return false;
    return tracks.every(t => t.status === 'complete' || t.status === 'failed');
  },

  getCompletedCount: () => {
    return get().tracks.filter(t => t.status === 'complete').length;
  },

  getFailedCount: () => {
    return get().tracks.filter(t => t.status === 'failed').length;
  },

  getTotalCount: () => {
    return get().tracks.length;
  },

  resetQueue: () => {
    set({ tracks: [], currentTrackId: null });
  },
}));
```

[Source: Story 1.4 - Configure Zustand Store Structure]

### useDownloadCompletion Hook

```typescript
// src/hooks/useDownloadCompletion.ts
import { useQueueStore } from '@/stores/queueStore';

export function useDownloadCompletion() {
  const isComplete = useQueueStore(state => state.isComplete());
  const completedCount = useQueueStore(state => state.getCompletedCount());
  const failedCount = useQueueStore(state => state.getFailedCount());
  const totalCount = useQueueStore(state => state.getTotalCount());
  const resetQueue = useQueueStore(state => state.resetQueue);

  return {
    isComplete,
    completedCount,
    failedCount,
    totalCount,
    resetQueue,
    hasFailures: failedCount > 0,
    isFullSuccess: isComplete && failedCount === 0,
  };
}
```

### Animation with Reduced Motion Support

```css
/* In your Tailwind config or global CSS */
@keyframes checkmark-draw {
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
}

.animate-checkmark {
  animation: checkmark-draw 0.3s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .animate-checkmark {
    animation: none;
  }

  .animate-in {
    animation: none !important;
  }
}
```

For Tailwind's built-in animation utilities:
```typescript
// Use motion-safe and motion-reduce variants
<div className="motion-safe:animate-in motion-safe:fade-in motion-reduce:opacity-100">
```

[Source: WCAG 2.1 - Animation from Interactions]

### Accessibility Requirements

Per UX-13, completion must be announced to screen readers:

```typescript
// Key accessibility attributes:
<Card
  role="status"
  aria-live="polite"
  aria-label={t('completion.tracksDownloaded', { completed, total })}
>
```

**Keyboard Navigation:**
- Tab moves between "Open Folder" and "Download Another" buttons
- Enter activates the focused button
- Focus should move to the completion panel when it appears

**Focus Management:**
```typescript
// Use useEffect to focus the panel when it mounts
const panelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isComplete) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      panelRef.current?.focus();
    }, 100);
  }
}, [isComplete]);

return (
  <Card ref={panelRef} tabIndex={-1} /* ... */>
```

[Source: ux-design-specification.md - Screen Reader Support]

### File Structure After This Story

```
src/
├── components/
│   └── features/
│       └── download/
│           ├── CompletionPanel.tsx      # NEW
│           ├── SuccessMessage.tsx       # NEW
│           ├── FailedTracksLink.tsx     # NEW
│           ├── TrackCard.tsx            # Existing (Story 5.1)
│           └── TrackStatusBadge.tsx     # Existing (Story 5.2)
├── hooks/
│   └── useDownloadCompletion.ts         # NEW
├── lib/
│   └── shellCommands.ts                 # NEW
├── locales/
│   ├── en.json                          # Add completion translations
│   └── fr.json                          # Add completion translations
└── stores/
    └── queueStore.ts                    # Add completion selectors

src-tauri/
└── src/
    └── commands/
        └── files.rs                     # Add open_folder command (optional)
```

[Source: architecture/project-structure-boundaries.md]

### Button Hierarchy (UX Spec)

Per UX specification:
- **Primary** (solid indigo): Main action - not used here, "Download" is in preview
- **Secondary** (outline): "Open Folder" - the recommended action
- **Ghost** (text only): "Download Another" - less prominent option

```typescript
<Button variant="outline">Open Folder</Button>  // Prominent action
<Button variant="ghost">Download Another</Button>  // Secondary option
```

[Source: ux-design-specification.md - Button Hierarchy]

### Integration with Error Panel (Story 7.3)

The "View details" link in FailedTracksLink should integrate with the error panel:

```typescript
// Parent component manages the connection
function DownloadProgress() {
  const [showErrorPanel, setShowErrorPanel] = useState(false);

  const handleViewFailedTracks = () => {
    setShowErrorPanel(true);
    // Or scroll to error panel if it's always visible
  };

  return (
    <>
      {isComplete && (
        <CompletionPanel
          // ...props
          onViewFailedTracks={handleViewFailedTracks}
        />
      )}

      {showErrorPanel && <ErrorPanel />}
    </>
  );
}
```

[Source: Story 7.3 - Create Error Panel Component]

### Anti-Patterns to Avoid

- Do NOT frame partial completion as failure - emphasize success count
- Do NOT use `@tauri-apps/api/shell` - this is Tauri 1.x, use `@tauri-apps/plugin-shell` for Tauri 2.0
- Do NOT use error colors for partial success - use success styling with neutral secondary info
- Do NOT steal window focus when opening folder - app should stay usable
- Do NOT block UI while opening folder - use async/await properly
- Do NOT hardcode paths - use settingsStore downloadPath
- Do NOT use `any` type - properly type all props and state
- Do NOT skip animation for reduced motion - respect user preferences
- Do NOT forget aria-live for screen reader announcements

[Source: project-context.md - Anti-Patterns to Avoid]

### Shadcn/ui Components to Use

Search the Shadcn registry for these components before implementation:
- `Card`, `CardContent`, `CardFooter` - For panel container
- `Button` - For action buttons (outline and ghost variants)
- Icons from Lucide React: `CheckCircle`, `FolderOpen`, `RefreshCw`, `AlertTriangle`

Use the Shadcn MCP server to verify component availability and patterns.

[Source: project-context.md - Shadcn/ui Requirement]

### Testing Checklist

**Manual Testing:**
- [ ] Completion panel appears when all tracks finish (success or failed)
- [ ] Full success shows "Download complete!" with green checkmark
- [ ] Partial success shows "X of Y tracks downloaded" with context
- [ ] "Open Folder" button opens system file browser to download location
- [ ] App stays open after opening folder (no focus steal)
- [ ] "Download Another" resets UI to initial state
- [ ] Failed tracks link appears only when there are failures
- [ ] Clicking failed tracks link shows/scrolls to error panel
- [ ] Works on macOS (Finder opens)
- [ ] Works on Windows (Explorer opens)

**Accessibility Testing:**
- [ ] Screen reader announces "Download complete, X of Y tracks"
- [ ] Can Tab between buttons
- [ ] Enter activates focused button
- [ ] Focus moves to panel when it appears
- [ ] Animation respects prefers-reduced-motion

**Edge Cases:**
- [ ] Single track download shows "1 of 1 tracks"
- [ ] All tracks failed shows proper messaging (rare but possible)
- [ ] Download path doesn't exist - shows error gracefully
- [ ] Very long download path truncates properly

### Dependencies

**Depends on:**
- Story 1.4: Configure Zustand Store Structure (queueStore exists)
- Story 5.1: Create Track List Component (TrackCard for context)
- Story 5.2: Implement Per-Track Status Display (status types)
- Story 6.1: Implement Folder Selection Dialog (downloadPath in settingsStore)

**Blocks:**
- Story 7.3: Create Error Panel Component (FailedTracksLink integration)

**Related:**
- Story 5.5: Subscribe to Backend Progress Events (triggers completion state)

### References

- [Source: epics.md - Story 6.4 Acceptance Criteria]
- [Source: epics.md - UX-4: "Open Folder" button appears at download completion]
- [Source: epics.md - UX-5: Partial completion framed as success with context]
- [Source: epics.md - UX-13: Screen reader announcements for completion]
- [Source: ux-design-specification.md - CompletionPanel Component]
- [Source: ux-design-specification.md - Emotional Design Principles]
- [Source: ux-design-specification.md - Button Hierarchy]
- [Source: project-context.md - Tauri IPC Rules]
- [Source: project-context.md - Anti-Patterns to Avoid]
- [Tauri 2.0 Shell Plugin Documentation](https://v2.tauri.app/plugin/shell/)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

