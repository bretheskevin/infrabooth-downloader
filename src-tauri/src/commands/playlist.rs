use serde::{Deserialize, Serialize};
use specta::Type;

use crate::models::url::ValidationResult;
use crate::models::PlaylistTracksResponse;
use crate::services::http::{extract_datadome_from_response, sanitize_error_body, RequestBuilderExt, API_V2_BASE};
use crate::services::playlist::build_playlist_url;
use crate::services::playlist::{fetch_playlist_info, fetch_track_info, PlaylistInfo, TrackInfo};
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

async fn modify_playlist_tracks<F>(playlist_id: u64, app: &tauri::AppHandle, operation: &str, modifier: F) -> Result<(), String>
where
    F: FnOnce(Vec<u64>) -> Result<Vec<u64>, String>,
{
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = super::require_auth_and_cid(app).await?;

    let client = &*crate::services::http::HTTP_CLIENT;
    let url = build_playlist_url(playlist_id, &client_id, None);

    let response = client.get(&url).with_oauth(Some(&token)).send().await.map_err(|e| format!("Failed to fetch playlist: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch playlist: HTTP {}", response.status()));
    }

    let playlist: PlaylistTracksResponse = response.json().await.map_err(|e| format!("Failed to parse playlist: {}", e))?;

    let track_ids: Vec<u64> = playlist.tracks.iter().map(|t| t.id).collect();
    let new_track_ids = modifier(track_ids)?;

    let put_url = format!("{}/playlists/{}?client_id={}", API_V2_BASE, playlist_id, client_id);

    let mut put_request = client.put(&put_url).with_oauth(Some(&token)).json(&serde_json::json!({
        "playlist": {
            "tracks": new_track_ids
        }
    }));

    put_request = put_request.with_datadome(datadome.as_deref());

    let put_response = put_request.send().await.map_err(|e| format!("Failed to update playlist: {}", e))?;

    state.update_datadome(extract_datadome_from_response(&put_response));

    if !put_response.status().is_success() {
        let status = put_response.status();
        let body = put_response.text().await.unwrap_or_default();
        log::error!("[{}] PUT failed: {} - {}", operation, status, body);
        return Err(format!("Failed to update playlist: HTTP {} - {}", status, sanitize_error_body(body)));
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn add_track_to_playlist(playlist_id: u64, track_id: u64, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[add_track_to_playlist] Adding track {} to playlist {}", track_id, playlist_id);

    modify_playlist_tracks(playlist_id, &app, "add_track_to_playlist", |mut ids| {
        if ids.contains(&track_id) {
            return Err("Track already in this playlist".to_string());
        }
        ids.push(track_id);
        Ok(ids)
    })
    .await?;

    log::info!("[add_track_to_playlist] Successfully added track {} to playlist {}", track_id, playlist_id);

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn remove_track_from_playlist(playlist_id: u64, track_id: u64, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[remove_track_from_playlist] Removing track {} from playlist {}", track_id, playlist_id);

    modify_playlist_tracks(playlist_id, &app, "remove_track_from_playlist", |ids| {
        let original_len = ids.len();
        let filtered: Vec<u64> = ids.into_iter().filter(|&id| id != track_id).collect();
        if filtered.len() == original_len {
            return Err("Track not found in playlist".to_string());
        }
        Ok(filtered)
    })
    .await?;

    log::info!("[remove_track_from_playlist] Successfully removed track {} from playlist {}", track_id, playlist_id);

    Ok(())
}

#[derive(Deserialize)]
struct CreatePlaylistApiResponse {
    id: u64,
    title: Option<String>,
    permalink_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreatedPlaylist {
    pub id: u64,
    pub title: String,
    pub permalink_url: String,
}

#[tauri::command]
#[specta::specta]
pub async fn create_playlist(title: String, sharing: String, track_id: u64, app: tauri::AppHandle) -> Result<CreatedPlaylist, String> {
    let sharing = match sharing.as_str() {
        "public" | "private" => sharing,
        _ => return Err(format!("Invalid sharing value: '{}' (expected 'public' or 'private')", sharing)),
    };

    log::info!("[create_playlist] Creating playlist '{}' with track {}", title, track_id);

    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = super::require_auth_and_cid(&app).await?;

    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!("{}/playlists?client_id={}", API_V2_BASE, client_id);

    let mut request = client.post(&url).with_oauth(Some(&token)).json(&serde_json::json!({
        "playlist": {
            "title": title,
            "sharing": sharing,
            "tracks": [track_id]
        }
    }));

    request = request.with_datadome(datadome.as_deref());

    let response = request.send().await.map_err(|e| format!("Failed to create playlist: {}", e))?;

    state.update_datadome(extract_datadome_from_response(&response));

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        log::error!("[create_playlist] POST failed: {} - {}", status, body);
        return Err(format!("Failed to create playlist: HTTP {} - {}", status, sanitize_error_body(body)));
    }

    let resp: CreatePlaylistApiResponse = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;

    let resp_title = resp.title.unwrap_or(title);
    let permalink_url = resp.permalink_url.unwrap_or_default();

    log::info!("[create_playlist] Successfully created playlist '{}' (id: {})", resp_title, resp.id);

    Ok(CreatedPlaylist { id: resp.id, title: resp_title, permalink_url })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_playlist(playlist_id: u64, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[delete_playlist] Deleting playlist {}", playlist_id);

    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = super::require_auth_and_cid(&app).await?;

    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!("{}/playlists/{}?client_id={}", API_V2_BASE, playlist_id, client_id);

    let mut request = client.delete(&url).with_oauth(Some(&token));
    request = request.with_datadome(datadome.as_deref());

    let response = request.send().await.map_err(|e| format!("Failed to delete playlist: {}", e))?;

    state.update_datadome(extract_datadome_from_response(&response));

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        log::error!("[delete_playlist] DELETE failed: {} - {}", status, body);
        return Err(format!("Failed to delete playlist: HTTP {} - {}", status, sanitize_error_body(body)));
    }

    log::info!("[delete_playlist] Successfully deleted playlist {}", playlist_id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn update_playlist(playlist_id: u64, title: String, sharing: Option<String>, track_ids: Vec<u64>, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(value) = &sharing {
        if value != "public" && value != "private" {
            return Err(format!("Invalid sharing value: '{}' (expected 'public' or 'private')", value));
        }
    }

    log::info!("[update_playlist] Updating playlist {} (title='{}', sharing={:?}, tracks={})", playlist_id, title, sharing, track_ids.len());

    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = super::require_auth_and_cid(&app).await?;

    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!("{}/playlists/{}?client_id={}", API_V2_BASE, playlist_id, client_id);

    let mut playlist = serde_json::Map::new();
    playlist.insert("title".to_string(), serde_json::json!(title));
    playlist.insert("tracks".to_string(), serde_json::json!(track_ids));
    if let Some(value) = sharing {
        playlist.insert("sharing".to_string(), serde_json::json!(value));
    }

    let mut request = client.put(&url).with_oauth(Some(&token)).json(&serde_json::json!({ "playlist": playlist }));

    request = request.with_datadome(datadome.as_deref());

    let response = request.send().await.map_err(|e| format!("Failed to update playlist: {}", e))?;

    state.update_datadome(extract_datadome_from_response(&response));

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        log::error!("[update_playlist] PUT failed: {} - {}", status, body);
        return Err(format!("Failed to update playlist: HTTP {} - {}", status, sanitize_error_body(body)));
    }

    log::info!("[update_playlist] Successfully updated playlist {}", playlist_id);
    Ok(())
}
