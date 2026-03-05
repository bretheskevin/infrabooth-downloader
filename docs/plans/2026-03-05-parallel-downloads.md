# Parallel Downloads Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace sequential track downloading with configurable parallel downloads (1–10 concurrent, default 3) using a semaphore-gated JoinSet pattern.

**Architecture:** Rust backend uses `tokio::JoinSet` with a `Semaphore(N)` to run up to N downloads concurrently. Each spawned task returns a `TrackOutcome` enum. The main loop collects results, handles rate limit/auth pauses (blocking new spawns while in-flight tasks finish), and manages cancellation. Frontend adds a concurrency setting and updates UI to highlight multiple active tracks.

**Tech Stack:** Rust (tokio JoinSet, Semaphore, Notify), React/Zustand, Tauri events, shadcn/ui, i18next

**Design doc:** `docs/plans/2026-03-05-parallel-downloads-design.md`

---

## Task 1: Refactor CancellationState for Multi-Process Tracking

**Files:**
- Modify: `src-tauri/src/services/cancellation.rs`

**Context:** Currently tracks a single `active_child`/`active_pid`. Needs to track N concurrent processes in a HashMap keyed by track_id. The `cancel_download_queue` command calls `kill_active_process()` which must kill all.

**Step 1: Add ActiveProcess struct and replace fields**

Replace the single `active_child: Arc<Mutex<Option<CommandChild>>>` and `active_pid: Arc<Mutex<Option<u32>>>` with:

```rust
use std::collections::HashMap;

/// A single active download process (ffmpeg child + PID).
pub struct ActiveProcess {
    pub child: Arc<Mutex<Option<CommandChild>>>,
    pub pid: Arc<Mutex<Option<u32>>>,
}

pub struct CancellationState {
    sender: watch::Sender<bool>,
    receiver: watch::Receiver<bool>,
    active_processes: Arc<Mutex<HashMap<String, ActiveProcess>>>,
}
```

**Step 2: Update CancellationState methods**

- Remove `active_child()` and `active_pid()` accessor methods
- Add `active_processes()` method returning `Arc<Mutex<HashMap<String, ActiveProcess>>>` (clone of the Arc)
- Add `register_process(track_id, child, pid)` async method that inserts into the map
- Add `deregister_process(track_id)` async method that removes from the map
- Rename `kill_active_process` → `kill_active_processes` (plural) — iterate all entries, kill each process tree + child, then clear the map

```rust
impl CancellationState {
    pub fn new() -> Self {
        let (sender, receiver) = watch::channel(false);
        Self {
            sender,
            receiver,
            active_processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn subscribe(&self) -> watch::Receiver<bool> { self.receiver.clone() }
    pub fn cancel(&self) { let _ = self.sender.send(true); }
    pub fn reset(&self) { let _ = self.sender.send(false); }

    pub fn active_processes(&self) -> Arc<Mutex<HashMap<String, ActiveProcess>>> {
        self.active_processes.clone()
    }

    pub async fn register_process(
        &self,
        track_id: String,
        child: Arc<Mutex<Option<CommandChild>>>,
        pid: Arc<Mutex<Option<u32>>>,
    ) {
        self.active_processes.lock().await.insert(track_id, ActiveProcess { child, pid });
    }

    pub async fn deregister_process(&self, track_id: &str) {
        self.active_processes.lock().await.remove(track_id);
    }

    pub async fn kill_active_processes(&self) {
        let mut processes = self.active_processes.lock().await;
        for (track_id, proc) in processes.iter() {
            log::info!("[cancel] Killing process for track {}", track_id);
            // Kill PID tree first (same platform logic as before)
            if let Some(pid) = proc.pid.lock().await.take() {
                #[cfg(unix)]
                {
                    let _ = std::process::Command::new("pkill").args(["-9", "-P", &pid.to_string()]).output();
                    let _ = std::process::Command::new("kill").args(["-9", &pid.to_string()]).output();
                }
                #[cfg(windows)]
                {
                    let _ = std::process::Command::new("taskkill").args(["/F", "/T", "/PID", &pid.to_string()]).output();
                }
            }
            // Kill CommandChild
            if let Some(child) = proc.child.lock().await.take() {
                let _ = child.kill();
            }
        }
        processes.clear();
    }
}
```

