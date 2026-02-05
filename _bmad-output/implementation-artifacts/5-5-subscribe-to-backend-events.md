# Story 5.5: Subscribe to Backend Progress Events

Status: ready-for-dev

## Story

As a **developer**,
I want **React components to receive real-time progress updates from the Rust backend**,
so that **the UI reflects backend state accurately and users see live download progress**.

## Acceptance Criteria

1. **Given** the Tauri event system from Epic 4
   **When** a custom hook `useDownloadProgress` is created
   **Then** it subscribes to `download-progress` events from Rust
   **And** it returns current queue state to consuming components
   (ARCH-8: Implement Tauri Events pattern for Rust to React progress streaming)

2. **Given** the hook is mounted
   **When** progress events are emitted from backend
   **Then** the hook updates the queue store with new status
   **And** connected components re-render with fresh data
   **And** updates are processed within 500ms (NFR3: Progress updates display within 500ms of status change)

3. **Given** the event payload structure
   **When** an event is received
   **Then** it includes: trackId, status, percent (if applicable), error (if failed)
   **And** the payload matches TypeScript types in `/src/types/events.ts`

4. **Given** the component unmounts
   **When** the hook cleans up
   **Then** the event listener is properly unsubscribed
   **And** no memory leaks occur

5. **Given** multiple events arrive rapidly
   **When** processing updates
   **Then** the UI remains responsive (NFR2: UI responds to user input within 100ms during downloads)
   **And** state updates are batched appropriately

## Tasks / Subtasks

