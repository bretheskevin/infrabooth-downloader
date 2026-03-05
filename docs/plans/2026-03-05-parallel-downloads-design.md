# Parallel Downloads Design

**Date:** 2026-03-05
**Status:** Approved

## Goal

Replace sequential track downloading with configurable parallel downloads (1–10 concurrent, default 3) to speed up batch downloads.

## Approach: Tokio Semaphore with JoinSet

Replace the sequential `while` loop in `DownloadQueue::process()` with a semaphore-gated `JoinSet`. Each track is spawned as an async task. The semaphore limits concurrency to N. When any track finishes, its permit is released and the next pending track starts immediately — no batch waiting.

## Backend Design

### Queue Processing (`queue.rs`)

- `JoinSet<TrackOutcome>` holds spawned download tasks
- `Semaphore(max_concurrent)` gates new task spawning
- Main loop: spawn tasks up to semaphore limit, poll JoinSet for completed results, handle outcomes
- Each spawned task returns a `TrackOutcome` enum:

```rust
enum TrackOutcome {
    Completed { track_id: String },
    Failed { track_id: String, error: String },
    Cancelled { track_id: String },
    RateLimited { track_id: String, reset_time: Option<String> },
    AuthFailed { track_id: String },
}
```

### Pause/Resume for Rate Limit & Auth

- Shared `paused: Arc<AtomicBool>` + `pause_notify: Arc<Notify>`
- When any worker hits rate limit or auth error, it sets `paused = true`, emits frontend event, waits for user choice
- In-flight downloads continue to completion, but no new tracks are spawned while paused
- On user response: triggering worker sets `paused = false`, calls `pause_notify.notify_waiters()`, retries its track
- Auth refresh: new token read once from `AuthState`, used for all subsequent spawns

### Active Process Tracking

Replace single `active_child`/`active_pid` with concurrent maps:

```rust
active_children: Arc<Mutex<HashMap<String, CommandChild>>>
active_pids: Arc<Mutex<HashMap<String, u32>>>
```

Cancellation iterates all entries and kills each process.

### QueueProcessContext Changes

Add `max_concurrent: usize` field. Semaphore created from this value inside `process()`.

### Command Interface

Add `max_concurrent: Option<u8>` to `StartQueueRequest`. Defaults to 3.

## Frontend Design

### Settings

- Add `maxConcurrentDownloads: number` (1–10, default 3) to settings Zustand store
- Add slider/select in Settings panel with i18n labels
- Value passed to `startDownloadQueue()` as new parameter

### Queue Store

- No structural changes needed — `updateTrackStatus(id, status)` already works per-track-ID
- Derive active tracks from status: `tracks.filter(t => t.status === 'downloading')`
- `currentIndex` usage replaced by status-derived active tracking
- `queue-progress` events still fire per-track but don't set a single index

### UI

- Highlight all tracks with `status === 'downloading'` (not just one)
- Add visual gap between adjacent active tracks so highlight borders don't overlap

### Event Flow (unchanged format)

Backend emits same events as before (`download-progress`, `queue-progress`, `queue-complete`, `queue-cancelled`). Frontend handles interleaved events naturally since each targets a specific `trackId`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rate limit hit | Pause ALL (no new spawns) | IP-level limit affects all workers |
| Auth failure | Pause ALL (no new spawns) | Token is shared, all would fail |
| Concurrency range | 1–10 | User requested max flexibility |
| Default concurrency | 3 | Immediate speedup out of box |
| Setting location | Settings panel only | Set-once preference, keeps download page clean |
| Batch vs slot-based | Slot-based (semaphore) | Don't wait for batch completion |