**Step 3: Update cancel_download_queue command**

In `src-tauri/src/commands/download.rs`, update the cancel command to call `kill_active_processes()` (plural):

```rust
// Change: cancel_state.kill_active_process().await;
// To:     cancel_state.kill_active_processes().await;
```

**Step 4: Run `cargo check` from `src-tauri/`**

This will show compilation errors in `commands/download.rs` where `active_child()`/`active_pid()` are called. Those will be fixed in Task 2.

---

## Task 2: Update QueueProcessContext, StartQueueRequest, and Add TrackOutcome

**Files:**
- Modify: `src-tauri/src/services/queue.rs` (QueueProcessContext, add TrackOutcome)
- Modify: `src-tauri/src/commands/download.rs` (StartQueueRequest, start_download_queue)

**Step 1: Update QueueProcessContext in queue.rs**

Replace `active_child` and `active_pid` fields with `active_processes` and add `max_concurrent`:

```rust
use std::collections::HashMap;
use tokio::sync::{watch, Mutex, Semaphore, Notify};
use crate::services::cancellation::ActiveProcess;

pub struct QueueProcessContext {
    pub output_dir: PathBuf,
    pub cancel_rx: watch::Receiver<bool>,
    pub active_processes: Arc<Mutex<HashMap<String, ActiveProcess>>>,
    pub auth_choice_state: Arc<AuthChoiceState>,
    pub rate_limit_choice_state: Arc<RateLimitChoiceState>,
    pub max_concurrent: usize,
}
```

**Step 2: Add TrackOutcome enum in queue.rs**

```rust
use crate::models::error::HasErrorCode;

/// Result of a single track download in parallel processing.
pub enum TrackOutcome {
    Completed { track_id: String },
    Failed { track_id: String, error_code: String, error_message: String },
    Cancelled { track_id: String },
    RateLimited { track_id: String, reset_time: Option<String> },
    AuthFailed { track_id: String },
}
```

**Step 3: Update StartQueueRequest in commands/download.rs**

```rust
pub struct StartQueueRequest {
    pub tracks: Vec<QueueItemRequest>,
    pub album_name: Option<String>,
    pub output_dir: Option<String>,
    pub max_concurrent: Option<u8>,
}
```

**Step 4: Update start_download_queue to build new QueueProcessContext**

```rust
// Replace:
//   let active_child = cancel_state.active_child();
//   let active_pid = cancel_state.active_pid();
// With:
let active_processes = cancel_state.active_processes();

let ctx = QueueProcessContext {
    output_dir,
    cancel_rx,
    active_processes,
    auth_choice_state: auth_choice_state.inner().clone(),
    rate_limit_choice_state: rate_limit_choice_state.inner().clone(),
    max_concurrent: request.max_concurrent.unwrap_or(3).clamp(1, 10) as usize,
};
```

**Step 5: Run `cargo check` from `src-tauri/`**

Expect errors only in `queue.rs` `process()` method (Task 3).

---

## Task 3: Rewrite DownloadQueue::process() for Parallel Execution

**Files:**
- Modify: `src-tauri/src/services/queue.rs` (process method)

**Context:** This is the core change. Replace the sequential `while self.current_index < self.items.len()` loop with a JoinSet + Semaphore pattern. Use a VecDeque for pending items so retries can be pushed back to the front.

**Step 1: Add required imports at top of queue.rs**

```rust
use std::collections::{HashMap, VecDeque};
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::{Notify, Semaphore};
use tokio::task::JoinSet;
use crate::services::cancellation::ActiveProcess;
```

**Step 2: Replace the entire `process` method body**

The new implementation:

