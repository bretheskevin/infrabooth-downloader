use serde::Serialize;
use specta::Type;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_shell::process::CommandChild;
use tokio::sync::{watch, Mutex};

use crate::models::error::{HasErrorCode, PipelineError, YtDlpError};
use crate::services::auth_choice::{AuthChoice, AuthChoiceState, DownloadAuthNeededEvent};
use crate::services::metadata::TrackMetadata;
use crate::services::pipeline::{download_and_convert, PipelineConfig};
use crate::services::ytdlp::PlaylistContext;

/// An item in the download queue.
#[derive(Clone, Debug, Type)]
pub struct QueueItem {
    pub track_url: String,
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub artwork_url: Option<String>,
    pub track_number: Option<u32>,
}

/// Event payload for queue progress updates.
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct QueueProgressEvent {
    pub current: u32,
    pub total: u32,
    pub track_id: String,
}

/// Event payload for queue completion.
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct QueueCompleteEvent {
    pub completed: u32,
    pub failed: u32,
    pub total: u32,
    pub failed_tracks: Vec<(String, String)>, // (trackId, errorMessage)
}

/// Event payload for queue cancellation.
#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct QueueCancelledEvent {
    pub completed: u32,
    pub cancelled: u32,
    pub total: u32,
}

/// Result of queue processing.
#[allow(dead_code)]
pub struct QueueResult {
    pub completed: u32,
    pub failed: u32,
}

/// Download queue manager for processing multiple tracks sequentially.
pub struct DownloadQueue {
    items: Vec<QueueItem>,
    current_index: usize,
    is_processing: bool,
    album_name: Option<String>,
    total_tracks: u32,
}

impl DownloadQueue {
    /// Create a new download queue.
    pub fn new(items: Vec<QueueItem>, album_name: Option<String>) -> Self {
        let total = items.len() as u32;
        Self {
            items,
            current_index: 0,
            is_processing: false,
            album_name,
            total_tracks: total,
        }
    }

