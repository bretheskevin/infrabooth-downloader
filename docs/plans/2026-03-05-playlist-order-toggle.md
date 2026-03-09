# Playlist Order Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggle in PlaylistPreview that lets users choose whether playlist downloads preserve track ordering (number-prefixed filenames + ID3 track number) or not. The setting persists across app restarts.

**Architecture:** Add `preservePlaylistOrder` boolean to Zustand settings store (persisted via localStorage). Pass it through `StartQueueRequest` to the Rust backend which conditionally assigns `track_number`. A shadcn Switch component in PlaylistPreview controls the setting.

**Tech Stack:** React, Zustand, shadcn/ui Switch, Rust/Tauri, tauri-specta bindings, i18next

---

### Task 1: Add shadcn/ui Switch component

**Files:**
- Create: `src/components/ui/switch.tsx`

**Step 1: Install the Switch component via shadcn CLI**

Run: `npx shadcn@latest add switch`
Expected: Creates `src/components/ui/switch.tsx`

If the CLI doesn't work (the project may use a custom setup), create it manually:

```tsx
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

**Step 2: Verify @radix-ui/react-switch is installed**

Run: `npm ls @radix-ui/react-switch 2>/dev/null || npm install @radix-ui/react-switch`

---

### Task 2: Add `preservePlaylistOrder` to settings store

**Files:**
- Modify: `src/features/settings/store.ts`
- Modify: `src/features/settings/__test__/store.test.ts`

**Step 1: Write the failing tests**

Add these tests to `src/features/settings/__test__/store.test.ts`:

In the `initial state` describe block, add:

```ts
it('should have preservePlaylistOrder as true by default', () => {
  const { preservePlaylistOrder } = useSettingsStore.getState();
  expect(preservePlaylistOrder).toBe(true);
});
```

In a new `setPreservePlaylistOrder` describe block:

```ts
describe('setPreservePlaylistOrder', () => {
  it('should set preservePlaylistOrder to false', () => {
    const { setPreservePlaylistOrder } = useSettingsStore.getState();
    setPreservePlaylistOrder(false);

    const { preservePlaylistOrder } = useSettingsStore.getState();
    expect(preservePlaylistOrder).toBe(false);
  });

  it('should set preservePlaylistOrder back to true', () => {
    const { setPreservePlaylistOrder } = useSettingsStore.getState();
    setPreservePlaylistOrder(false);
    setPreservePlaylistOrder(true);

    const { preservePlaylistOrder } = useSettingsStore.getState();
    expect(preservePlaylistOrder).toBe(true);
  });
});
```

In the `persistence` describe block, add to the "should persist settings to localStorage" test:

```ts
// Also add after the existing assertions:
expect(parsed.state.preservePlaylistOrder).toBe(true);
```

Also add the `preservePlaylistOrder: true` to the `beforeEach` setState call.

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/features/settings/__test__/store.test.ts`
Expected: FAIL — `preservePlaylistOrder` not found in state

**Step 3: Implement the store changes**

In `src/features/settings/store.ts`:

1. Add to `SettingsState` interface (after `maxConcurrentDownloads`):
```ts
preservePlaylistOrder: boolean;
```

2. Add to actions section:
```ts
setPreservePlaylistOrder: (value: boolean) => void;
```

3. Add to the `persist` callback initial state (after `maxConcurrentDownloads: 3`):
```ts
preservePlaylistOrder: true,
```

4. Add action (after `setMaxConcurrentDownloads`):
```ts
setPreservePlaylistOrder: (value) => set({ preservePlaylistOrder: value }),
```

5. Add to `partialize` (after `maxConcurrentDownloads`):
```ts
preservePlaylistOrder: state.preservePlaylistOrder,
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/features/settings/__test__/store.test.ts`
Expected: PASS

---

