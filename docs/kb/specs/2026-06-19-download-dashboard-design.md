# Download Dashboard & Live Queue Management — Design

**Date:** 2026-06-19
**Scope:** Large (multi-subsystem) — delivered in 3 phases
**Status:** Design finalized, ready for implementation planning

## Problem

Today the download flow is a single-batch, mutually-exclusive UI state machine. While a
download runs the entire main UI is hidden, the queue is replace-only, the backend is a
one-shot batch, and cancellation is all-or-nothing. The user cannot follow multiple
downloads, keep working while downloading, add to a running queue, or control individual
items.

### Current constraints (verified)

- **Frontend state machine** — `useDownloadPipeline.ts` returns one of `complete | processing | pending | main`. When `isProcessing`, `DownloadTab` renders only `ProgressPanel`; the whole `DownloadMainView` (URL input, Discover, Selections) is hidden.
- **Replace-only queue** — `queueStateSlice.ts:14` `enqueueTracks` does `set({ ...INITIAL_QUEUE_STATE, tracks })`. No append. `useSyncToQueue` re-replaces on every media fetch.
- **One-shot backend** — `start_download_queue` (`download.rs:106`) builds a fixed `Vec<QueueItem>` and spawns one tokio task running `DownloadQueue::process()` to completion. Pending set `(0..items.len())` is frozen at start. No mid-run injection.
- **Global cancel** — `cancel_download_queue` flips one `watch::<bool>` and kills *all* active ffmpeg processes (`cancellation.rs`). No per-track cancel. **But** `active_processes: HashMap<String, ActiveProcess>` is already keyed by `track_id` — per-track kill is nearly free.
- **No persistence** — all state is in-memory (Zustand + Rust).

## Requirements (from brainstorming)

1. **Background UX** — downloads run while the user browses/searches/adds. A docked mini-panel shows live status from anywhere; expands to a full dashboard. **Dock hides when idle.**
2. **Append to running queue** — new tracks join the live run and start as semaphore slots free up.
3. **Per-track control** — cancel/remove one track, retry failed tracks, reorder/prioritize pending. (No pause/resume.)
4. **Persisted history** — completed/failed downloads survive restarts; actions: open file/folder, re-download, clear (per-item + all), filter/search.
5. **Responsive layout only** — wide → corner dock + side panel; narrow → bottom dock + full-screen sheet. Mouse-only interactions (drag = mouse). **No touch gestures, no phone targets.** CLAUDE.md desktop-only rule stays.

### Out of scope

- Touch gestures / real mobile devices (CLAUDE.md remains desktop-only).
- Pause/resume of the whole queue.
- Multi-queue / named queues. One live queue.

## Architecture decision

**Backend: Persistent `QueueManager` singleton in Tauri state** (chosen over frontend-orchestrated and job-stack).

Evolve `DownloadQueue` from a one-shot batch into a long-lived singleton owned by Tauri
`State` (registered in `lib.rs` alongside `CancellationState`). The processing loop stays
alive and waits for new work instead of exiting when `pending` is empty. Pending state lives
behind a mutex; new commands mutate it. Per-track cancel reuses the existing
`active_processes` map keyed by `track_id`. Reuses today's `Semaphore` concurrency and
rate-limit pause machinery.

Rationale: keeps orchestration backend-side (project convention), preserves the single source
of truth for concurrency + rate-limit coordination, and the existing loop already works in
phases (drain → spawn → check-done) so the change is "don't exit; await new items."

---

## Phase 1 — Non-blocking dashboard + dock (frontend only)

**Goal:** Stop the processing view from taking over. Downloads run in the background; a dock
shows live status everywhere; a full dashboard is reachable without losing the main UI.

**No backend changes.** Pure frontend restructure of the view state machine.

### Changes

1. **Decouple the pipeline view from the page.** `useDownloadPipeline.ts` currently collapses
   the page into `processing`/`pending`/`complete`. Instead, the main view (`DownloadMainView`)
   stays mounted and usable at all times. Download status becomes an *overlay concern*, not a
   page-replacing state.
