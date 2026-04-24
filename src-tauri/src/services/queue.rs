use serde::Serialize;
use specta::Type;
use std::collections::{HashMap, HashSet, VecDeque};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::sync::{watch, Mutex, Notify, Semaphore};
use tokio::task::JoinSet;

use crate::models::error::{DownloadError, HasErrorCode};
use crate::models::TrackCore;
use crate::services::cancellation::ActiveProcess;
use crate::services::downloader::{DownloadProgressEvent, PlaylistContext};
use crate::services::events;
use crate::services::metadata::{scan_existing_track_ids, TrackMetadata};
use crate::services::pipeline::{download_and_convert, CancellationHandles, PipelineConfig};
use crate::services::rate_limit_choice::{DownloadRateLimitedEvent, RateLimitChoice, RateLimitChoiceState};
use crate::services::storage::AuthState;

/// An item in the download queue.
#[derive(Clone, Debug, Type)]
pub struct QueueItem {
    #[serde(flatten)]
    pub core: TrackCore,
    pub track_number: Option<u32>,
}

/// Event payload for queue progress updates.
#[derive(Clone, Debug, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct QueueProgressEvent {
    pub current: u32,
    pub total: u32,
    pub track_id: String,
}

/// Event payload for queue completion.
#[derive(Clone, Debug, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct QueueCompleteEvent {
    pub completed: u32,
    pub failed: u32,
    pub total: u32,
    pub failed_tracks: Vec<(String, String)>,
}

/// Event payload for queue cancellation.
#[derive(Clone, Debug, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct QueueCancelledEvent {
    pub completed: u32,
    pub cancelled: u32,
    pub total: u32,
}

/// Result of queue processing.
pub struct QueueResult {
    pub completed: u32,
    pub failed: u32,
}

/// Mutable progress tracking state for the queue processor.
struct QueueProgress {
    oauth_token: Option<String>,
    pending: VecDeque<usize>,
    completed: u32,
    failed: u32,
    failed_tracks: Vec<(String, String)>,
}

/// Result of a single track download in parallel processing.
pub enum TrackOutcome {
    Completed { track_id: String },
    Failed { track_id: String, error_message: String },
    Cancelled { track_id: String },
    RateLimited { track_id: String, reset_time: Option<String> },
}

/// Context for queue processing containing all shared state.
pub struct QueueProcessContext {
    pub output_dir: PathBuf,
    pub cancel_rx: watch::Receiver<bool>,
    pub active_processes: Arc<Mutex<HashMap<String, ActiveProcess>>>,
    pub rate_limit_choice_state: Arc<RateLimitChoiceState>,
    pub max_concurrent: usize,
}

/// Execute a single download task: download, convert, and map the result to a TrackOutcome.
async fn execute_download<R: Runtime>(
    app: AppHandle<R>, config: PipelineConfig, child_handle: Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>>,
    pid_handle: Arc<Mutex<Option<u32>>>, cancel_rx: watch::Receiver<bool>, active_procs: Arc<Mutex<HashMap<String, ActiveProcess>>>,
    permit: tokio::sync::OwnedSemaphorePermit,
) -> TrackOutcome {
    let track_id = config.track_id.clone();

    let result = download_and_convert(
        &app,
        config,
        Some(CancellationHandles { cancel_rx, active_child: child_handle, active_pid: pid_handle }),
    )
    .await;

    // Deregister process tracking
    active_procs.lock().await.remove(&track_id);
    drop(permit);

    match result {
        Ok(output_path) => {
            let _ = app.emit(
                events::DOWNLOAD_PROGRESS,
                DownloadProgressEvent::complete(track_id.clone(), output_path.to_string_lossy().to_string()),
            );
            TrackOutcome::Completed { track_id }
        }
        Err(DownloadError::Cancelled) => TrackOutcome::Cancelled { track_id },
        Err(DownloadError::RateLimited(ref info)) => {
            let reset_time = info.as_ref().and_then(|i| i.reset_time.clone());
            let _ = app.emit(events::DOWNLOAD_PROGRESS, DownloadProgressEvent::rate_limited(track_id.clone()));
            TrackOutcome::RateLimited { track_id, reset_time }
        }
        Err(e) => {
            log::error!("[queue] Track {} failed: {}", track_id, e);
            let _ = app.emit(
                events::DOWNLOAD_PROGRESS,
                DownloadProgressEvent::failed(
                    track_id.clone(),
                    crate::models::ErrorResponse { code: e.code().to_string(), message: e.to_string() },
                ),
            );
            TrackOutcome::Failed { track_id, error_message: e.to_string() }
        }
    }
}