```rust
pub async fn process<R: Runtime>(
    &mut self,
    app: AppHandle<R>,
    ctx: QueueProcessContext,
) -> QueueResult {
    self.is_processing = true;
    let mut completed = 0u32;
    let mut failed = 0u32;
    let mut failed_tracks: Vec<(String, String)> = vec![];
    let mut oauth_token: Option<String> = app.state::<AuthState>().get_token();

    let semaphore = Arc::new(Semaphore::new(ctx.max_concurrent));
    let mut join_set: JoinSet<TrackOutcome> = JoinSet::new();
    let paused = Arc::new(AtomicBool::new(false));
    let pause_notify = Arc::new(Notify::new());

    // Build pending queue and item lookup map
    let mut pending: VecDeque<usize> = (0..self.items.len()).collect();
    let items_map: HashMap<String, QueueItem> = self.items.iter()
        .map(|i| (i.track_id.clone(), i.clone()))
        .collect();
    let mut started_count = 0u32;

    loop {
        // Check cancellation — stop spawning new tasks
        if *ctx.cancel_rx.borrow() {
            log::info!("[queue] Cancellation requested, stopping new spawns");
            break;
        }

        // If paused (rate limit / auth), wait for unpause or cancel
        if paused.load(Ordering::SeqCst) {
            tokio::select! {
                _ = pause_notify.notified() => continue,
                Ok(()) = ctx.cancel_rx.clone().changed() => continue,
            }
        }

        let has_pending = !pending.is_empty();

        if has_pending {
            tokio::select! {
                biased;

                // Collect completed tasks first (avoids starvation)
                Some(result) = join_set.join_next() => {
                    Self::handle_outcome(
                        result, &app, &ctx, &paused, &pause_notify,
                        &mut oauth_token, &items_map,
                        &mut pending, &mut completed, &mut failed,
                        &mut failed_tracks, self.total_tracks,
                    ).await;
                }

                // Try to spawn next task
                permit = semaphore.clone().acquire_owned() => {
                    let permit = permit.expect("semaphore closed");
                    let idx = pending.pop_front().unwrap();
                    let item = &self.items[idx];
                    started_count += 1;

                    // Emit queue-progress
                    let _ = app.emit(
                        "queue-progress",
                        QueueProgressEvent {
                            current: started_count,
                            total: self.total_tracks,
                            track_id: item.track_id.clone(),
                        },
                    );

                    // Create per-worker process tracking
                    let child_handle = Arc::new(Mutex::new(None));
                    let pid_handle = Arc::new(Mutex::new(None));
                    ctx.active_processes.lock().await.insert(
                        item.track_id.clone(),
                        ActiveProcess { child: child_handle.clone(), pid: pid_handle.clone() },
                    );

                    // Build pipeline config
                    let playlist_context = if self.total_tracks > 1 {
                        Some(PlaylistContext {
                            track_position: item.track_number.unwrap_or((idx + 1) as u32),
                            total_tracks: self.total_tracks,
                        })
                    } else {
                        None
                    };

                    let config = PipelineConfig {
                        track_url: item.track_url.clone(),
                        track_id: item.track_id.clone(),
                        output_dir: ctx.output_dir.clone(),
                        metadata: TrackMetadata {
                            title: item.title.clone(),
                            artist: item.artist.clone(),
                            album: self.album_name.clone(),
                            track_number: item.track_number,
                            total_tracks: Some(self.total_tracks),
                            artwork_url: item.artwork_url.clone(),
                        },
                        playlist_context,
                        duration_ms: item.duration_ms,
                        oauth_token: oauth_token.clone(),
                    };

                    let app_clone = app.clone();
                    let worker_cancel_rx = ctx.cancel_rx.clone();
                    let active_procs = ctx.active_processes.clone();
                    let track_id = item.track_id.clone();

                    join_set.spawn(async move {
                        let result = download_and_convert(
                            &app_clone,
                            config,
                            Some(child_handle),
                            Some(worker_cancel_rx),
                            Some(pid_handle),
                        ).await;

                        // Deregister process tracking
                        active_procs.lock().await.remove(&track_id);

                        // Release semaphore slot
                        drop(permit);

                        match result {
                            Ok(_) => {
                                let _ = app_clone.emit(
                                    "download-progress",
                                    serde_json::json!({
                                        "trackId": track_id,
                                        "status": "complete",
                                        "percent": 1.0
                                    }),
                                );
                                TrackOutcome::Completed { track_id }
                            }
                            Err(PipelineError::Download(DownloadError::Cancelled)) => {
                                TrackOutcome::Cancelled { track_id }
                            }
                            Err(PipelineError::Download(DownloadError::RateLimited(ref info))) => {
                                let reset_time = info.as_ref().and_then(|i| i.reset_time.clone());
                                let _ = app_clone.emit(
                                    "download-progress",
                                    serde_json::json!({
                                        "trackId": track_id,
                                        "status": "rate_limited",
                                    }),
                                );
                                TrackOutcome::RateLimited { track_id, reset_time }
                            }
                            Err(PipelineError::Download(DownloadError::AuthRefreshFailed)) => {
                                TrackOutcome::AuthFailed { track_id }
                            }
                            Err(e) => {
                                log::error!("[queue] Track {} failed: {}", track_id, e);
                                let _ = app_clone.emit(
                                    "download-progress",
                                    serde_json::json!({
                                        "trackId": track_id,
                                        "status": "failed",
                                        "error": {
                                            "code": e.code(),
                                            "message": e.to_string()
                                        }
                                    }),
                                );
                                TrackOutcome::Failed {
                                    track_id,
                                    error_code: e.code().to_string(),
                                    error_message: e.to_string(),
                                }
                            }
                        }
                    });
                }
            }
        } else if !join_set.is_empty() {
            // No more pending items — drain remaining tasks
            if let Some(result) = join_set.join_next().await {
                Self::handle_outcome(
                    result, &app, &ctx, &paused, &pause_notify,
                    &mut oauth_token, &items_map,
                    &mut pending, &mut completed, &mut failed,
                    &mut failed_tracks, self.total_tracks,
                ).await;
            }
        } else {
            // All done
            break;
        }
    }

    // Drain any remaining in-flight tasks (e.g. after cancellation)
    while let Some(result) = join_set.join_next().await {
        if let Ok(outcome) = result {
            match outcome {
                TrackOutcome::Completed { .. } => completed += 1,
                TrackOutcome::Failed { track_id, error_message, .. } => {
                    failed += 1;
                    failed_tracks.push((track_id, error_message));
                }
                _ => {} // Cancelled tracks counted below
            }
        }
    }

    self.is_processing = false;

    // Clear any remaining active processes
    ctx.active_processes.lock().await.clear();

    // Emit final event
    if *ctx.cancel_rx.borrow() {
        let cancelled = self.total_tracks - completed - failed;
        let _ = app.emit(
            "queue-cancelled",
            QueueCancelledEvent {
                completed,
                cancelled,
                total: self.total_tracks,
            },
        );
    } else {
        let _ = app.emit(
            "queue-complete",
            QueueCompleteEvent {
                completed,
                failed,
                total: self.total_tracks,
                failed_tracks: failed_tracks.clone(),
            },
        );
    }

    QueueResult { completed, failed }
}
```