    /// Process all items in the queue sequentially.
    ///
    /// Emits events for progress tracking:
    /// - `queue-progress`: After each track starts
    /// - `download-progress`: Per-track status (from pipeline)
    /// - `queue-complete`: When all tracks are processed
    /// - `queue-cancelled`: When queue is cancelled by user
    /// - `download-auth-needed`: When auth refresh fails and user input is needed
    ///
    /// On rate limit errors, the queue pauses with backoff and retries.
    /// On auth refresh errors, the queue pauses for user input.
    /// On other errors, the queue records the failure and continues.
    pub async fn process<R: Runtime>(
        &mut self,
        app: AppHandle<R>,
        output_dir: PathBuf,
        cancel_rx: watch::Receiver<bool>,
        active_child: Arc<Mutex<Option<CommandChild>>>,
        active_pid: Arc<Mutex<Option<u32>>>,
        auth_choice_state: Arc<AuthChoiceState>,
        skip_auth: Arc<AtomicBool>,
    ) -> QueueResult {
        self.is_processing = true;
        let mut completed = 0u32;
        let mut failed = 0u32;
        let mut failed_tracks: Vec<(String, String)> = vec![];
        let mut retry_count = 0u32;

        while self.current_index < self.items.len() {
            // Check for cancellation before starting next track
            if *cancel_rx.borrow() {
                log::info!("[queue] Cancellation requested, stopping queue");
                let cancelled = self.total_tracks - completed - failed;
                let _ = app.emit(
                    "queue-cancelled",
                    QueueCancelledEvent {
                        completed,
                        cancelled,
                        total: self.total_tracks,
                    },
                );
                self.is_processing = false;
                return QueueResult { completed, failed };
            }

            let item = &self.items[self.current_index];

            // Emit queue progress
            let _ = app.emit(
                "queue-progress",
                QueueProgressEvent {
                    current: (self.current_index + 1) as u32,
                    total: self.total_tracks,
                    track_id: item.track_id.clone(),
                },
            );

            // Build playlist context if this is a playlist (more than 1 track)
            let playlist_context = if self.total_tracks > 1 {
                Some(PlaylistContext {
                    track_position: item.track_number.unwrap_or((self.current_index + 1) as u32),
                    total_tracks: self.total_tracks,
                })
            } else {
                None
            };

            let config = PipelineConfig {
                track_url: item.track_url.clone(),
                track_id: item.track_id.clone(),
                output_dir: output_dir.clone(),
                metadata: TrackMetadata {
                    title: item.title.clone(),
                    artist: item.artist.clone(),
                    album: self.album_name.clone(),
                    track_number: item.track_number,
                    total_tracks: Some(self.total_tracks),
                    artwork_url: item.artwork_url.clone(),
                },
                playlist_context,
            };

            match download_and_convert(&app, config, Some(active_child.clone()), Some(cancel_rx.clone()), Some(active_pid.clone()), skip_auth.load(Ordering::SeqCst)).await {
                Ok(_) => {
                    let _ = app.emit(
                        "download-progress",
                        serde_json::json!({
                            "trackId": item.track_id,
                            "status": "complete",
                            "percent": 1.0
                        }),
                    );
                    completed += 1;
                    retry_count = 0;
                }
                Err(PipelineError::Download(YtDlpError::Cancelled)) => {
                    log::info!("[queue] Track {} download was cancelled", item.track_id);
                    let cancelled = self.total_tracks - completed - failed;
                    let _ = app.emit(
                        "queue-cancelled",
                        QueueCancelledEvent {
                            completed,
                            cancelled,
                            total: self.total_tracks,
                        },
                    );
                    self.is_processing = false;
                    return QueueResult { completed, failed };
                }
                Err(PipelineError::Download(YtDlpError::RateLimited)) => {
                    // Rate limited - pause and retry same track
                    let backoff = calculate_backoff(retry_count);
                    log::warn!(
                        "Rate limited on track {}, backing off for {}s",
                        item.track_id,
                        backoff
                    );

                    let _ = app.emit(
                        "download-progress",
                        serde_json::json!({
                            "trackId": item.track_id,
                            "status": "rate_limited",
                        }),
                    );

                    tokio::time::sleep(std::time::Duration::from_secs(backoff)).await;
                    retry_count += 1;
                    continue; // Retry same track, don't increment index
                }
                Err(PipelineError::Download(YtDlpError::AuthRefreshFailed)) => {
                    log::info!("[queue] Auth refresh failed for track {}, waiting for user choice", item.track_id);

                    auth_choice_state.set_pending(true).await;
                    let _ = app.emit(
                        "download-auth-needed",
                        DownloadAuthNeededEvent {
                            track_id: item.track_id.clone(),
                            track_title: item.title.clone(),
                        },
                    );

                    let mut choice_rx = auth_choice_state.subscribe();
                    loop {
                        if *cancel_rx.borrow() {
                            log::info!("[queue] Cancellation during auth wait");
                            auth_choice_state.set_pending(false).await;
                            let cancelled = self.total_tracks - completed - failed;
                            let _ = app.emit(
                                "queue-cancelled",
                                QueueCancelledEvent {
                                    completed,
                                    cancelled,
                                    total: self.total_tracks,
                                },
                            );
                            self.is_processing = false;
                            return QueueResult { completed, failed };
                        }

                        if choice_rx.changed().await.is_ok() {
                            let choice = { *choice_rx.borrow() };
                            if let Some(choice) = choice {
                                auth_choice_state.set_pending(false).await;
                                match choice {
                                    AuthChoice::ReAuthenticated => {
                                        log::info!("[queue] User re-authenticated, retrying track");
                                        break;
                                    }
                                    AuthChoice::ContinueStandard => {
                                        log::info!("[queue] User chose standard quality, setting skip_auth flag");
                                        skip_auth.store(true, Ordering::SeqCst);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    continue;
                }
                Err(e) => {
                    log::error!("[queue] Track {} failed: {}", item.track_id, e);
                    let _ = app.emit(
                        "download-progress",
                        serde_json::json!({
                            "trackId": item.track_id,
                            "status": "failed",
                            "error": {
                                "code": e.code(),
                                "message": e.to_string()
                            }
                        }),
                    );
                    failed += 1;
                    failed_tracks.push((item.track_id.clone(), e.to_string()));
                    retry_count = 0;
                }
            }

            self.current_index += 1;
        }

        self.is_processing = false;

        // Clear active child on completion
        {
            let mut guard = active_child.lock().await;
            *guard = None;
        }

        // Emit completion
        let _ = app.emit(
            "queue-complete",
            QueueCompleteEvent {
                completed,
                failed,
                total: self.total_tracks,
                failed_tracks: failed_tracks.clone(),
            },
        );

        QueueResult { completed, failed }
    }
}

/// Calculate backoff time using Fibonacci sequence.
///
/// Returns seconds to wait: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
/// Capped at retry_count=10 (~89 seconds max).
fn calculate_backoff(retry_count: u32) -> u64 {
    let fib = |n: u32| -> u64 {
        let mut a = 1u64;
        let mut b = 1u64;
        for _ in 0..n {
            let tmp = a + b;
            a = b;
            b = tmp;
        }
        a
    };
    fib(retry_count.min(10)) // Cap at ~89 seconds
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_queue_item_creation() {
        let item = QueueItem {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),
            title: "Track Name".to_string(),
            artist: "Artist".to_string(),
            artwork_url: Some("https://example.com/art.jpg".to_string()),
            track_number: Some(1),
        };

        assert_eq!(item.track_url, "https://soundcloud.com/test/track");
        assert_eq!(item.track_id, "123456");
        assert_eq!(item.title, "Track Name");
        assert_eq!(item.artist, "Artist");
        assert_eq!(
            item.artwork_url,
            Some("https://example.com/art.jpg".to_string())
        );
        assert_eq!(item.track_number, Some(1));
    }

    #[test]
    fn test_queue_item_clone() {
        let item = QueueItem {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),
            title: "Track".to_string(),
            artist: "Artist".to_string(),
            artwork_url: None,
            track_number: None,
        };

        let cloned = item.clone();
        assert_eq!(cloned.track_id, item.track_id);
        assert_eq!(cloned.title, item.title);
    }

    #[test]
    fn test_download_queue_new() {
        let items = vec![
            QueueItem {
                track_url: "url1".to_string(),
                track_id: "1".to_string(),
                title: "Track 1".to_string(),
                artist: "Artist".to_string(),
                artwork_url: None,
                track_number: Some(1),
            },
            QueueItem {
                track_url: "url2".to_string(),
                track_id: "2".to_string(),
                title: "Track 2".to_string(),
                artist: "Artist".to_string(),
                artwork_url: None,
                track_number: Some(2),
            },
        ];

        let queue = DownloadQueue::new(items, Some("Album Name".to_string()));

        assert_eq!(queue.total_tracks, 2);
        assert_eq!(queue.current_index, 0);
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
    fn test_calculate_backoff_first() {
        assert_eq!(calculate_backoff(0), 1);
    }

    #[test]
    fn test_calculate_backoff_second() {
        assert_eq!(calculate_backoff(1), 1);
    }

    #[test]
    fn test_calculate_backoff_sequence() {
        // Fibonacci: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
        assert_eq!(calculate_backoff(2), 2);
        assert_eq!(calculate_backoff(3), 3);
        assert_eq!(calculate_backoff(4), 5);
        assert_eq!(calculate_backoff(5), 8);
        assert_eq!(calculate_backoff(6), 13);
        assert_eq!(calculate_backoff(7), 21);
        assert_eq!(calculate_backoff(8), 34);
        assert_eq!(calculate_backoff(9), 55);
        assert_eq!(calculate_backoff(10), 89);
    }

    #[test]
    fn test_calculate_backoff_capped() {
        // Should be capped at retry_count=10
        assert_eq!(calculate_backoff(11), 89);
        assert_eq!(calculate_backoff(100), 89);
    }

    #[test]
    fn test_queue_progress_event_serialize() {
        let event = QueueProgressEvent {
            current: 5,
            total: 10,
            track_id: "track123".to_string(),
        };

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
        let result = QueueResult {
            completed: 5,
            failed: 2,
        };

        assert_eq!(result.completed, 5);
        assert_eq!(result.failed, 2);
    }
}
