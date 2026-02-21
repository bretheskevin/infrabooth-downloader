use serde::Deserialize;
use specta::Type;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, State};

use crate::models::{ErrorResponse, HasErrorCode};
use crate::services::auth_choice::{AuthChoice, AuthChoiceState};
use crate::services::cancellation::CancellationState;
use crate::services::metadata::TrackMetadata;
use crate::services::paths::get_downloads_dir;
use crate::services::pipeline::{download_and_convert, PipelineConfig};
use crate::services::queue::{DownloadQueue, QueueItem, QueueProcessContext};
use crate::services::ytdlp::DownloadProgressEvent;

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub track_url: String,
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub track_number: Option<u32>,
    pub total_tracks: Option<u32>,
    pub artwork_url: Option<String>,
    pub output_dir: Option<String>,
}

/// Download and convert a track to MP3 with metadata embedding.
///
/// This command orchestrates the full download pipeline:
/// 1. Downloads audio using yt-dlp with OAuth authentication
/// 2. Converts to high-quality MP3 using yt-dlp native conversion
/// 3. Embeds ID3 metadata (title, artist, album, track number, artwork)
/// 4. Emits progress events throughout the process
#[tauri::command]
#[specta::specta]
pub async fn download_track_full(
    request: DownloadRequest,
    app: tauri::AppHandle,
) -> Result<String, ErrorResponse> {
    let output_path = match request.output_dir {
        Some(dir) => PathBuf::from(dir),
        None => get_download_path(&app)?,
    };

    let metadata = TrackMetadata {
        title: request.title,
        artist: request.artist,
        album: request.album,
        track_number: request.track_number,
        total_tracks: request.total_tracks,
        artwork_url: request.artwork_url,
    };

    let track_id = request.track_id.clone();

    let config = PipelineConfig {
        track_url: request.track_url,
        track_id: track_id.clone(),
        output_dir: output_path,
        metadata,
        playlist_context: None,
    };

    let result_path = download_and_convert(&app, config, None, None, None, false)
        .await
        .map_err(|e| {
            let _ = app.emit(
                "download-progress",
                DownloadProgressEvent {
                    track_id: track_id.clone(),
                    status: "failed".to_string(),
                    percent: None,
                    downloaded_bytes: None,
                    total_bytes: None,
                    error: Some(ErrorResponse {
                        code: e.code().to_string(),
                        message: e.to_string(),
                    }),
                },
            );
            ErrorResponse::from(e)
        })?;

    let _ = app.emit(
        "download-progress",
        DownloadProgressEvent {
            track_id,
            status: "complete".to_string(),
            percent: Some(1.0),
            downloaded_bytes: None,
            total_bytes: None,
            error: None,
        },
    );

    Ok(result_path.to_str().unwrap_or_default().to_string())
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StartQueueRequest {
    pub tracks: Vec<QueueItemRequest>,
    pub album_name: Option<String>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct QueueItemRequest {
    pub track_url: String,
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub artwork_url: Option<String>,
}

/// Start processing a download queue.
///
/// This command accepts a list of tracks and processes them sequentially.
/// Progress events are emitted via:
/// - `queue-progress`: Overall queue progress (X of Y)
/// - `download-progress`: Per-track status
/// - `queue-complete`: Final results when queue finishes
/// - `queue-cancelled`: When queue is cancelled by user
#[tauri::command]
#[specta::specta]
pub async fn start_download_queue(
    request: StartQueueRequest,
    app: tauri::AppHandle,
    cancel_state: State<'_, CancellationState>,
    auth_choice_state: State<'_, Arc<AuthChoiceState>>,
) -> Result<(), String> {
    cancel_state.reset();
    auth_choice_state.reset();

    let output_dir = match request.output_dir {
        Some(dir) => PathBuf::from(dir),
        None => get_download_path(&app).map_err(|e| e.message)?,
    };

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
            track_number: Some((i + 1) as u32),
        })
        .collect();

    let mut queue = DownloadQueue::new(items, request.album_name);

    let ctx = QueueProcessContext {
        output_dir,
        cancel_rx: cancel_state.subscribe(),
        active_child: cancel_state.active_child(),
        active_pid: cancel_state.active_pid(),
        auth_choice_state: Arc::clone(&auth_choice_state),
    };

    tokio::spawn(async move {
        let result = queue.process(app, ctx).await;
        log::info!(
            "[queue] Processing complete: {} succeeded, {} failed",
            result.completed,
            result.failed
        );
    });

    Ok(())
}

/// Cancel the current download queue.
#[tauri::command]
#[specta::specta]
pub async fn cancel_download_queue(
    cancel_state: State<'_, CancellationState>,
) -> Result<(), String> {
    log::info!("[download] Cancelling download queue");
    cancel_state.cancel();
    cancel_state.kill_active_process().await;
    Ok(())
}

/// Respond to an auth choice prompt during download.
#[tauri::command]
#[specta::specta]
pub async fn respond_to_auth_choice(
    choice: AuthChoice,
    auth_choice_state: State<'_, Arc<AuthChoiceState>>,
) -> Result<(), String> {
    log::info!("[download] Auth choice received: {:?}", choice);
    auth_choice_state.send_choice(choice);
    Ok(())
}

fn get_download_path(app: &tauri::AppHandle) -> Result<PathBuf, ErrorResponse> {
    get_downloads_dir(app).map_err(|message| ErrorResponse {
        code: "DOWNLOAD_FAILED".to_string(),
        message,
    })
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
            "artworkUrl": "https://example.com/art.jpg"
        }"#;

        let request: DownloadRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.track_url, "https://soundcloud.com/test/track");
        assert_eq!(request.track_id, "123456");
        assert_eq!(request.title, "Test Track");
        assert_eq!(request.artist, "Test Artist");
        assert_eq!(request.album, Some("Test Album".to_string()));
        assert_eq!(request.track_number, Some(5));
        assert_eq!(request.total_tracks, Some(10));
        assert_eq!(
            request.artwork_url,
            Some("https://example.com/art.jpg".to_string())
        );
    }

    #[test]
    fn test_download_request_deserialize_minimal() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist"
        }"#;

        let request: DownloadRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.track_url, "https://soundcloud.com/test/track");
        assert!(request.album.is_none());
        assert!(request.track_number.is_none());
        assert!(request.artwork_url.is_none());
        assert!(request.output_dir.is_none());
    }

    #[test]
    fn test_queue_item_request_deserialize() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist",
            "artworkUrl": "https://example.com/art.jpg"
        }"#;

        let item: QueueItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(item.track_url, "https://soundcloud.com/test/track");
        assert_eq!(item.track_id, "123456");
        assert_eq!(item.title, "Test Track");
        assert_eq!(item.artist, "Test Artist");
        assert_eq!(
            item.artwork_url,
            Some("https://example.com/art.jpg".to_string())
        );
    }

    #[test]
    fn test_queue_item_request_deserialize_minimal() {
        let json = r#"{
            "trackUrl": "https://soundcloud.com/test/track",
            "trackId": "123456",
            "title": "Test Track",
            "artist": "Test Artist"
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
                    "artist": "Artist"
                },
                {
                    "trackUrl": "https://soundcloud.com/test/track2",
                    "trackId": "2",
                    "title": "Track 2",
                    "artist": "Artist",
                    "artworkUrl": "https://example.com/art.jpg"
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
                    "artist": "Artist"
                }
            ]
        }"#;

        let request: StartQueueRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.tracks.len(), 1);
        assert!(request.album_name.is_none());
    }
}