**Step 3: Add the `handle_outcome` helper method on DownloadQueue**

```rust
impl DownloadQueue {
    /// Handle a completed task outcome from the JoinSet.
    async fn handle_outcome<R: Runtime>(
        result: Result<TrackOutcome, tokio::task::JoinError>,
        app: &AppHandle<R>,
        ctx: &QueueProcessContext,
        paused: &Arc<AtomicBool>,
        pause_notify: &Arc<Notify>,
        oauth_token: &mut Option<String>,
        items_map: &HashMap<String, QueueItem>,
        pending: &mut VecDeque<usize>,
        completed: &mut u32,
        failed: &mut u32,
        failed_tracks: &mut Vec<(String, String)>,
        total_tracks: u32,
    ) {
        let outcome = match result {
            Ok(o) => o,
            Err(e) => {
                log::error!("[queue] Task panicked: {}", e);
                *failed += 1;
                return;
            }
        };

        match outcome {
            TrackOutcome::Completed { track_id } => {
                log::info!("[queue] Track {} completed", track_id);
                *completed += 1;
            }
            TrackOutcome::Failed { track_id, error_code: _, error_message } => {
                log::error!("[queue] Track {} failed: {}", track_id, error_message);
                *failed += 1;
                failed_tracks.push((track_id, error_message));
            }
            TrackOutcome::Cancelled { track_id } => {
                log::info!("[queue] Track {} cancelled", track_id);
                // Counted in the final cancelled tally
            }
            TrackOutcome::RateLimited { track_id, reset_time } => {
                log::warn!("[queue] Track {} rate limited, pausing queue", track_id);
                paused.store(true, Ordering::SeqCst);

                // Find original item index for retry
                let retry_idx = items_map.get(&track_id)
                    .and_then(|item| {
                        // We need to find the index in self.items — use track_id lookup
                        // Since items_map has the item, find its position
                        None::<usize> // Will be set via separate lookup
                    });

                let _ = app.emit(
                    "download-rate-limited",
                    DownloadRateLimitedEvent {
                        track_id: track_id.clone(),
                        track_title: items_map.get(&track_id)
                            .map(|i| i.title.clone())
                            .unwrap_or_default(),
                        reset_time,
                    },
                );

                // Wait for user choice
                let mut choice_rx = ctx.rate_limit_choice_state.subscribe();
                loop {
                    if *ctx.cancel_rx.borrow() {
                        paused.store(false, Ordering::SeqCst);
                        pause_notify.notify_waiters();
                        break;
                    }
                    if choice_rx.changed().await.is_ok() {
                        let choice = { *choice_rx.borrow() };
                        if let Some(choice) = choice {
                            match choice {
                                RateLimitChoice::Retry => {
                                    log::info!("[queue] User chose retry after rate limit");
                                    // Re-queue the track (push to front)
                                    // Find the original index
                                    // We'll use a separate index map (see note below)
                                    paused.store(false, Ordering::SeqCst);
                                    pause_notify.notify_waiters();
                                    break;
                                }
                                RateLimitChoice::Stop => {
                                    log::info!("[queue] User chose stop after rate limit");
                                    paused.store(false, Ordering::SeqCst);
                                    pause_notify.notify_waiters();
                                    // Signal cancellation
                                    let cancelled = total_tracks - *completed - *failed;
                                    let _ = app.emit(
                                        "queue-cancelled",
                                        QueueCancelledEvent {
                                            completed: *completed,
                                            cancelled,
                                            total: total_tracks,
                                        },
                                    );
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            TrackOutcome::AuthFailed { track_id } => {
                log::info!("[queue] Track {} auth failed, pausing queue", track_id);
                paused.store(true, Ordering::SeqCst);

                ctx.auth_choice_state.set_pending(true).await;
                let _ = app.emit(
                    "download-auth-needed",
                    DownloadAuthNeededEvent {
                        track_id: track_id.clone(),
                        track_title: items_map.get(&track_id)
                            .map(|i| i.title.clone())
                            .unwrap_or_default(),
                    },
                );

                let mut choice_rx = ctx.auth_choice_state.subscribe();
                loop {
                    if *ctx.cancel_rx.borrow() {
                        ctx.auth_choice_state.set_pending(false).await;
                        paused.store(false, Ordering::SeqCst);
                        pause_notify.notify_waiters();
                        break;
                    }
                    if choice_rx.changed().await.is_ok() {
                        let choice = { *choice_rx.borrow() };
                        if let Some(choice) = choice {
                            ctx.auth_choice_state.set_pending(false).await;
                            match choice {
                                AuthChoice::ReAuthenticated => {
                                    log::info!("[queue] User re-authenticated, refreshing token");
                                    *oauth_token = app.state::<AuthState>().get_token();
                                }
                                AuthChoice::ContinueStandard => {
                                    log::info!("[queue] User chose standard quality");
                                    ctx.auth_choice_state.set_skip_auth(true);
                                }
                            }
                            paused.store(false, Ordering::SeqCst);
                            pause_notify.notify_waiters();
                            break;
                        }
                    }
                }
            }
        }
    }
}
```

