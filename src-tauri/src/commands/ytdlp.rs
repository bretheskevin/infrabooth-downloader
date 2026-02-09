use crate::models::ErrorResponse;
use crate::services::ytdlp::{self, DownloadErrorPayload, DownloadProgressEvent, TrackDownloadConfig};
use tauri::Emitter;
use tempfile::tempdir;

/// Test the yt-dlp sidecar by getting its version.
///
/// This command verifies that the yt-dlp binary is properly bundled
/// and can be executed as a Tauri sidecar.
#[tauri::command]
pub async fn test_ytdlp(app: tauri::AppHandle) -> Result<String, ErrorResponse> {
    ytdlp::get_version(&app)
        .await
        .map_err(|e| e.into())
}

/// Start downloading a track using yt-dlp with OAuth authentication.
///
/// Downloads audio at the highest quality available based on user's subscription.
/// Progress events are emitted via the `download-progress` event channel.
///
/// # Arguments
/// * `track_url` - The SoundCloud track URL to download
/// * `track_id` - Unique identifier for the track (used in progress events)
/// * `app` - Tauri app handle
///
/// # Returns
/// The path to the downloaded file on success.
#[tauri::command]
pub async fn start_track_download(
    track_url: String,
    track_id: String,
    app: tauri::AppHandle,
) -> Result<String, ErrorResponse> {
    // Create temp directory for this download
    let temp_dir = tempdir().map_err(|e| ErrorResponse {
        code: "DOWNLOAD_FAILED".to_string(),
        message: format!("Failed to create temp directory: {}", e),
    })?;

    let config = TrackDownloadConfig {
        track_url,
        track_id: track_id.clone(),
        temp_dir: temp_dir.path().to_path_buf(),
    };

    // Emit starting status
    let _ = app.emit(
        "download-progress",
        DownloadProgressEvent {
            track_id: track_id.clone(),
            status: "downloading".to_string(),
            percent: Some(0.0),
            error: None,
        },
    );

    let output_path = ytdlp::download_track(&app, config).await.map_err(|e| {
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

    // Keep temp_dir alive by leaking it (will be cleaned after conversion in Story 4.4)
    let _ = temp_dir.keep();

    Ok(output_path.to_str().unwrap_or_default().to_string())
}

#[cfg(test)]
mod tests {
    // Integration tests for yt-dlp commands require a Tauri app context
    // and are covered by the test_ytdlp command verification in dev mode
}