// ---------------------------------------------------------------------------
// Shared "pause and wait for user choice" pattern (#4)
// ---------------------------------------------------------------------------

/// Action to take after the user responds to a pause prompt.
enum PauseAction {
    /// Re-queue the track at its original index.
    RetryTrack(usize),
    /// Stop the queue (clear all pending).
    Stop,
}

/// Wait for a user choice via a watch channel, or for cancellation.
/// Returns the mapped action, or `None` if cancelled.
async fn wait_for_user_choice<T: Copy>(
    choice_rx: &mut watch::Receiver<Option<T>>, cancel_rx: &watch::Receiver<bool>, map_choice: impl Fn(T) -> PauseAction,
) -> Option<PauseAction> {
    loop {
        if *cancel_rx.borrow() {
            return None;
        }
        if choice_rx.changed().await.is_ok() {
            let choice = { *choice_rx.borrow() };
            if let Some(choice) = choice {
                return Some(map_choice(choice));
            }
        }
    }
}

// ---------------------------------------------------------------------------
// DownloadQueue
// ---------------------------------------------------------------------------

/// Handle rate-limited outcome: pause queue, emit event, wait for user choice.
async fn handle_rate_limit<R: Runtime>(
    app: &AppHandle<R>, ctx: &QueueProcessContext, progress: &mut QueueProgress, track_lookup: &HashMap<String, (usize, QueueItem)>,
    paused: &Arc<AtomicBool>, stopped: &Arc<AtomicBool>, pause_notify: &Arc<Notify>, track_id: String, reset_time: Option<String>,
) {
    paused.store(true, Ordering::SeqCst);

    let _ = app.emit(
        events::DOWNLOAD_RATE_LIMITED,
        DownloadRateLimitedEvent {
            track_id: track_id.clone(),
            track_title: track_lookup
                .get(&track_id)
                .map(|(_, item)| item.core.title.clone())
                .unwrap_or_default(),
            reset_time,
        },
    );

    let track_idx = track_lookup.get(&track_id).map(|&(idx, _)| idx);
    let mut choice_rx = ctx.rate_limit_choice_state.subscribe();
    let action = wait_for_user_choice(&mut choice_rx, &ctx.cancel_rx, |choice| match choice {
        RateLimitChoice::Retry => {
            log::info!("[queue] User chose retry after rate limit");
            match track_idx {
                Some(idx) => PauseAction::RetryTrack(idx),
                None => PauseAction::Stop,
            }
        }
        RateLimitChoice::Stop => {
            log::info!("[queue] User chose stop after rate limit");
            PauseAction::Stop
        }
    })
    .await;

    match action {
        Some(PauseAction::RetryTrack(idx)) => {
            progress.pending.push_front(idx);
        }
        Some(PauseAction::Stop) => {
            stopped.store(true, Ordering::SeqCst);
            progress.pending.clear();
        }
        None => { /* cancelled */ }
    }

    paused.store(false, Ordering::SeqCst);
    pause_notify.notify_waiters();
}

/// Download queue manager for processing multiple tracks.
pub struct DownloadQueue {
    items: Vec<QueueItem>,
    is_processing: bool,
    album_name: Option<String>,
    total_tracks: u32,
}

impl DownloadQueue {
    pub fn new(items: Vec<QueueItem>, album_name: Option<String>) -> Self {
        let total = items.len() as u32;
        Self { items, is_processing: false, album_name, total_tracks: total }
    }

    /// Filter out already-downloaded tracks from the pending queue.
    ///
    /// Emits "skipped" progress events for tracks found in `existing_ids` and
    /// returns an updated pending queue with only tracks that need downloading.
    fn filter_already_downloaded<R: Runtime>(
        items: &[QueueItem], pending: &mut VecDeque<usize>, existing_ids: &std::collections::HashSet<String>, app: &AppHandle<R>,
    ) -> (VecDeque<usize>, u32) {
        let mut new_pending = VecDeque::new();
        let mut skipped_count = 0u32;

        for idx in pending.drain(..) {
            let item = &items[idx];
            if existing_ids.contains(&item.core.track_id) {
                let _ = app.emit(
                    events::DOWNLOAD_PROGRESS,
                    DownloadProgressEvent::skipped(item.core.track_id.clone()),
                );
                skipped_count += 1;
            } else {
                new_pending.push_back(idx);
            }
        }

        (new_pending, skipped_count)
    }

