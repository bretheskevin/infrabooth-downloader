use std::path::PathBuf;
use serde::Deserialize;
use tauri::{Emitter, Manager};

use crate::models::ErrorResponse;
use crate::services::metadata::TrackMetadata;
use crate::services::pipeline::{download_and_convert, PipelineConfig};
use crate::services::ytdlp::{DownloadErrorPayload, DownloadProgressEvent};

/// Request payload for downloading a track with full metadata.
#[derive(Debug, Deserialize)]
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
///
/// Progress events are emitted via the `download-progress` event channel:
/// - "downloading" - During yt-dlp download
/// - "converting" - During audio conversion
/// - "complete" - When pipeline finishes successfully
/// - "failed" - If any step fails
///
/// # Arguments
/// * `request` - The download request containing track URL, metadata, and options
/// * `app` - Tauri app handle
///
/// # Returns
/// The path to the downloaded MP3 file on success.
#[tauri::command]
pub async fn download_track_full(
    request: DownloadRequest,
    app: tauri::AppHandle,
) -> Result<String, ErrorResponse> {
    // Determine output directory
    let output_path = match request.output_dir {
        Some(dir) => PathBuf::from(dir),
        None => get_download_path(&app)?,
    };

    // Generate sanitized filename
    let filename = sanitize_filename(&request.artist, &request.title);

    // Build metadata
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
        filename,
        metadata,
    };

    let result_path = download_and_convert(&app, config).await.map_err(|e| {
        // Emit error status
        let _ = app.emit(
            "download-progress",
            DownloadProgressEvent {
                track_id: track_id.clone(),
                status: "failed".to_string(),
                percent: None,
                error: Some(DownloadErrorPayload {
                    code: e.code().to_string(),
                    message: e.to_string(),
                }),
            },
        );
        ErrorResponse::from(e)
    })?;

    // Emit complete status
    let _ = app.emit(
        "download-progress",
        DownloadProgressEvent {
            track_id,
            status: "complete".to_string(),
            percent: Some(1.0),
            error: None,
        },
    );

    Ok(result_path.to_str().unwrap_or_default().to_string())
}

/// Sanitize a filename by removing invalid filesystem characters.
///
/// Invalid characters on Windows/macOS are replaced with underscores:
/// / \ : * ? " < > |
fn sanitize_filename(artist: &str, title: &str) -> String {
    let raw = format!("{} - {}", artist, title);
    raw.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}

/// Get the default download path.
fn get_download_path(app: &tauri::AppHandle) -> Result<PathBuf, ErrorResponse> {
    app.path()
        .download_dir()
        .map_err(|e| ErrorResponse {
            code: "DOWNLOAD_FAILED".to_string(),
            message: format!("Failed to get downloads directory: {}", e),
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename_basic() {
        let result = sanitize_filename("Artist", "Track Name");
        assert_eq!(result, "Artist - Track Name");
    }

    #[test]
    fn test_sanitize_filename_with_slash() {
        let result = sanitize_filename("Artist/DJ", "Track Name");
        assert_eq!(result, "Artist_DJ - Track Name");
    }

    #[test]
    fn test_sanitize_filename_with_backslash() {
        let result = sanitize_filename("Artist\\DJ", "Track Name");
        assert_eq!(result, "Artist_DJ - Track Name");
    }

    #[test]
    fn test_sanitize_filename_with_colon() {
        let result = sanitize_filename("Artist", "Track: Remix");
        assert_eq!(result, "Artist - Track_ Remix");
    }

    #[test]
    fn test_sanitize_filename_with_asterisk() {
        let result = sanitize_filename("Artist*", "Track*Name");
        assert_eq!(result, "Artist_ - Track_Name");
    }

    #[test]
    fn test_sanitize_filename_with_question_mark() {
        let result = sanitize_filename("Artist", "What?");
        assert_eq!(result, "Artist - What_");
    }

    #[test]
    fn test_sanitize_filename_with_quotes() {
        let result = sanitize_filename("Artist", "\"Title\"");
        assert_eq!(result, "Artist - _Title_");
    }

    #[test]
    fn test_sanitize_filename_with_angle_brackets() {
        let result = sanitize_filename("Artist", "<Title>");
        assert_eq!(result, "Artist - _Title_");
    }

    #[test]
    fn test_sanitize_filename_with_pipe() {
        let result = sanitize_filename("Artist | DJ", "Track");
        assert_eq!(result, "Artist _ DJ - Track");
    }

    #[test]
    fn test_sanitize_filename_multiple_invalid_chars() {
        let result = sanitize_filename("A/B\\C:D", "E*F?G\"H<I>J|K");
        assert_eq!(result, "A_B_C_D - E_F_G_H_I_J_K");
    }

    #[test]
    fn test_sanitize_filename_preserves_valid_chars() {
        let result = sanitize_filename("Artist Name", "Track (Remix) [2024]");
        assert_eq!(result, "Artist Name - Track (Remix) [2024]");
    }

    #[test]
    fn test_sanitize_filename_unicode() {
        let result = sanitize_filename("Artiste", "Chanson française");
        assert_eq!(result, "Artiste - Chanson française");
    }

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
}
