# Download Dashboard — Development Phases

Step-by-step roadmap for `/develop`. Each phase is self-contained and shippable on its own.
Run one phase per `/develop` cycle. Full design + pattern references:
[`2026-06-19-download-dashboard-design.md`](./2026-06-19-download-dashboard-design.md).

**Progress legend:** `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 1 — Non-blocking dashboard + dock (frontend only) ✅ DONE (2026-06-19)

> No backend changes. Stop the processing view from taking over the page.
> Shipped: `useDownloadDockState`, `DownloadDock`, `DownloadDashboard`, `DownloadOverlay`;
> `useDownloadPipeline` flattened; `DownloadTab` always renders the main view; overlay mounted
> globally in `App.tsx`. 172 test files / 1649 tests green.

### Goal
Downloads run in the background while the main UI (URL input, Discover, Selections) stays
fully usable. A dock shows live aggregate status everywhere and hides when idle; a full
dashboard expands from it without interrupting downloads.

### Steps
- [ ] Decouple view state from page: `useDownloadPipeline.ts` no longer gates the page on `processing`/`pending`/`complete` — it feeds the dock/dashboard instead.
- [ ] `DownloadTab.tsx` renders `DownloadMainView` at all times; mounts dock + dashboard alongside.
- [ ] New `DownloadDock.tsx` — mini-panel with aggregate progress (`X/Y`, current item, %). Hidden when idle (no active/pending + dismissed); slides in on first activity.
- [ ] New `DownloadDashboard.tsx` — expanded view reusing `ProgressPanel` / `TrackList` / `OverallProgress`, opened from the dock.
- [ ] Completion no longer wipes state / takes over the page; "Download another" doesn't need `clearQueue()` to free the UI.
- [ ] Responsive: wide → corner dock + side panel; narrow → bottom dock + full-screen sheet (Tailwind breakpoints, mouse-only).
- [ ] i18n strings in `src/locales/{en,fr}.json`.
- [ ] Tests for dock visibility logic + view decoupling.

### Acceptance
- [ ] Starting a download leaves URL input, Discover, and Selections usable.
- [ ] Dock appears on activity, shows live progress, hides when idle.
- [ ] Dashboard opens/closes without interrupting downloads.
- [ ] Layout reflows at narrow widths (mouse only).

---

## Phase 2 — Live queue: append + per-track cancel / retry / reorder

> The QueueManager rearchitecture. Backend becomes long-lived; dashboard becomes interactive.

### Goal
New tracks join the live run; individual tracks can be cancelled/removed, failed tracks
retried, and pending tracks reordered.

### Steps — Backend
- [ ] `QueueManager` singleton in Tauri state (extend `services/queue.rs` or split `queue_manager.rs`): shared mutable `pending: VecDeque<QueueItem>` + active tracking behind `Arc<Mutex<…>>`.
- [ ] Processing loop awaits new items instead of exiting when pending is empty + nothing active.
- [ ] Register in `lib.rs` (`.manage(QueueManager::default())`, `collect_commands!`, `collect_events!`).
- [ ] Commands in `download.rs`: `enqueue_tracks` (append, idempotent on `track_id`), `remove_track`, `cancel_track`, `reorder_pending(ordered_ids)`, `retry_track`. Keep `cancel_download_queue` as cancel-all.
- [ ] Per-track kill: add `kill_process(track_id)` next to `kill_active_processes` (reuse `active_processes` map keyed by id + `kill_process_tree`).

### Steps — Frontend
- [ ] `queueStateSlice.ts`: append mode + `removeTrack` / `reorder` / `retryTrack` actions (drop replace-only semantics when a queue is live).
- [ ] `useDownloadInitiator.ts` / `useSyncToQueue.ts`: call `enqueue_tracks` when a queue is already running instead of starting a fresh batch.
- [ ] `api/download.ts`: wrappers for the new commands.
- [ ] `TrackCard.tsx` / dashboard: per-row cancel/remove (any state), retry (failed), drag-to-reorder (pending, mouse-only — check `package.json` before adding a DnD lib).
- [ ] Regenerate `src/bindings.ts` via `npm run tauri dev` (never hand-edit).
- [ ] Tests: append/remove/reorder/retry store logic; backend command unit tests.

### Acceptance
- [ ] Adding media while a queue runs appends without restarting in-flight downloads.
- [ ] Removing/cancelling one track leaves the rest running.
- [ ] Failed tracks retry individually.
- [ ] Pending tracks reorder via mouse drag; spawn loop respects order.

---

## Phase 3 — Persisted history

> Completed/failed downloads survive restarts with management actions.

### Goal
A persisted history list with open file/folder, re-download, clear, and filter/search.

### Steps
- [ ] `useHistoryStore` with `zustand persist` (mirror `settings/store.ts` / `changelog/store.ts`). Entry: title, artist, status, filePath, timestamp, source URL.
- [ ] Populate on per-track completion/failure + `queue-complete`.
- [ ] `HistoryList.tsx` in the dashboard (tab/section), virtualized via `useVirtualizedList`, reuse `TrackCard` styling.
- [ ] Actions: open file/folder (Tauri reveal — check existing usage / add command in `download.rs` if needed), re-download (re-`enqueue_tracks` from stored `TrackCore`), clear per-item + clear all, filter/search by title/artist/status.
- [ ] i18n strings in `src/locales/{en,fr}.json`.
- [ ] Tests: history persistence, population, filter/search, actions.

### Acceptance
- [ ] History persists across restarts; shows completed + failed.
- [ ] Open file/folder, re-download, clear (item + all), filter/search all work.

---

## Cross-cutting constraints (all phases)

- Responsive layout only — CSS breakpoints, mouse-only. No touch gestures (CLAUDE.md stays desktop-only).
- Use existing shadcn/ui components; check `package.json` before adding deps.
- `logger` from `@/lib/logger`, never `console.*`.
- No `useEffect` for derived state; no unnecessary comments.
- Never hand-edit `src/bindings.ts` — regenerate via tauri-specta.
- Queue stays the single source of truth for concurrency + rate-limit coordination.
- Run `graphify update .` after each phase to keep the graph current.
