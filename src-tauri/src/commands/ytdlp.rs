use crate::models::ErrorResponse;
use crate::services::ytdlp;

/// Test the yt-dlp sidecar by getting its version.
#[tauri::command]
#[specta::specta]
pub async fn test_ytdlp(app: tauri::AppHandle) -> Result<String, ErrorResponse> {
    ytdlp::get_version(&app).await.map_err(|e| e.into())
}