**NOTE on retry re-queuing:** For rate limit and auth retries, we need an `index_map: HashMap<String, usize>` that maps track_id → original index in `self.items`. Build it alongside `items_map`. On retry, call `pending.push_front(index_map[&track_id])`. For auth retry, push back ALL items that aren't yet completed/failed (since auth affects all). The exact indices to re-queue are the track that failed + any still pending.

Amend the process method to build:
```rust
let index_map: HashMap<String, usize> = self.items.iter().enumerate()
    .map(|(i, item)| (item.track_id.clone(), i))
    .collect();
```

And in the RateLimitChoice::Retry handler:
```rust
if let Some(&idx) = index_map.get(&track_id) {
    pending.push_front(idx);
}
```

And in the AuthFailed handler (after choice), same pattern — re-queue the failed track:
```rust
if let Some(&idx) = index_map.get(&track_id) {
    pending.push_front(idx);
}
```

**Step 4: Run `cargo check` from `src-tauri/`**

Expected: compiles successfully. All queue processing logic is self-contained.

**Step 5: Run `cargo test` from `src-tauri/`**

Existing unit tests for QueueItem, QueueProgressEvent, etc. should still pass. The `process()` method is not unit-tested (requires Tauri runtime).

---

## Task 4: Regenerate TypeScript Bindings

