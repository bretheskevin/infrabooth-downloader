use crate::models::ErrorResponse;
use crate::services::ytdlp;

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

#[cfg(test)]
mod tests {
    // Integration tests for yt-dlp commands require a Tauri app context
    // and are covered by the test_ytdlp command verification in dev mode
}