- [ ] Task 1: Create event types file (AC: #3)
  - [ ] 1.1 Create `/src/types/events.ts` with event payload interfaces
  - [ ] 1.2 Define `DownloadProgressEvent` interface matching Rust payload
  - [ ] 1.3 Define `TrackStatus` type union
  - [ ] 1.4 Export all types as named exports

- [ ] Task 2: Create useDownloadProgress hook (AC: #1, #2)
  - [ ] 2.1 Create `/src/hooks/useDownloadProgress.ts`
  - [ ] 2.2 Import `listen` from `@tauri-apps/api/event`
  - [ ] 2.3 Import `useQueueStore` for state updates
  - [ ] 2.4 Set up event listener in `useEffect`
  - [ ] 2.5 Parse and validate incoming event payload
  - [ ] 2.6 Call `updateTrackStatus` on queue store with event data

- [ ] Task 3: Implement cleanup on unmount (AC: #4)
  - [ ] 3.1 Store the unlisten function from `listen()` return value
  - [ ] 3.2 Return cleanup function in `useEffect` that calls unlisten
  - [ ] 3.3 Verify no stale listeners remain after unmount

- [ ] Task 4: Add completion event handling (AC: #2)
  - [ ] 4.1 Handle `download-complete` event for queue completion
  - [ ] 4.2 Handle `rate-limit` event for rate limit status
  - [ ] 4.3 Update queue store with completion/rate-limit state

- [ ] Task 5: Create Tauri listen wrapper (AC: #1, #4)
  - [ ] 5.1 Create or update `/src/lib/tauri.ts`
  - [ ] 5.2 Add typed wrapper for `listen` function
  - [ ] 5.3 Add proper error handling for listen failures

- [ ] Task 6: Verify TypeScript type safety (AC: #3)
  - [ ] 6.1 Ensure event payload types match project-context.md definitions
  - [ ] 6.2 Add type guards for runtime payload validation
  - [ ] 6.3 Verify no TypeScript errors in strict mode

- [ ] Task 7: Test hook integration (AC: #2, #5)
  - [ ] 7.1 Create a test component that uses the hook
  - [ ] 7.2 Verify store updates trigger re-renders
  - [ ] 7.3 Verify UI responsiveness during rapid updates

## Dev Notes

### Tauri Event Listener Pattern

**From Architecture (ARCH-8):**

The Tauri `listen` API is used for Rust-to-React communication. Events are push-based and ideal for streaming progress updates.

```typescript
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Basic pattern
const unlisten = await listen<PayloadType>('event-name', (event) => {
  console.log('Received:', event.payload);
});

// Cleanup
unlisten();
```

**Event naming convention:** Always kebab-case (`download-progress`, `auth-state-changed`)

[Source: project-context.md#Tauri IPC]

### useDownloadProgress Hook Implementation

```typescript
// src/hooks/useDownloadProgress.ts
import { useEffect, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useQueueStore } from '@/stores/queueStore';
import type { DownloadProgressEvent } from '@/types/events';

export function useDownloadProgress() {
  const updateTrackStatus = useQueueStore((state) => state.updateTrackStatus);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    // Subscribe to download-progress events
    const setupListener = async () => {
      unlistenRef.current = await listen<DownloadProgressEvent>(
        'download-progress',
        (event) => {
          const { trackId, status, percent, error } = event.payload;
          updateTrackStatus(trackId, status, error);
        }
      );
    };

    setupListener();

    // Cleanup on unmount
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [updateTrackStatus]);
}
```

[Source: architecture/project-structure-boundaries.md#State Boundaries]

### Event Payload Structure (MUST Match Exactly)

**From project-context.md:**

```typescript
// src/types/events.ts

// Track status values - must match Rust backend
export type TrackStatus =
  | 'pending'
  | 'downloading'
  | 'converting'
  | 'complete'
  | 'failed';

// download-progress event payload
export interface DownloadProgressEvent {
  trackId: string;
  status: TrackStatus;
  percent: number;
  error?: {
    code: string;
    message: string;
  };
}

// Additional events
export interface RateLimitEvent {
  isRateLimited: boolean;
  resumeAt?: number; // Unix timestamp
}

export interface DownloadCompleteEvent {
  totalTracks: number;
  successCount: number;
  failedCount: number;
}
```

**CRITICAL:** These TypeScript types MUST mirror the Rust structs in `src-tauri/src/models/events.rs`.

[Source: project-context.md#IPC Payload Structure]

### Queue Store Update Pattern

The hook should call the queue store's `updateTrackStatus` action:

```typescript
// In queueStore.ts (from Story 1.4)
updateTrackStatus: (id: string, status: Track['status'], error?: Track['error']) =>
  set((state) => ({
    tracks: state.tracks.map((track) =>
      track.id === id ? { ...track, status, error } : track
    ),
  })),
```

**Action naming prefixes:**
- `set` - replace value
- `update` - partial update (use this for status changes)
- `add` - add to collection
- `remove` - remove from collection
- `clear` - reset to empty

[Source: project-context.md#Zustand Rules]

### Cleanup on Unmount

**Critical:** Always clean up event listeners to prevent memory leaks.

```typescript
useEffect(() => {
  let unlisten: UnlistenFn | null = null;

  const setup = async () => {
    unlisten = await listen<DownloadProgressEvent>('download-progress', handler);
  };

  setup();

  // This runs when component unmounts
  return () => {
    if (unlisten) {
      unlisten();
    }
  };
}, []);
```

**Why `useRef` for unlisten:**
- The `listen` function is async, returning a Promise
- We need to store the unlisten function for cleanup
- Using `useRef` avoids triggering re-renders

[Source: React hooks best practices]

### Event Types (Kebab-Case Convention)

| Event Name | Direction | Purpose |
|------------|-----------|---------|
| `download-progress` | Rust -> React | Per-track progress updates |
| `download-complete` | Rust -> React | Queue finished processing |
| `rate-limit` | Rust -> React | Rate limit status changes |
| `auth-state-changed` | Rust -> React | Auth status changes |

[Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]

### Typed Tauri Listen Wrapper

Create a typed wrapper in `/src/lib/tauri.ts`:

```typescript
// src/lib/tauri.ts
import { listen as tauriListen, UnlistenFn } from '@tauri-apps/api/event';
import type { DownloadProgressEvent, RateLimitEvent, DownloadCompleteEvent } from '@/types/events';

// Type-safe event listener map
type EventPayloadMap = {
  'download-progress': DownloadProgressEvent;
  'download-complete': DownloadCompleteEvent;
  'rate-limit': RateLimitEvent;
};

export async function listenTyped<K extends keyof EventPayloadMap>(
  event: K,
  handler: (payload: EventPayloadMap[K]) => void
): Promise<UnlistenFn> {
  return tauriListen<EventPayloadMap[K]>(event, (e) => handler(e.payload));
}
```

[Source: project-context.md#Framework-Specific Rules]

### Performance Considerations (NFR2, NFR3)

**NFR2:** UI responds to user input within 100ms during downloads
**NFR3:** Progress updates display within 500ms of status change

To ensure responsiveness:

1. **Avoid blocking operations** in event handlers
2. **Use React's batching** - Zustand updates are already batched
3. **Don't re-render entire lists** - use proper keys and memoization
4. **Selector optimization** - select only needed state slices

```typescript
// Good: Select only what you need
const trackStatus = useQueueStore((state) =>
  state.tracks.find(t => t.id === trackId)?.status
);

// Bad: Select entire state (causes unnecessary re-renders)
const { tracks } = useQueueStore();
```

[Source: NFR2, NFR3 from epics.md]

### Anti-Patterns to Avoid

1. **DON'T** create new listener on every render:
   ```typescript
   // WRONG - creates new listener every render
   listen('download-progress', handler);

   // RIGHT - use useEffect with cleanup
   useEffect(() => { ... }, []);
   ```

2. **DON'T** forget cleanup:
   ```typescript
   // WRONG - memory leak
   useEffect(() => {
     listen('event', handler);
   }, []);

   // RIGHT - cleanup on unmount
   useEffect(() => {
     const setup = async () => { unlisten = await listen(...) };
     setup();
     return () => unlisten?.();
   }, []);
   ```

3. **DON'T** use default exports:
   ```typescript
   // WRONG
   export default useDownloadProgress;

   // RIGHT
   export function useDownloadProgress() { }
   ```

4. **DON'T** use `any` types for event payloads:
   ```typescript
   // WRONG
   listen('download-progress', (event: any) => { });

   // RIGHT
   listen<DownloadProgressEvent>('download-progress', (event) => { });
   ```

[Source: project-context.md#Anti-Patterns to Avoid]

### File Structure After This Story

```
src/
├── hooks/
│   └── useDownloadProgress.ts   # NEW - Event subscription hook
├── lib/
│   └── tauri.ts                 # NEW or UPDATE - Typed wrappers
├── types/
│   ├── track.ts                 # From Story 1.4
│   ├── errors.ts                # From Story 1.4
│   └── events.ts                # NEW - Event payload types
└── stores/
    └── queueStore.ts            # From Story 1.4 (uses updateTrackStatus)
```

[Source: architecture/project-structure-boundaries.md]

### Cross-Language Type Safety

**CRITICAL:** When the Rust backend implements `download-progress` events (Epic 4), the payload structure MUST match:

```rust
// src-tauri/src/models/events.rs
#[derive(Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub track_id: String,
    pub status: TrackStatus,
    pub percent: f32,
    pub error: Option<ErrorPayload>,
}

#[derive(Serialize, Deserialize)]
pub enum TrackStatus {
    Pending,
    Downloading,
    Converting,
    Complete,
    Failed,
}
```

**Note:** Rust uses snake_case for struct fields, but serde will serialize to camelCase when configured with `#[serde(rename_all = "camelCase")]`.

[Source: project-context.md#Cross-Language Type Safety]

### What This Story Does NOT Include

- Rust backend event emission (Epic 4: Download Engine)
- Visual progress components (Story 5.1-5.4)
- Rate limit UI banner (Story 5.4)
- Auth event handling (Epic 2)

This story creates the frontend infrastructure for receiving events. The backend implementation and visual components are separate stories.

### Testing Checklist

After completing all tasks:

1. [ ] `useDownloadProgress` hook imports without errors
2. [ ] TypeScript provides full type safety for event payloads
3. [ ] Hook properly cleans up listener on component unmount
4. [ ] Event types in `events.ts` match project-context.md exactly
5. [ ] No TypeScript strict mode violations
6. [ ] Queue store updates correctly when events are received
7. [ ] Multiple rapid events don't cause UI freezing

**Manual Testing (when backend is ready):**
- Trigger a download and verify progress events update the UI
- Unmount component during download and verify no console errors
- Verify UI responsiveness during active downloads

### References

- [Source: project-context.md#Tauri IPC]
- [Source: project-context.md#IPC Payload Structure]
- [Source: project-context.md#Zustand Rules]
- [Source: project-context.md#Anti-Patterns to Avoid]
- [Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]
- [Source: architecture/implementation-patterns-consistency-rules.md#Zustand Store Organization]
- [Source: architecture/project-structure-boundaries.md#State Boundaries]
- [Source: epics.md#Epic 5: Progress & Real-time Status]
- [Source: epics.md#NFR2, NFR3]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