**Files:**
- Auto-generated: `src/bindings.ts`

**Step 1: Run the Tauri dev server briefly to trigger specta regeneration**

```bash
cd src-tauri && cargo build
```

The `StartQueueRequest` type in `src/bindings.ts` should now include `maxConcurrent?: number | null`.

**Step 2: Verify the binding was generated**

Check `src/bindings.ts` for the updated `StartQueueRequest` type containing `maxConcurrent`.

---

## Task 5: Frontend — Settings Store + i18n

**Files:**
- Modify: `src/features/settings/store.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/fr.json`

**Step 1: Add maxConcurrentDownloads to settings store**

In `src/features/settings/store.ts`, add to `SettingsState` interface:

```typescript
maxConcurrentDownloads: number;
setMaxConcurrentDownloads: (n: number) => void;
```

In the store creation, add default value and action:

```typescript
maxConcurrentDownloads: 3,
setMaxConcurrentDownloads: (n) => set({ maxConcurrentDownloads: Math.min(10, Math.max(1, n)) }),
```

Add `maxConcurrentDownloads` to the `partialize` list for persistence.

**Step 2: Add i18n keys**

In `src/locales/en.json`, add under `settings`:
```json
"concurrentDownloads": "Concurrent downloads",
"concurrentDownloadsDescription": "Number of tracks to download simultaneously (1-10)"
```

In `src/locales/fr.json`, add under `settings`:
```json
"concurrentDownloads": "Téléchargements simultanés",
"concurrentDownloadsDescription": "Nombre de pistes à télécharger simultanément (1-10)"
```

---

## Task 6: Frontend — Settings UI Component

**Files:**
- Create: `src/features/settings/components/ConcurrentDownloadsSection.tsx`
- Modify: `src/features/settings/components/SettingsPanel.tsx`

**Step 1: Create ConcurrentDownloadsSection component**

Follow the pattern of existing sections (LanguageSection, ThemeSection). Use a shadcn/ui Slider or a simple number input with +/- buttons.

```tsx
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store';
import { Slider } from '@/components/ui/slider';

export function ConcurrentDownloadsSection() {
  const { t } = useTranslation();
  const { maxConcurrentDownloads, setMaxConcurrentDownloads } = useSettingsStore();

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium">{t('settings.concurrentDownloads')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('settings.concurrentDownloadsDescription')}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[maxConcurrentDownloads]}
          onValueChange={([v]) => setMaxConcurrentDownloads(v)}
          min={1}
          max={10}
          step={1}
          className="flex-1"
        />
        <span className="text-sm font-mono w-6 text-right">{maxConcurrentDownloads}</span>
      </div>
    </div>
  );
}
```

**Step 2: Check if Slider component exists**

Run: `ls src/components/ui/slider.tsx`

If it doesn't exist, install it:
```bash
npx shadcn@latest add slider
```

**Step 3: Add ConcurrentDownloadsSection to SettingsPanel**

In `SettingsPanel.tsx`, import and add the new section between existing sections (after ThemeSection, before DownloadLocationSection):

```tsx
import { ConcurrentDownloadsSection } from './ConcurrentDownloadsSection';

// In the JSX, add between existing sections:
<Separator />
<ConcurrentDownloadsSection />
```

---

## Task 7: Frontend — Pass Concurrency to Backend

**Files:**
- Modify: `src/features/queue/hooks/useDownloadFlow.ts`

**Step 1: Pass maxConcurrentDownloads in the startDownloadQueue call**

In `useDownloadFlow`, where `startDownloadQueue()` is called with the request object, add `maxConcurrent`:

