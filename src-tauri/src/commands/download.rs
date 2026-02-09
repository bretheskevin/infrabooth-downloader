use std::path::PathBuf;
use tauri::{Emitter, Manager};

use crate::models::ErrorResponse;
use crate::services::pipeline::{download_and_convert, PipelineConfig};
use crate::services::ytdlp::{DownloadErrorPayload, DownloadProgressEvent};

/// Download and convert a track to MP3.
///
/// This command orchestrates the full download pipeline:
/// 1. Downloads audio using yt-dlp with OAuth authentication
/// 2. Converts to high-quality MP3 using FFmpeg
/// 3. Emits progress events throughout the process
///
/// Progress events are emitted via the `download-progress` event channel:
/// - "downloading" - During yt-dlp download
/// - "converting" - During FFmpeg conversion
/// - "complete" - When pipeline finishes successfully
/// - "failed" - If any step fails
///
/// # Arguments
/// * `track_url` - The SoundCloud track URL to download
/// * `track_id` - Unique identifier for the track (used in progress events)
/// * `filename` - Desired filename without extension (e.g., "Artist - Title")
/// * `output_dir` - Optional output directory (defaults to system Downloads folder)
/// * `app` - Tauri app handle
///
/// # Returns
/// The path to the downloaded MP3 file on success.
#[tauri::command]
pub async fn download_track_full(
    track_url: String,
    track_id: String,
    filename: String,
    output_dir: Option<String>,
    app: tauri::AppHandle,
) -> Result<String, ErrorResponse> {
    // Determine output directory
    let output_path = match output_dir {
        Some(dir) => PathBuf::from(dir),
        None => get_download_path(&app)?,
    };

    let config = PipelineConfig {
        track_url,
        track_id: track_id.clone(),
        output_dir: output_path,
        filename,
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
    // Integration tests for download commands require a Tauri app context
    // and are covered by manual testing with real SoundCloud tracks
}
