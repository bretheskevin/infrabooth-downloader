use crate::models::error::FfmpegError;
use crate::services::sidecar::get_sidecar_version;

pub async fn get_version<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<String, FfmpegError> {
    get_sidecar_version(app, "ffmpeg", "-version", || FfmpegError::BinaryNotFound).await
}
