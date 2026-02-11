use crate::models::ErrorResponse;
use crate::services::ffmpeg;

/// Test the FFmpeg sidecar by getting its version.
///
/// This command verifies that the FFmpeg binary is properly bundled
/// and can be executed as a Tauri sidecar.
#[tauri::command]
pub async fn test_ffmpeg(app: tauri::AppHandle) -> Result<String, ErrorResponse> {
    ffmpeg::get_version(&app).await.map_err(|e| e.into())
}

#[cfg(test)]
mod tests {
    // Integration tests for FFmpeg commands require a Tauri app context
    // and are covered by the test_ffmpeg command verification in dev mode
}
