use serde::Deserialize;
use specta::Type;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, State};

use tauri::Manager;

use crate::models::{ErrorResponse, HasErrorCode, TrackCore};
use crate::services::cancellation::CancellationState;
use crate::services::downloader::DownloadProgressEvent;
use crate::services::events;
use crate::services::metadata::{scan_existing_track_ids, TrackMetadata};
use crate::services::paths::get_downloads_dir;
use crate::services::pipeline::{download_and_convert, PipelineConfig};
use crate::services::queue::{DownloadQueue, QueueItem, QueueProcessContext};
use crate::services::rate_limit_choice::{RateLimitChoice, RateLimitChoiceState};
use crate::services::storage::AuthState;

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    #[serde(flatten)]
    pub core: TrackCore,
    pub album: Option<String>,
    pub track_number: Option<u32>,
    pub total_tracks: Option<u32>,
    pub output_dir: Option<String>,
}

/// Download and convert a track to MP3 with metadata embedding.
///
/// This command orchestrates the full download pipeline:
/// 1. Resolves stream URL via SoundCloud API v2
/// 2. Downloads and converts to MP3 via ffmpeg
/// 3. Embeds ID3 metadata (title, artist, album, track number, artwork)
/// 4. Emits progress events throughout the process
#[tauri::command]
#[specta::specta]
pub async fn download_track_full(request: DownloadRequest, app: tauri::AppHandle) -> Result<String, ErrorResponse> {
    let output_path = match request.output_dir {
        Some(dir) => PathBuf::from(dir),
        None => get_download_path(&app)?,
    };

    let metadata = TrackMetadata {
        title: request.core.title.clone(),
        artist: request.core.artist.clone(),
        album: request.album,
        track_number: request.track_number,
        total_tracks: request.total_tracks,
        artwork_url: request.core.artwork_url.clone(),
        track_id: Some(request.core.track_id.clone()),
    };

    let track_id = request.core.track_id.clone();

    let config = PipelineConfig {
        track_url: request.core.track_url,
        track_id: track_id.clone(),
        output_dir: output_path,
        metadata,
        playlist_context: None,
        duration_ms: request.core.duration_ms,
        oauth_token: app.state::<AuthState>().get_token(),
        download_url: request.core.download_url,
    };

    let result_path = download_and_convert(&app, config, None).await.map_err(|e| {
        let _ = app.emit(
            events::DOWNLOAD_PROGRESS,
            DownloadProgressEvent::failed(track_id.clone(), ErrorResponse { code: e.code().to_string(), message: e.to_string() }),
        );
        ErrorResponse::from(e)
    })?;

    let result_str = result_path.to_string_lossy().to_string();
    let _ = app.emit(events::DOWNLOAD_PROGRESS, DownloadProgressEvent::complete(track_id, result_str.clone()));

    Ok(result_str)
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StartQueueRequest {
    pub tracks: Vec<QueueItemRequest>,
    pub album_name: Option<String>,
    pub output_dir: Option<String>,
    pub max_concurrent: Option<u8>,
    pub preserve_order: Option<bool>,
}

pub type QueueItemRequest = TrackCore;

/// Start processing a download queue.
///
/// This command accepts a list of tracks and processes them in parallel.
/// Progress events are emitted via:
/// - `queue-progress`: Overall queue progress (X of Y)
/// - `download-progress`: Per-track status
/// - `queue-complete`: Final results when queue finishes
/// - `queue-cancelled`: When queue is cancelled by user
#[tauri::command]
#[specta::specta]
pub async fn start_download_queue(
    request: StartQueueRequest, app: tauri::AppHandle, cancel_state: State<'_, CancellationState>,
    rate_limit_choice_state: State<'_, Arc<RateLimitChoiceState>>,
) -> Result<(), ErrorResponse> {
    cancel_state.reset();
    rate_limit_choice_state.reset();

    let output_dir = match request.output_dir {
        Some(dir) => PathBuf::from(dir),
        None => get_download_path(&app)?,
    };

    let preserve_order = request.preserve_order.unwrap_or(true);

    let items: Vec<QueueItem> = request
        .tracks
        .into_iter()
        .enumerate()
        .map(|(i, core)| QueueItem { core, track_number: if preserve_order { Some((i + 1) as u32) } else { None } })
        .collect();

    let mut queue = DownloadQueue::new(items, request.album_name);

    let ctx = QueueProcessContext {
        output_dir,
        cancel_rx: cancel_state.subscribe(),
        active_processes: cancel_state.active_processes(),
        rate_limit_choice_state: Arc::clone(&rate_limit_choice_state),
        max_concurrent: request.max_concurrent.unwrap_or(3).clamp(1, 10) as usize,
    };

    tokio::spawn(async move {
        let result = queue.process(app, ctx).await;
        log::info!("[queue] Processing complete: {} succeeded, {} failed", result.completed, result.failed);
    });

    Ok(())
}

/// Cancel the current download queue.
#[tauri::command]
#[specta::specta]
pub async fn cancel_download_queue(cancel_state: State<'_, CancellationState>) -> Result<(), ErrorResponse> {
    log::info!("[download] Cancelling download queue");
    cancel_state.cancel();
    cancel_state.kill_active_processes().await;
    Ok(())
}

/// Respond to a rate limit choice prompt during download.
#[tauri::command]
#[specta::specta]
pub async fn respond_to_rate_limit_choice(choice: RateLimitChoice, rate_limit_choice_state: State<'_, Arc<RateLimitChoiceState>>) -> Result<(), ErrorResponse> {
    log::info!("[download] Rate limit choice received: {:?}", choice);
    rate_limit_choice_state.send_choice(choice);
    Ok(())
}

fn get_download_path(app: &tauri::AppHandle) -> Result<PathBuf, ErrorResponse> {
    get_downloads_dir(app).map_err(|message| ErrorResponse { code: "DOWNLOAD_FAILED".to_string(), message })
}

#[tauri::command]
#[specta::specta]
pub fn scan_existing_tracks(output_dir: String, track_ids: Vec<String>) -> HashMap<String, String> {
    let dir = PathBuf::from(&output_dir);
    if !dir.exists() {
        return HashMap::new();
    }
    scan_existing_track_ids(&dir, &track_ids, false).into_iter().map(|(id, path)| (id, path.to_string_lossy().to_string())).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_download_request_deserialize() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist",
            "album": "Test Album",
            "trackNumber": 5,
            "totalTracks": 10,
            "artworkUrl": "https://example.com/art.jpg",
            "durationMs": 180000
        }"#;

        let request: DownloadRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.core.track_url, "https://soundcloud.com/test/track");
        assert_eq!(request.core.track_id, "123456");
        assert_eq!(request.core.title, "Test Track");
        assert_eq!(request.core.artist, "Test Artist");
        assert_eq!(request.album, Some("Test Album".to_string()));
        assert_eq!(request.track_number, Some(5));
        assert_eq!(request.total_tracks, Some(10));
        assert_eq!(request.core.artwork_url, Some("https://example.com/art.jpg".to_string()));
        assert_eq!(request.core.duration_ms, 180000);
    }

    #[test]
    fn test_download_request_deserialize_minimal() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist",
            "durationMs": 0
        }"#;

        let request: DownloadRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.core.track_url, "https://soundcloud.com/test/track");
        assert!(request.album.is_none());
        assert!(request.track_number.is_none());
        assert!(request.core.artwork_url.is_none());
        assert!(request.output_dir.is_none());
        assert_eq!(request.core.duration_ms, 0);
    }

    #[test]
    fn test_queue_item_request_deserialize() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist",
            "artworkUrl": "https://example.com/art.jpg",
            "durationMs": 180000
        }"#;

        let item: QueueItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(item.track_url, "https://soundcloud.com/test/track");
        assert_eq!(item.track_id, "123456");
        assert_eq!(item.title, "Test Track");
        assert_eq!(item.artist, "Test Artist");
        assert_eq!(item.artwork_url, Some("https://example.com/art.jpg".to_string()));
        assert_eq!(item.duration_ms, 180000);
    }

    #[test]
    fn test_queue_item_request_deserialize_minimal() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist",
            "durationMs": 0
        }"#;

        let item: QueueItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(item.track_url, "https://soundcloud.com/test/track");
        assert!(item.artwork_url.is_none());
    }

    #[test]
    fn test_start_queue_request_deserialize() {
        let json = r#"{
            "tracks": [
                {
                    "trackUrl": "https://soundcloud.com/test/track1",
                    "trackId": "1",
                    "title": "Track 1",
                    "artist": "Artist",
                    "durationMs": 180000
                },
                {
                    "trackUrl": "https://soundcloud.com/test/track2",
                    "trackId": "2",
                    "title": "Track 2",
                    "artist": "Artist",
                    "artworkUrl": "https://example.com/art.jpg",
                    "durationMs": 240000
                }
            ],
            "albumName": "Test Album"
        }"#;

        let request: StartQueueRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.tracks.len(), 2);
        assert_eq!(request.album_name, Some("Test Album".to_string()));
        assert_eq!(request.tracks[0].track_id, "1");
        assert_eq!(request.tracks[1].track_id, "2");
        assert!(request.tracks[0].artwork_url.is_none());
        assert!(request.tracks[1].artwork_url.is_some());
    }

    #[test]
    fn test_start_queue_request_deserialize_no_album() {
        let json = r#"{
            "tracks": [
                {
                    "trackUrl": "https://soundcloud.com/test/track1",
                    "trackId": "1",
                    "title": "Track 1",
                    "artist": "Artist",
                    "durationMs": 180000
                }
            ]
        }"#;

        let request: StartQueueRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.tracks.len(), 1);
        assert!(request.album_name.is_none());
    }
}
