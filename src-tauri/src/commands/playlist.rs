use crate::models::url::ValidationResult;
use crate::services::playlist::{fetch_playlist_info, fetch_track_info, PlaylistInfo, TrackInfo};
use crate::services::url_validator::validate_url;

#[tauri::command]
pub fn validate_soundcloud_url(url: String) -> ValidationResult {
    validate_url(&url)
}

/// Fetches playlist information from SoundCloud.
///
/// # Arguments
/// * `url` - The SoundCloud playlist URL
///
/// # Returns
/// * `Ok(PlaylistInfo)` - The playlist metadata and tracks
/// * `Err(String)` - Error message if fetch fails
#[tauri::command]
pub async fn get_playlist_info(url: String) -> Result<PlaylistInfo, String> {
    fetch_playlist_info(&url)
        .await
        .map_err(|e| e.to_string())
}

/// Fetches track information from SoundCloud.
///
/// # Arguments
/// * `url` - The SoundCloud track URL
///
/// # Returns
/// * `Ok(TrackInfo)` - The track metadata
/// * `Err(String)` - Error message if fetch fails
#[tauri::command]
pub async fn get_track_info(url: String) -> Result<TrackInfo, String> {
    fetch_track_info(&url)
        .await
        .map_err(|e| e.to_string())
}