2. **New `DownloadDock` component** — a docked mini-panel showing aggregate progress
   (`X/Y`, current item, % ) sourced from `useQueueProgress` / `useQueueStore`. Hidden when
   idle (no active/pending items and dismissed). Slides in on first activity.
   - Wide viewport: fixed corner card.
   - Narrow viewport: bottom bar (responsive via Tailwind breakpoints — `cn` + `md:`).
3. **`DownloadDashboard`** — expanded view (side panel on wide, full-screen sheet on narrow)
   reusing `ProgressPanel` / `TrackList` / `OverallProgress`. Opened from the dock.
4. **Completion no longer wipes state.** `CompletionPanel` becomes a summary surfaced inside
   the dashboard/dock rather than a page takeover; "Download another" no longer needs to
   `clearQueue()` to free the main UI (main UI is always available).

### Files

- `src/features/download/hooks/useDownloadPipeline.ts` — reduce to feeding the dock/dashboard, not gating the page.
- `src/features/download/components/DownloadTab.tsx` — render `DownloadMainView` always; mount dock/dashboard alongside.
- `src/features/download/components/DownloadDock.tsx` *(new)*, `DownloadDashboard.tsx` *(new)*.
- `src/features/queue/store/*` — add a `dashboardOpen` / `dockDismissed` UI flag slice (or local component state).
- `src/locales/{en,fr}.json` — dock/dashboard strings.

### Acceptance

- Starting a download leaves URL input, Discover, and Selections fully usable.
- Dock appears on activity, shows live aggregate progress, hides when idle.
- Dashboard opens/closes without interrupting downloads.
- Layout reflows correctly at narrow widths (mouse only).

---

## Phase 2 — Live queue: append + per-track cancel/retry/reorder

**Goal:** The dashboard becomes interactive and the backend queue becomes long-lived.

### Backend

1. **`QueueManager` service** (`src-tauri/src/services/queue.rs`, extend or split into
   `queue_manager.rs`) — long-lived singleton in Tauri state:
   - Shared mutable `pending: VecDeque<QueueItem>` + `started`/`active` tracking behind
     `Arc<Mutex<…>>` (or an actor task fed by an `mpsc` command channel).
   - Processing loop: drain completed → spawn while permits available → **await new items
     instead of exiting** when pending empty and nothing active (until app/queue shutdown).
2. **New Tauri commands** (`download.rs`):
   - `enqueue_tracks(tracks, album_name?, output_dir?)` — append to the live `pending`
     (replaces the "replace-only" semantics; idempotent on `track_id`).
   - `remove_track(track_id)` — drop from pending; if active, kill just that process.
   - `cancel_track(track_id)` — kill one entry in `active_processes` (keyed by id already).
   - `reorder_pending(ordered_track_ids)` — reorder the `pending` VecDeque.
   - `retry_track(track_id)` — re-append a previously-failed track.
   - Keep `cancel_download_queue` as "cancel all."
3. **Per-track cancel** reuses `CancellationState.active_processes` + `kill_process_tree`. Add
   a `kill_process(track_id)` helper next to `kill_active_processes`.
4. **Events** — keep `queue-progress` / `download-progress` (per-track) for granular updates;
   the front already listens per `track_id` in `store/index.ts`. Add an event for
   pending-set mutations if needed (or reconcile from frontend store state on command return).

### Frontend

1. **Append semantics** — `enqueueTracks` slice gains an *append* mode; `useSyncToQueue` /
   `useDownloadInitiator` call the new `enqueue_tracks` command instead of starting a fresh
   batch when a queue is already live.
2. **Per-row actions** in `TrackCard` / dashboard: cancel/remove (any state), retry (failed),
   drag-to-reorder (pending) — mouse-only drag (e.g. `@dnd-kit` or native HTML5 DnD; pick
   per existing deps — check `package.json` before adding a lib).
3. **Reorder** affects pending order only (in-flight tracks are not reordered).

### Files

