use crate::models::url::ValidationResult;
use crate::models::PlaylistTracksResponse;
use crate::services::http::{RequestBuilderExt, API_V2_BASE};
use crate::services::playlist::build_playlist_url;
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

async fn modify_playlist_tracks<F>(
    playlist_id: u64,
    app: &tauri::AppHandle,
    operation: &str,
    modifier: F,
) -> Result<(), String>
where
    F: FnOnce(Vec<u64>) -> Result<Vec<u64>, String>,
{
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = super::require_auth_and_cid(app).await?;

    let client = &*crate::services::http::HTTP_CLIENT;
    let url = build_playlist_url(playlist_id, &client_id, None);

    let response = client
        .get(&url)
        .with_oauth(Some(&token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch playlist: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to fetch playlist: HTTP {}",
            response.status()
        ));
    }

    let playlist: PlaylistTracksResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse playlist: {}", e))?;

    let track_ids: Vec<u64> = playlist.tracks.iter().map(|t| t.id).collect();
    let new_track_ids = modifier(track_ids)?;

    let put_url = format!(
        "{}/playlists/{}?client_id={}",
        API_V2_BASE, playlist_id, client_id
    );

    let mut put_request = client
        .put(&put_url)
        .with_oauth(Some(&token))
        .json(&serde_json::json!({
            "playlist": {
                "tracks": new_track_ids
            }
        }));

    if let Some(ref dd) = datadome {
        put_request = put_request.header("x-datadome-clientid", dd);
    }

    let put_response = put_request
        .send()
        .await
        .map_err(|e| format!("Failed to update playlist: {}", e))?;

    if !put_response.status().is_success() {
        let status = put_response.status();
        let body = put_response.text().await.unwrap_or_default();
        log::error!("[{}] PUT failed: {} - {}", operation, status, body);
        return Err(format!("Failed to update playlist: HTTP {}", status));
    }

    Ok(())
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

    modify_playlist_tracks(playlist_id, &app, "add_track_to_playlist", |mut ids| {
        if ids.contains(&track_id) {
            return Err("Track already in this playlist".to_string());
        }
        ids.push(track_id);
        Ok(ids)
    })
    .await?;

    log::info!(
        "[add_track_to_playlist] Successfully added track {} to playlist {}",
        track_id,
        playlist_id
    );

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn remove_track_from_playlist(
    playlist_id: u64,
    track_id: u64,
    app: tauri::AppHandle,
) -> Result<(), String> {
    log::info!(
        "[remove_track_from_playlist] Removing track {} from playlist {}",
        track_id,
        playlist_id
    );

    modify_playlist_tracks(
        playlist_id,
        &app,
        "remove_track_from_playlist",
        |ids| {
            let original_len = ids.len();
            let filtered: Vec<u64> = ids.into_iter().filter(|&id| id != track_id).collect();
            if filtered.len() == original_len {
                return Err("Track not found in playlist".to_string());
            }
            Ok(filtered)
        },
    )
    .await?;

    log::info!(
        "[remove_track_from_playlist] Successfully removed track {} from playlist {}",
        track_id,
        playlist_id
    );

    Ok(())
}