```typescript
import { useSettingsStore } from '@/features/settings/store';

// Inside useDownloadFlow, get the setting:
const { maxConcurrentDownloads } = useSettingsStore();

// In handleDownload, update the call:
await startDownloadQueue({
  tracks: queueTracks.map(queueTrackToDownloadRequest),
  albumName: albumName ?? null,
  outputDir: outputDir ?? null,
  maxConcurrent: maxConcurrentDownloads,
});
```

---

## Task 8: Frontend — Queue Store + Progress UI for Multiple Active Tracks

**Files:**
- Modify: `src/features/queue/store.ts` (minor adjustment)
- Modify: `src/features/progress/components/TrackList.tsx`
- Modify: `src/features/progress/components/TrackCard.tsx`

**Step 1: Queue store — keep currentIndex but stop relying on it for active track detection**

The `setQueueProgress` action still updates `currentIndex` for backward compatibility, but UI components should check `track.status` instead.

No store changes needed — the existing `updateTrackStatus` already handles per-track updates by ID.

**Step 2: Update TrackList to detect multiple active tracks**

In `TrackList.tsx`, change how `isCurrentTrack` is determined. Instead of `index === currentIndex`, use:

```typescript
const isActiveTrack = track.status === 'downloading' || track.status === 'converting';
```

Pass this as `isCurrentTrack` (or rename the prop) to `TrackCard`.

**Step 3: Update TrackCard styling for adjacent active tracks**

Add a small gap or adjust the active border style so adjacent active tracks don't visually merge. Options:
- Use `ring-2 ring-primary` instead of `border` for the active state (ring doesn't affect layout)
- Or add `my-0.5` margin to active tracks

Examine the current active styling in `TrackCard.tsx` and adjust accordingly. The key is that when 3 consecutive tracks all have the active highlight, they should be visually distinct.

**Step 4: Verify the OverallProgress component**

Check `src/features/progress/components/OverallProgress.tsx` — if it uses `currentIndex` for the progress bar, consider changing it to use `completedCount + failedCount` as the numerator instead. The progress bar should show "tracks finished / total" rather than "current position / total".

---

## Task 9: Integration Testing

**Step 1: Run TypeScript type checking**

```bash
npm run typecheck
```

**Step 2: Run frontend tests**

```bash
npm test
```

**Step 3: Run Rust tests**

```bash
cd src-tauri && cargo test
```

**Step 4: Manual testing with `npm run tauri dev`**

Test scenarios:
1. **Single track** — should work identically to before (concurrency doesn't matter for 1 track)
2. **Playlist with default concurrency (3)** — 3 tracks should show "downloading" simultaneously, as each finishes, the next starts immediately
3. **Change concurrency to 1** — should behave like old sequential mode
4. **Change concurrency to 10** — with a large playlist, up to 10 tracks downloading at once
5. **Cancel mid-download** — all active downloads should stop, cancelled count should be correct
6. **Rate limit** — should pause new spawns, show dialog, retry works
7. **UI rendering** — multiple active tracks should have distinct borders, no visual overlap

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/services/cancellation.rs` | Modify | Replace single process with HashMap<String, ActiveProcess>, update kill method |
| `src-tauri/src/services/queue.rs` | Modify | Add TrackOutcome, update QueueProcessContext, rewrite process() with JoinSet+Semaphore |
| `src-tauri/src/commands/download.rs` | Modify | Add max_concurrent to StartQueueRequest, update context building |
| `src/features/settings/store.ts` | Modify | Add maxConcurrentDownloads field + action |
| `src/features/settings/components/ConcurrentDownloadsSection.tsx` | Create | Slider UI for concurrency setting |
| `src/features/settings/components/SettingsPanel.tsx` | Modify | Add ConcurrentDownloadsSection |
| `src/features/queue/hooks/useDownloadFlow.ts` | Modify | Pass maxConcurrent to startDownloadQueue |
| `src/features/progress/components/TrackList.tsx` | Modify | Derive isActiveTrack from status |
| `src/features/progress/components/TrackCard.tsx` | Modify | Adjust active styling for adjacent tracks |
| `src/locales/en.json` | Modify | Add concurrent download translation keys |
| `src/locales/fr.json` | Modify | Add concurrent download translation keys |
| `src/bindings.ts` | Auto-gen | Regenerated by specta (maxConcurrent field) |