- `src-tauri/src/services/queue.rs` (+ possible `queue_manager.rs`), `cancellation.rs`, `download.rs`, `lib.rs` (`.manage(QueueManager)`, register commands/events).
- `src/features/queue/store/queueStateSlice.ts` (append + remove + reorder + retry actions), `src/features/queue/api/download.ts`, `hooks/useDownloadInitiator.ts`, `useSyncToQueue.ts`.
- `src/features/progress/components/TrackCard.tsx`, dashboard components.
- `src/bindings.ts` regenerates automatically via tauri-specta (`npm run tauri dev`) — never hand-edit.

### Acceptance

- Adding a playlist/track while a queue runs appends without restarting in-flight downloads.
- Removing/cancelling one track leaves the rest running.
- Failed tracks can be retried individually.
- Pending tracks reorder via mouse drag; order is respected by the spawn loop.

---

## Phase 3 — Persisted history

**Goal:** Completed/failed downloads survive restarts with management actions.

### Approach

- **Persistence layer:** frontend `zustand persist` (matches `settings/store.ts` and
  `changelog/store.ts` conventions) for the history list metadata (title, artist, status,
  filePath, timestamp, source URL). A new `useHistoryStore`.
  - Alternative if durable-on-disk-JSON is preferred backend-side: mirror the
    `SeenArtistsState::load` file pattern in `lib.rs`/`services/`. Decide at Phase 3 design;
    default to the frontend persist convention unless file paths/size argue otherwise.
- **Population:** on `queue-complete` / per-track completion/failure, push entries into history.
- **Actions:** open file/folder (Tauri `opener`/`shell` reveal — check existing reveal usage),
  re-download (re-`enqueue_tracks` from stored `TrackCore`), clear per-item + clear all,
  filter/search by title/artist/status.
- **History view** lives in the dashboard (tab or section): completed/failed list, reuse
  `TrackCard` styling, virtualized via `useVirtualizedList` for long histories.

### Files

- `src/features/download/store/historyStore.ts` *(new)*, `components/HistoryList.tsx` *(new)*.
- Wire into `DownloadDashboard`. Reveal-in-folder command in `download.rs` if not already present.
- `src/locales/{en,fr}.json`.

### Acceptance

- History persists across restarts; shows completed + failed.
- Open-file/folder, re-download, clear (item + all), and filter/search all work.

---

## Pattern References

New code must mirror these existing files:

| Concern | Reference file |
|---------|----------------|
| Backend queue engine / processing loop | `src-tauri/src/services/queue.rs` |
| Per-track process tracking + kill | `src-tauri/src/services/cancellation.rs` (`active_processes` keyed by `track_id`, `kill_process_tree`) |
| Tauri command + tauri-specta + State injection | `src-tauri/src/commands/download.rs` (`start_download_queue`, `State<CancellationState>`) |
| Backend singleton registration | `src-tauri/src/lib.rs` (`.manage(CancellationState::default())`, `collect_commands!`, `collect_events!`) |
| Backend file persistence (Phase 3 alt) | `SeenArtistsState::load` in `lib.rs` / `services/new_tracks.rs` |
| Zustand slice pattern | `src/features/queue/store/queueStateSlice.ts` |
| Zustand persist pattern (Phase 3) | `src/features/settings/store.ts`, `src/features/changelog/store.ts` |
| Event listener wiring | `src/features/queue/store/index.ts` (`listen<…>('download-progress')`) |
| Virtualized track list UI | `src/features/progress/components/TrackList.tsx`, `TrackCard.tsx` |
| Progress panel composition | `src/features/progress/components/ProgressPanel.tsx`, `OverallProgress.tsx` |
| Responsive styling | Tailwind `cn` + breakpoint utilities (existing usage across `components/ui/`) |

## Conventions & constraints

- Use existing shadcn/ui components; check `package.json` before adding a drag library.
- No `console.*` — use `logger` from `@/lib/logger`.
- No `useEffect` for derived state; no comments unless non-obvious (per CLAUDE.md).
- Never hand-edit `src/bindings.ts` — regenerate via tauri-specta.
- Rust errors use `src-tauri/src/models/error.rs` types.
- Keep the queue as the single source of truth for concurrency + rate-limit coordination.
