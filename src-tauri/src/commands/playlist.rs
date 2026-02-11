use crate::models::url::ValidationResult;
use crate::services::oauth::{get_client_secret, refresh_tokens};
use crate::services::playlist::{
    fetch_playlist_info, fetch_track_info, PlaylistError, PlaylistInfo, TrackInfo,
};
use crate::services::storage::{load_tokens, store_tokens, StoredTokens};
use crate::services::url_validator::validate_url;
use crate::services::ytdlp::{extract_playlist_info, extract_track_info};
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub fn validate_soundcloud_url(url: String) -> ValidationResult {
    validate_url(&url)
}

/// Refreshes the stored tokens and returns the new access token.
async fn try_refresh_token() -> Result<(), String> {
    let tokens = load_tokens()
        .map_err(|e| e.to_string())?
        .ok_or("No tokens stored")?;

    let client_secret = get_client_secret().map_err(|e| e.to_string())?;
    let new_tokens = refresh_tokens(&tokens.refresh_token, &client_secret)
        .await
        .map_err(|e| e.to_string())?;

    let expires_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + new_tokens.expires_in;

    let stored = StoredTokens {
        access_token: new_tokens.access_token,
        refresh_token: new_tokens.refresh_token,
        expires_at,
        username: tokens.username,
        plan: tokens.plan,
    };
    store_tokens(&stored).map_err(|e| e.to_string())?;

    Ok(())
}

/// Fetches playlist information from SoundCloud.
/// Auto-refreshes token if expired and retries.
/// Falls back to yt-dlp if no authentication is available.
#[tauri::command]
pub async fn get_playlist_info(
    app: tauri::AppHandle,
    url: String,
) -> Result<PlaylistInfo, String> {
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
        Err(PlaylistError::NoToken) => {
            log::info!("[get_playlist_info] No token available, using yt-dlp fallback...");
            extract_playlist_info(&app, &url).await.map_err(|e| {
                log::error!("[get_playlist_info] yt-dlp fallback failed: {}", e);
                e.to_string()
            })
        }
        Err(e) => {
            log::error!("[get_playlist_info] Error: {}", e);
            Err(e.to_string())
        }
    }
}

/// Fetches track information from SoundCloud.
/// Auto-refreshes token if expired and retries.
/// Falls back to yt-dlp if no authentication is available.
#[tauri::command]
pub async fn get_track_info(
    app: tauri::AppHandle,
    url: String,
) -> Result<TrackInfo, String> {
    match fetch_track_info(&url).await {
        Ok(info) => Ok(info),
        Err(PlaylistError::TokenExpired) => {
            // Try to refresh token and retry
            try_refresh_token().await?;
            fetch_track_info(&url).await.map_err(|e| e.to_string())
        }
        Err(PlaylistError::NoToken) => {
            log::info!("[get_track_info] No token available, using yt-dlp fallback...");
            extract_track_info(&app, &url).await.map_err(|e| {
                log::error!("[get_track_info] yt-dlp fallback failed: {}", e);
                e.to_string()
            })
        }
        Err(e) => Err(e.to_string()),
    }
}
