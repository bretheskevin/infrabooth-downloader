use crate::models::url::ValidationResult;
use crate::services::playlist::{
    fetch_playlist_info, fetch_track_info, PlaylistError, PlaylistInfo, TrackInfo,
};
use crate::services::storage::{load_tokens, refresh_and_store_tokens};
use crate::services::url_validator::validate_url;

#[tauri::command]
#[specta::specta]
pub fn validate_soundcloud_url(url: String) -> ValidationResult {
    validate_url(&url)
}

async fn try_refresh_token() -> Result<(), String> {
    let tokens = load_tokens()
        .map_err(|e| e.to_string())?
        .ok_or("No tokens stored")?;
    refresh_and_store_tokens(&tokens).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_playlist_info(url: String) -> Result<PlaylistInfo, String> {
    log::info!("[get_playlist_info] Called with URL: {}", url);

    match fetch_playlist_info(&url).await {
        Ok(info) => {
            log::info!("[get_playlist_info] Success: got playlist '{}'", info.title);
            Ok(info)
        }
        Err(PlaylistError::TokenExpired) => {
            log::info!("[get_playlist_info] Token expired, attempting refresh...");
            try_refresh_token().await?;
            log::info!("[get_playlist_info] Token refreshed, retrying fetch...");
            fetch_playlist_info(&url).await.map_err(|e| {
                log::error!("[get_playlist_info] Retry failed: {}", e);
                e.to_string()
            })
        }
        Err(e) => {
            log::error!("[get_playlist_info] Error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_track_info(url: String) -> Result<TrackInfo, String> {
    log::info!("[get_track_info] Called with URL: {}", url);

    match fetch_track_info(&url).await {
        Ok(info) => {
            log::info!("[get_track_info] Success: got track '{}'", info.title);
            Ok(info)
        }
        Err(PlaylistError::TokenExpired) => {
            log::info!("[get_track_info] Token expired, attempting refresh...");
            try_refresh_token().await?;
            log::info!("[get_track_info] Token refreshed, retrying fetch...");
            fetch_track_info(&url).await.map_err(|e| {
                log::error!("[get_track_info] Retry failed: {}", e);
                e.to_string()
            })
        }
        Err(e) => {
            log::error!("[get_track_info] Error: {}", e);
            Err(e.to_string())
        }
    }
}