    /// Process all items in the queue with parallel downloads.
    ///
    /// Uses a JoinSet + Semaphore pattern to run up to `max_concurrent` downloads
    /// simultaneously. Rate limit and auth failures pause new spawns while
    /// in-flight tasks finish.
    pub async fn process<R: Runtime>(&mut self, app: AppHandle<R>, ctx: QueueProcessContext) -> QueueResult {
        self.is_processing = true;
        let mut progress = QueueProgress {
            oauth_token: app.state::<AuthState>().get_token(),
            pending: (0..self.items.len()).collect(),
            completed: 0,
            failed: 0,
            failed_tracks: vec![],
        };

        // Pre-scan for already-downloaded tracks (blocking I/O on a dedicated thread)
        let track_ids: Vec<String> = self.items.iter().map(|item| item.core.track_id.clone()).collect();
        let scan_dir = ctx.output_dir.clone();
        let existing_ids: HashSet<String> = tokio::task::spawn_blocking(move || scan_existing_track_ids(&scan_dir, &track_ids, false))
            .await
            .unwrap_or_default()
            .into_keys()
            .collect();

        if !existing_ids.is_empty() {
            log::info!("[queue] Found {} already-downloaded tracks, skipping", existing_ids.len());

            let (new_pending, skipped) = Self::filter_already_downloaded(&self.items, &mut progress.pending, &existing_ids, &app);
            progress.pending = new_pending;
            progress.completed += skipped;
        }

        let semaphore = Arc::new(Semaphore::new(ctx.max_concurrent));
        let mut join_set: JoinSet<TrackOutcome> = JoinSet::new();
        let paused = Arc::new(AtomicBool::new(false));
        let stopped = Arc::new(AtomicBool::new(false));
        let pause_notify = Arc::new(Notify::new());

        let track_lookup: HashMap<String, (usize, QueueItem)> = self
            .items
            .iter()
            .enumerate()
            .map(|(i, item)| (item.core.track_id.clone(), (i, item.clone())))
            .collect();
        let mut started_count = 0u32;
        let mut started_indices: std::collections::HashSet<usize> = std::collections::HashSet::new();

        loop {
            if *ctx.cancel_rx.borrow() {
                log::info!("[queue] Cancellation requested, stopping new spawns");
                break;
            }

            if paused.load(Ordering::SeqCst) {
                let mut cancel_rx_clone = ctx.cancel_rx.clone();
                tokio::select! {
                    _ = pause_notify.notified() => continue,
                    Ok(()) = cancel_rx_clone.changed() => continue,
                }
            }

            // Phase 1: Drain all completed tasks (non-blocking)
            while let Some(result) = join_set.try_join_next() {
                Self::handle_outcome(result, &app, &ctx, &paused, &stopped, &pause_notify, &track_lookup, &mut progress).await;
            }

            // Phase 2: Spawn as many tasks as permits allow
            self.spawn_pending_tasks(
                &app,
                &ctx,
                &semaphore,
                &mut join_set,
                &mut progress,
                &mut started_count,
                &mut started_indices,
                &paused,
            )
            .await;

            // Phase 3: Check if we're done
            if progress.pending.is_empty() && join_set.is_empty() {
                break;
            }

            // Phase 4: Wait for a task to complete (blocking)
            if let Some(result) = join_set.join_next().await {
                Self::handle_outcome(result, &app, &ctx, &paused, &stopped, &pause_notify, &track_lookup, &mut progress).await;
            }
        }

        Self::drain_remaining(&mut join_set, &mut progress).await;
        self.is_processing = false;
        ctx.active_processes.lock().await.clear();
        self.emit_final_event(&app, &ctx, &stopped, &progress);

        QueueResult { completed: progress.completed, failed: progress.failed }
    }

