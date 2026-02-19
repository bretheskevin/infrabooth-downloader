use std::future::Future;

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

async fn with_token_refresh<T, F, Fut>(
    fetch_fn: F,
    context: &str,
    success_log: impl FnOnce(&T) -> String,
) -> Result<T, String>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, PlaylistError>>,
{
    log::info!("[{}] Called", context);

    match fetch_fn().await {
        Ok(result) => {
            log::info!("[{}] Success: {}", context, success_log(&result));
            Ok(result)
        }
        Err(PlaylistError::TokenExpired) => {
            log::info!("[{}] Token expired, attempting refresh...", context);
            try_refresh_token().await?;
            log::info!("[{}] Token refreshed, retrying fetch...", context);
            fetch_fn().await.map_err(|e| {
                log::error!("[{}] Retry failed: {}", context, e);
                e.to_string()
            })
        }
        Err(e) => {
            log::error!("[{}] Error: {}", context, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_playlist_info(url: String) -> Result<PlaylistInfo, String> {
    with_token_refresh(
        || fetch_playlist_info(&url),
        "get_playlist_info",
        |info| format!("got playlist '{}'", info.title),
    )
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_track_info(url: String) -> Result<TrackInfo, String> {
    with_token_refresh(
        || fetch_track_info(&url),
        "get_track_info",
        |info| format!("got track '{}'", info.title),
    )
    .await
}
