# Story 1.4: Configure Zustand Store Structure

Status: ready-for-dev

## Story

As a **developer**,
I want **Zustand state management configured with the core store structure**,
so that **application state can be managed consistently across components**.

## Acceptance Criteria

1. **Given** the project with React configured
   **When** Zustand is installed and configured
   **Then** the following store files are created:
   - `/src/stores/authStore.ts` — Auth state skeleton
   - `/src/stores/queueStore.ts` — Download queue state skeleton
   - `/src/stores/settingsStore.ts` — User preferences skeleton

2. **Given** the stores are created
   **When** examining each store
   **Then** each store has TypeScript interfaces for its state shape
   **And** each store exports a typed hook (e.g., `useAuthStore`)
   **And** stores follow the pattern from Architecture spec

3. **Given** the settings store exists
   **When** the app launches
   **Then** the settings store initializes with default values:
   - `downloadPath`: system default downloads folder
   - `language`: `'en'`

4. **Given** stores are configured
   **When** importing a store hook in a component
   **Then** TypeScript provides full type inference
   **And** actions are callable with correct parameter types

## Tasks / Subtasks

- [ ] Task 1: Install Zustand (AC: #1)
  - [ ] 1.1 Run `npm install zustand`
  - [ ] 1.2 Create `/src/stores/` directory

- [ ] Task 2: Create authStore (AC: #1, #2)
  - [ ] 2.1 Create `src/stores/authStore.ts`
  - [ ] 2.2 Define `AuthState` interface:
    ```typescript
    interface AuthState {
      isSignedIn: boolean;
      username: string | null;
      // Actions
      setAuth: (isSignedIn: boolean, username: string | null) => void;
      clearAuth: () => void;
    }
    ```
  - [ ] 2.3 Implement store with `create<AuthState>()`
  - [ ] 2.4 Export `useAuthStore` hook

- [ ] Task 3: Create queueStore (AC: #1, #2)
  - [ ] 3.1 Create `src/stores/queueStore.ts`
  - [ ] 3.2 Define `Track` and `QueueState` interfaces:
    ```typescript
    interface Track {
      id: string;
      title: string;
      artist: string;
      artworkUrl: string | null;
      status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
      error?: { code: string; message: string };
    }

    interface QueueState {
      tracks: Track[];
      currentIndex: number;
      // Actions
      setTracks: (tracks: Track[]) => void;
      updateTrackStatus: (id: string, status: Track['status'], error?: Track['error']) => void;
      clearQueue: () => void;
    }
    ```
  - [ ] 3.3 Implement store with actions
  - [ ] 3.4 Export `useQueueStore` hook

- [ ] Task 4: Create settingsStore with persistence (AC: #1, #2, #3)
  - [ ] 4.1 Create `src/stores/settingsStore.ts`
  - [ ] 4.2 Define `SettingsState` interface:
    ```typescript
    interface SettingsState {
      downloadPath: string;
      language: 'en' | 'fr';
      // Actions
      setDownloadPath: (path: string) => void;
      setLanguage: (lang: 'en' | 'fr') => void;
    }
    ```
  - [ ] 4.3 Implement store with default values
  - [ ] 4.4 Add Zustand persist middleware for settings persistence
  - [ ] 4.5 Export `useSettingsStore` hook

- [ ] Task 5: Create shared types file (AC: #4)
  - [ ] 5.1 Create `src/types/track.ts` with Track interface
  - [ ] 5.2 Create `src/types/errors.ts` with error code types
  - [ ] 5.3 Import types in stores from `@/types/`

- [ ] Task 6: Verify TypeScript integration (AC: #4)
  - [ ] 6.1 Import `useAuthStore` in a test component
  - [ ] 6.2 Verify TypeScript autocomplete works for state and actions
  - [ ] 6.3 Verify no TypeScript errors

## Dev Notes

### Zustand Store Pattern

**From Architecture:**
```typescript
// Standard Zustand pattern for this project
import { create } from 'zustand';

interface StoreState {
  // State
  value: string;
  // Actions
  setValue: (v: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  value: '',
  setValue: (v) => set({ value: v }),
}));
```
[Source: architecture/core-architectural-decisions.md#Frontend Architecture]

### Action Naming Convention

| Action Type | Prefix | Example |
|-------------|--------|---------|
| Set/replace | `set` | `setTracks`, `setAuth` |
| Update partial | `update` | `updateTrackStatus` |
| Add to collection | `add` | `addTrack` |
| Remove | `remove` | `removeTrack` |
| Clear/reset | `clear` | `clearQueue`, `clearAuth` |

[Source: project-context.md#Zustand Rules]

### State Structure from Architecture

```typescript
interface AppState {
  auth: { isSignedIn: boolean; username: string | null; };
  queue: { tracks: Track[]; currentIndex: number; };
  settings: { downloadPath: string; language: 'en' | 'fr'; };
}
```
[Source: architecture/core-architectural-decisions.md#State Structure]

### Track Status Values

Must match exactly with Rust backend event payloads:
```typescript
type TrackStatus = 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
```
[Source: project-context.md#IPC Payload Structure]

### Error Code Types

Define in `src/types/errors.ts`:
```typescript
export type ErrorCode =
  | 'INVALID_URL'
  | 'GEO_BLOCKED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'DOWNLOAD_FAILED'
  | 'CONVERSION_FAILED';

export interface AppError {
  code: ErrorCode;
  message: string;
}
```
[Source: project-context.md#Error Codes]

### Settings Persistence with Zustand

Use Zustand's persist middleware for settings:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '', // Will be set from Tauri
      language: 'en',
      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
```

**Note:** The default download path will need to be fetched from Tauri (system Downloads folder). For now, use empty string as placeholder — Epic 6 will implement folder selection.

### File Structure After This Story

```
src/
├── stores/
│   ├── authStore.ts      # Auth state + actions
│   ├── queueStore.ts     # Download queue state
│   └── settingsStore.ts  # User preferences (persisted)
├── types/
│   ├── track.ts          # Track data types
│   └── errors.ts         # Error code types
└── ...
```
[Source: architecture/project-structure-boundaries.md]

### Cross-Language Type Safety

**CRITICAL:** TypeScript types in `src/types/` MUST mirror Rust structs in `src-tauri/src/models/`.

When Rust backend is implemented (Epic 4+), these types must stay synchronized:
- `src/types/track.ts` ↔ `src-tauri/src/models/track.rs`
- `src/types/events.ts` ↔ `src-tauri/src/models/events.rs`

[Source: project-context.md#Cross-Language Type Safety]

### What This Story Does NOT Include

- Tauri event subscriptions (Epic 5: hooks like `useDownloadProgress`)
- Auth token storage (Epic 2: handled in Rust backend)
- Folder picker integration (Epic 6: File Management)
- Language switching effect (Epic 8: Settings)

Create the store structure now; integration comes in later epics.

### Anti-Patterns to Avoid

- Do NOT use Redux patterns — Zustand is simpler
- Do NOT create one global store — use domain-specific stores
- Do NOT use `any` types — full TypeScript typing required
- Do NOT use default exports — use named exports

[Source: project-context.md#Anti-Patterns to Avoid]

### Testing the Result

After completing all tasks:
1. All three stores import without errors
2. TypeScript provides autocomplete for state and actions
3. Settings persist to localStorage after page refresh
4. No TypeScript strict mode violations

### References

- [Source: architecture/core-architectural-decisions.md#Frontend Architecture]
- [Source: architecture/implementation-patterns-consistency-rules.md#Zustand Store Organization]
- [Source: project-context.md#Zustand Rules]
- [Source: project-context.md#Error Codes]
- [Source: architecture/project-structure-boundaries.md#State Boundaries]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