    /// Spawn download tasks for all pending items that have available semaphore permits.
    #[allow(clippy::too_many_arguments)]
    async fn spawn_pending_tasks<R: Runtime>(
        &self, app: &AppHandle<R>, ctx: &QueueProcessContext, semaphore: &Arc<Semaphore>, join_set: &mut JoinSet<TrackOutcome>,
        progress: &mut QueueProgress, started_count: &mut u32, started_indices: &mut std::collections::HashSet<usize>,
        paused: &Arc<AtomicBool>,
    ) {
        while !progress.pending.is_empty() && !paused.load(Ordering::SeqCst) {
            let permit = match semaphore.clone().try_acquire_owned() {
                Ok(p) => p,
                Err(_) => break,
            };

            let idx = progress.pending.pop_front().unwrap();
            let item = &self.items[idx];

            if started_indices.insert(idx) {
                *started_count += 1;
            }

            let _ = app.emit(
                events::QUEUE_PROGRESS,
                QueueProgressEvent { current: *started_count, total: self.total_tracks, track_id: item.core.track_id.clone() },
            );

            let child_handle = Arc::new(Mutex::new(None));
            let pid_handle = Arc::new(Mutex::new(None));
            ctx.active_processes.lock().await.insert(
                item.core.track_id.clone(),
                ActiveProcess { child: child_handle.clone(), pid: pid_handle.clone() },
            );

            let config = self.build_pipeline_config(item, &ctx.output_dir, &progress.oauth_token);
            let app_clone = app.clone();
            let worker_cancel_rx = ctx.cancel_rx.clone();
            let active_procs = ctx.active_processes.clone();

            join_set.spawn(execute_download(
                app_clone,
                config,
                child_handle,
                pid_handle,
                worker_cancel_rx,
                active_procs,
                permit,
            ));
        }
    }

    /// Build a PipelineConfig for a queue item.
    fn build_pipeline_config(&self, item: &QueueItem, output_dir: &PathBuf, oauth_token: &Option<String>) -> PipelineConfig {
        // Skip playlist context for single tracks — numbering is meaningless
        let playlist_context = match item.track_number {
            Some(track_num) if self.total_tracks > 1 => {
                Some(PlaylistContext { track_position: track_num, total_tracks: self.total_tracks })
            }
            _ => None,
        };

        PipelineConfig {
            track_url: item.core.track_url.clone(),
            track_id: item.core.track_id.clone(),
            output_dir: output_dir.clone(),
            metadata: TrackMetadata {
                title: item.core.title.clone(),
                artist: item.core.artist.clone(),
                album: self.album_name.clone(),
                track_number: item.track_number,
                total_tracks: Some(self.total_tracks),
                artwork_url: item.core.artwork_url.clone(),
                track_id: Some(item.core.track_id.clone()),
            },
            playlist_context,
            duration_ms: item.core.duration_ms,
            oauth_token: oauth_token.clone(),
            download_url: item.core.download_url.clone(),
        }
    }

    /// Drain remaining in-flight tasks after loop exit (e.g. after cancellation).
    async fn drain_remaining(join_set: &mut JoinSet<TrackOutcome>, progress: &mut QueueProgress) {
        while let Some(result) = join_set.join_next().await {
            if let Ok(outcome) = result {
                match outcome {
                    TrackOutcome::Completed { .. } => progress.completed += 1,
                    TrackOutcome::Failed { track_id, error_message } => {
                        progress.failed += 1;
                        progress.failed_tracks.push((track_id, error_message));
                    }
                    _ => {}
                }
            }
        }
    }

    /// Emit the final queue-complete or queue-cancelled event.
    fn emit_final_event<R: Runtime>(
        &self, app: &AppHandle<R>, ctx: &QueueProcessContext, stopped: &Arc<AtomicBool>, progress: &QueueProgress,
    ) {
        if *ctx.cancel_rx.borrow() || stopped.load(Ordering::SeqCst) {
            let cancelled = self.total_tracks - progress.completed - progress.failed;
            let _ = app.emit(
                events::QUEUE_CANCELLED,
                QueueCancelledEvent { completed: progress.completed, cancelled, total: self.total_tracks },
            );
        } else {
            let _ = app.emit(
                events::QUEUE_COMPLETE,
                QueueCompleteEvent {
                    completed: progress.completed,
                    failed: progress.failed,
                    total: self.total_tracks,
                    failed_tracks: progress.failed_tracks.clone(),
                },
            );
        }
    }

