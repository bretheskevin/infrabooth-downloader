use crate::models::url::ValidationResult;
use crate::services::playlist::{
    fetch_playlist_info, fetch_track_info, PlaylistInfo, TrackInfo,
};
use crate::services::storage::AuthState;
use crate::services::url_validator::validate_url;
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub fn validate_soundcloud_url(url: String) -> ValidationResult {
    validate_url(&url)
}

#[tauri::command]
#[specta::specta]
pub async fn get_playlist_info(url: String, app: tauri::AppHandle) -> Result<PlaylistInfo, String> {
    log::info!("[get_playlist_info] Called");
    let token = app.state::<AuthState>().get_token();
    match fetch_playlist_info(&url, token.as_deref()).await {
        Ok(info) => {
            log::info!("[get_playlist_info] Success: got playlist '{}'", info.title);
            Ok(info)
        }
        Err(e) => {
            log::error!("[get_playlist_info] Error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_track_info(url: String, app: tauri::AppHandle) -> Result<TrackInfo, String> {
    log::info!("[get_track_info] Called");
    let token = app.state::<AuthState>().get_token();
    match fetch_track_info(&url, token.as_deref()).await {
        Ok(info) => {
            log::info!("[get_track_info] Success: got track '{}'", info.title);
            Ok(info)
        }
        Err(e) => {
            log::error!("[get_track_info] Error: {}", e);
            Err(e.to_string())
        }
    }
}