### Task 3: Add i18n keys for the toggle

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/fr.json`

**Step 1: Add English translations**

In `src/locales/en.json`, add to the `"download"` section:

```json
"preserveOrder": "Number tracks",
"preserveOrderDescription": "Prefix filenames with track position (e.g. 01 - Artist - Title)"
```

**Step 2: Add French translations**

In `src/locales/fr.json`, add to the `"download"` section:

```json
"preserveOrder": "Numéroter les pistes",
"preserveOrderDescription": "Préfixer les noms de fichiers avec la position (ex: 01 - Artiste - Titre)"
```

---

### Task 4: Add toggle to PlaylistPreview component

**Files:**
- Modify: `src/features/url-input/components/PlaylistPreview.tsx`
- Modify: `src/features/url-input/components/__test__/PlaylistPreview.test.tsx`

**Step 1: Write the failing tests**

Add these tests to `src/features/url-input/components/__test__/PlaylistPreview.test.tsx`.

First, add the mock for the settings store at the top of the file (after existing mocks):

```ts
// Mock settings store
const mockSetPreservePlaylistOrder = vi.fn();
vi.mock('@/features/settings/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      preservePlaylistOrder: true,
      setPreservePlaylistOrder: mockSetPreservePlaylistOrder,
    };
    return selector(state);
  }),
}));
```

Add the `useSettingsStore` import mock reset in `beforeEach` if one exists, or add a `beforeEach`:

```ts
beforeEach(() => {
  vi.clearAllMocks();
});
```

Then add test cases in a new describe block:

```ts
describe('preserve order toggle', () => {
  it('should render the preserve order switch', () => {
    render(
      <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
    );

    expect(screen.getByTestId('preserve-order-switch')).toBeInTheDocument();
  });

  it('should render the label text', () => {
    render(
      <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
    );

    expect(screen.getByText('Number tracks')).toBeInTheDocument();
  });

  it('should be checked when preservePlaylistOrder is true', () => {
    render(
      <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
    );

    const switchEl = screen.getByTestId('preserve-order-switch');
    expect(switchEl).toHaveAttribute('data-state', 'checked');
  });

  it('should call setPreservePlaylistOrder when toggled', () => {
    render(
      <PlaylistPreview playlist={mockPlaylist} onDownload={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId('preserve-order-switch'));
    expect(mockSetPreservePlaylistOrder).toHaveBeenCalledWith(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/features/url-input/components/__test__/PlaylistPreview.test.tsx`
Expected: FAIL

**Step 3: Implement the PlaylistPreview changes**

In `src/features/url-input/components/PlaylistPreview.tsx`:

1. Add imports:
```tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/features/settings/store';
```

2. Inside the component function, add after the `artworkUrl` computation:
```tsx
const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);
const setPreservePlaylistOrder = useSettingsStore((s) => s.setPreservePlaylistOrder);
```

3. Add the toggle UI between the closing `</div>` of the info block and the `<DownloadBar>`, as a new section:
```tsx
<div className="flex items-center justify-between py-2 px-1">
  <div className="flex flex-col gap-0.5">
    <Label
      htmlFor="preserve-order"
      className="text-sm font-medium cursor-pointer"
    >
      {t('download.preserveOrder')}
    </Label>
    <span className="text-xs text-muted-foreground">
      {t('download.preserveOrderDescription')}
    </span>
  </div>
  <Switch
    id="preserve-order"
    checked={preservePlaylistOrder}
    onCheckedChange={setPreservePlaylistOrder}
    data-testid="preserve-order-switch"
  />
</div>
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/features/url-input/components/__test__/PlaylistPreview.test.tsx`
Expected: PASS

---

### Task 5: Add `preserveOrder` to Rust `StartQueueRequest` and conditionally assign track numbers

**Files:**
- Modify: `src-tauri/src/commands/download.rs`

**Step 1: Add `preserve_order` field to `StartQueueRequest`**

In `src-tauri/src/commands/download.rs`, add to the `StartQueueRequest` struct (after `max_concurrent`):

```rust
pub preserve_order: Option<bool>,
```

**Step 2: Modify `start_download_queue` to conditionally assign track_number**

In the `start_download_queue` function, change the `.map` closure from:

```rust
track_number: Some((i + 1) as u32),
```

to:

```rust
track_number: if request.preserve_order.unwrap_or(true) {
    Some((i + 1) as u32)
} else {
    None
},
```

Note: We need to capture `preserve_order` before the `request.tracks` is consumed. Move the `preserve_order` read above the iterator:

```rust
let preserve_order = request.preserve_order.unwrap_or(true);

let items: Vec<QueueItem> = request
    .tracks
    .into_iter()
    .enumerate()
    .map(|(i, t)| QueueItem {
        track_url: t.track_url,
        track_id: t.track_id,
        title: t.title,
        artist: t.artist,
        artwork_url: t.artwork_url,
        track_number: if preserve_order {
            Some((i + 1) as u32)
        } else {
            None
        },
        duration_ms: t.duration_ms,
    })
    .collect();
```

**Step 3: Update the existing test**

Find the test in `download.rs` that creates a `StartQueueRequest` and add `preserve_order: None` to it. Search for `StartQueueRequest` in the test module and add the field.

**Step 4: Run Rust checks**

Run: `cd src-tauri && cargo check`
Expected: PASS (may show warnings about unused variables, that's fine)

---

### Task 6: Regenerate TypeScript bindings

**Files:**
- Modify: `src/bindings.ts` (auto-generated)

**Step 1: Regenerate bindings**

Run: `cd src-tauri && cargo build`

This should auto-regenerate `src/bindings.ts` via tauri-specta. Check that `StartQueueRequest` now includes `preserveOrder: boolean | null`.

**Step 2: Verify the new type**

Run: `grep -A5 'StartQueueRequest' src/bindings.ts`
Expected: Should show `preserveOrder: boolean | null` in the type

---

### Task 7: Pass `preservePlaylistOrder` from frontend to backend

**Files:**
- Modify: `src/features/queue/hooks/useDownloadFlow.ts`
- Modify: `src/features/queue/hooks/useRetryTracks.ts`

**Step 1: Update `useDownloadFlow.ts`**

In `handleDownload`, where `startDownloadQueue` is called, add `preserveOrder`:

```ts
const { downloadPath, maxConcurrentDownloads, preservePlaylistOrder } = useSettingsStore.getState();
```

And in the `startDownloadQueue` call, add:

```ts
await startDownloadQueue({
  tracks: queueTracks.map(queueTrackToDownloadRequest),
  albumName: albumName ?? null,
  outputDir: outputDir ?? null,
  maxConcurrent: maxConcurrentDownloads,
  preserveOrder: preservePlaylistOrder,
});
```

**Step 2: Update `useRetryTracks.ts`**

In `executeRetry`, add `preservePlaylistOrder` to the destructured settings:

```ts
const { maxConcurrentDownloads, preservePlaylistOrder } = useSettingsStore.getState();
```

And in the `startDownloadQueue` call:

```ts
await startDownloadQueue({
  tracks: tracks.map(queueTrackToDownloadRequest),
  albumName: null,
  outputDir: outputDir ?? null,
  maxConcurrent: maxConcurrentDownloads,
  preserveOrder: preservePlaylistOrder,
});
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

### Task 8: Update frontend tests for the new parameter

**Files:**
- Modify: `src/features/queue/hooks/__test__/useDownloadFlow.test.ts`
- Modify: `src/features/queue/hooks/__test__/useRetryTracks.test.ts`
- Modify: `src/features/queue/api/__test__/download.test.ts`

**Step 1: Update useDownloadFlow tests**

In `src/features/queue/hooks/__test__/useDownloadFlow.test.ts`:

Find where `useSettingsStore` mock state is set up and add `preservePlaylistOrder: true` to the mock state.

Find all `expect(mockStartDownloadQueue).toHaveBeenCalledWith(...)` assertions and add `preserveOrder: true` to the expected objects.

**Step 2: Update useRetryTracks tests**

In `src/features/queue/hooks/__test__/useRetryTracks.test.ts`:

Add `preservePlaylistOrder: true` to any `useSettingsStore` mock state.

Find all `expect(startDownloadQueue).toHaveBeenCalledWith(...)` assertions and add `preserveOrder: true` to the expected objects.

**Step 3: Update download API tests**

In `src/features/queue/api/__test__/download.test.ts`:

Find all `startDownloadQueue` test calls and add `preserveOrder: true` (or `null`) to the request objects.

**Step 4: Run all tests**

Run: `npm test -- --run`
Expected: PASS

---

### Task 9: Full verification

**Step 1: Run TypeScript type checking**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Run all frontend tests**

Run: `npm test -- --run`
Expected: PASS

**Step 3: Run Rust checks**

Run: `cd src-tauri && cargo check`
Expected: PASS

**Step 4: Manual smoke test**

Run: `npm run tauri dev`

Verify:
1. Paste a playlist URL — toggle appears in PlaylistPreview with "Number tracks" label
2. Toggle is ON by default
3. Toggle the switch OFF, close the app, reopen — switch should still be OFF
4. Download with toggle ON — files prefixed with numbers (e.g., `01 - Artist - Title.mp3`)
5. Download with toggle OFF — files without number prefix (e.g., `Artist - Title.mp3`)