    /// Handle a completed task outcome from the JoinSet.
    async fn handle_outcome<R: Runtime>(
        result: Result<TrackOutcome, tokio::task::JoinError>, app: &AppHandle<R>, ctx: &QueueProcessContext, paused: &Arc<AtomicBool>,
        stopped: &Arc<AtomicBool>, pause_notify: &Arc<Notify>, track_lookup: &HashMap<String, (usize, QueueItem)>,
        progress: &mut QueueProgress,
    ) {
        let outcome = match result {
            Ok(o) => o,
            Err(e) => {
                log::error!("[queue] Task panicked: {}", e);
                progress.failed += 1;
                return;
            }
        };

        match outcome {
            TrackOutcome::Completed { track_id } => {
                log::info!("[queue] Track {} completed", track_id);
                progress.completed += 1;
            }
            TrackOutcome::Failed { track_id, error_message } => {
                log::error!("[queue] Track {} failed: {}", track_id, error_message);
                progress.failed += 1;
                progress.failed_tracks.push((track_id, error_message));
            }
            TrackOutcome::Cancelled { track_id } => {
                log::info!("[queue] Track {} cancelled", track_id);
            }
            TrackOutcome::RateLimited { track_id, reset_time } => {
                log::warn!("[queue] Track {} rate limited, pausing queue", track_id);
                handle_rate_limit(
                    app,
                    ctx,
                    progress,
                    track_lookup,
                    paused,
                    stopped,
                    pause_notify,
                    track_id,
                    reset_time,
                )
                .await;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_queue_item_creation() {
        let item = QueueItem {
            core: TrackCore {
                track_url: "https://soundcloud.com/test/track".to_string(),
                track_id: "123456".to_string(),
                title: "Track Name".to_string(),
                artist: "Artist".to_string(),
                artwork_url: Some("https://example.com/art.jpg".to_string()),
                duration_ms: 180000,
                download_url: None,
            },
            track_number: Some(1),
        };

        assert_eq!(item.core.track_url, "https://soundcloud.com/test/track");
        assert_eq!(item.core.track_id, "123456");
        assert_eq!(item.core.title, "Track Name");
        assert_eq!(item.core.artist, "Artist");
        assert_eq!(item.core.artwork_url, Some("https://example.com/art.jpg".to_string()));
        assert_eq!(item.track_number, Some(1));
    }

    #[test]
    fn test_queue_item_clone() {
        let item = QueueItem {
            core: TrackCore {
                track_url: "https://soundcloud.com/test/track".to_string(),
                track_id: "123456".to_string(),
                title: "Track".to_string(),
                artist: "Artist".to_string(),
                artwork_url: None,
                duration_ms: 120000,
                download_url: None,
            },
            track_number: None,
        };

        let cloned = item.clone();
        assert_eq!(cloned.core.track_id, item.core.track_id);
        assert_eq!(cloned.core.title, item.core.title);
    }

    #[test]
    fn test_download_queue_new() {
        let items = vec![
            QueueItem {
                core: TrackCore {
                    track_url: "url1".to_string(),
                    track_id: "1".to_string(),
                    title: "Track 1".to_string(),
                    artist: "Artist".to_string(),
                    artwork_url: None,
                    duration_ms: 180000,
                    download_url: None,
                },
                track_number: Some(1),
            },
            QueueItem {
                core: TrackCore {
                    track_url: "url2".to_string(),
                    track_id: "2".to_string(),
                    title: "Track 2".to_string(),
                    artist: "Artist".to_string(),
                    artwork_url: None,
                    duration_ms: 240000,
                    download_url: None,
                },
                track_number: Some(2),
            },
        ];

        let queue = DownloadQueue::new(items, Some("Album Name".to_string()));

        assert_eq!(queue.total_tracks, 2);
        assert!(!queue.is_processing);
        assert_eq!(queue.album_name, Some("Album Name".to_string()));
    }

    #[test]
    fn test_download_queue_empty() {
        let queue = DownloadQueue::new(vec![], None);

        assert_eq!(queue.total_tracks, 0);
        assert_eq!(queue.items.len(), 0);
        assert!(queue.album_name.is_none());
    }

    #[test]
    fn test_queue_progress_event_serialize() {
        let event = QueueProgressEvent { current: 5, total: 10, track_id: "track123".to_string() };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"current\":5"));
        assert!(json.contains("\"total\":10"));
        assert!(json.contains("\"trackId\":\"track123\""));
    }

    #[test]
    fn test_queue_complete_event_serialize() {
        let event = QueueCompleteEvent {
            completed: 8,
            failed: 2,
            total: 10,
            failed_tracks: vec![
                ("track1".to_string(), "Error 1".to_string()),
                ("track2".to_string(), "Error 2".to_string()),
            ],
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"completed\":8"));
        assert!(json.contains("\"failed\":2"));
        assert!(json.contains("\"total\":10"));
        assert!(json.contains("\"failedTracks\""));
    }

    #[test]
    fn test_queue_result() {
        let result = QueueResult { completed: 5, failed: 2 };

        assert_eq!(result.completed, 5);
        assert_eq!(result.failed, 2);
    }
}
