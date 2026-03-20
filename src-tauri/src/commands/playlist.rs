use crate::models::url::ValidationResult;
use crate::models::PlaylistTracksResponse;
use crate::services::client_id;
use crate::services::http::RequestBuilderExt;
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

#[tauri::command]
#[specta::specta]
pub async fn add_track_to_playlist(
    playlist_id: u64,
    track_id: u64,
    app: tauri::AppHandle,
) -> Result<(), String> {
    log::info!(
        "[add_track_to_playlist] Adding track {} to playlist {}",
        track_id,
        playlist_id
    );

    let auth_state = app.state::<AuthState>();
    let token = auth_state
        .get_token()
        .ok_or_else(|| "Authentication required".to_string())?;
    let datadome = auth_state.get_datadome();

    let client_id = client_id::get_client_id()
        .await
        .map_err(|e| format!("Failed to get client_id: {}", e))?;

    // Fetch current playlist to get existing track IDs
    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!(
        "https://api-v2.soundcloud.com/playlists/{}?representation=full&client_id={}",
        playlist_id, client_id
    );

    let response = client
        .get(&url)
        .with_oauth(Some(&token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch playlist: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch playlist: HTTP {}", response.status()));
    }

    let playlist: PlaylistTracksResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse playlist: {}", e))?;

    // Extract existing track IDs
    let mut track_ids: Vec<u64> = playlist.tracks.iter().map(|t| t.id).collect();

    // Check for duplicate
    if track_ids.contains(&track_id) {
        return Err("Track already in this playlist".to_string());
    }

    // Append new track
    track_ids.push(track_id);

    // PUT updated playlist
    let put_url = format!(
        "https://api-v2.soundcloud.com/playlists/{}?client_id={}",
        playlist_id, client_id
    );

    let mut put_request = client
        .put(&put_url)
        .with_oauth(Some(&token))
        .json(&serde_json::json!({
            "playlist": {
                "tracks": track_ids
            }
        }));

    // Add DataDome header if available (required for write operations)
    if let Some(ref dd) = datadome {
        put_request = put_request.header("x-datadome-clientid", dd);
    }

    let put_response = put_request.send()
        .await
        .map_err(|e| format!("Failed to update playlist: {}", e))?;

    if !put_response.status().is_success() {
        let status = put_response.status();
        let body = put_response.text().await.unwrap_or_default();
        log::error!("[add_track_to_playlist] PUT failed: {} - {}", status, body);
        return Err(format!("Failed to update playlist: HTTP {}", status));
    }

    log::info!(
        "[add_track_to_playlist] Successfully added track {} to playlist {}",
        track_id,
        playlist_id
    );

    Ok(())
}
