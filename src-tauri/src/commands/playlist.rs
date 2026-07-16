use serde::{Deserialize, Serialize};
use specta::Type;

use crate::models::url::ValidationResult;
use crate::models::PlaylistTracksResponse;
use crate::services::http::{extract_datadome_from_response, sanitize_error_body, RequestBuilderExt, API_V2_BASE};
use crate::services::library::LibraryCache;
use crate::services::playlist::build_playlist_url;
use crate::services::playlist::{fetch_playlist_info, fetch_track_info, PlaylistInfo, TrackInfo};
use crate::services::storage::AuthState;
use crate::services::url_validator::validate_url;
use crate::services::webview_send;
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

#[derive(Clone, Copy)]
enum HttpMethod {
    Post,
    Put,
    Delete,
}

impl HttpMethod {
    fn as_str(self) -> &'static str {
        match self {
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
            HttpMethod::Delete => "DELETE",
        }
    }
}

/// Send a playlist write request (POST / PUT / DELETE) with DataDome support.
/// On a DataDome block, the request is replayed through the in-app WebView.
async fn send_playlist_write(
    app: &tauri::AppHandle, token: &str, method: HttpMethod, url: String, body: Option<serde_json::Value>, operation: &str,
) -> Result<Option<String>, String> {
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let body_str = body.as_ref().map(|v| v.to_string());

    let client = &*crate::services::http::HTTP_CLIENT;
    let mut request = match method {
        HttpMethod::Post => client.post(&url),
        HttpMethod::Put => client.put(&url),
        HttpMethod::Delete => client.delete(&url),
    }
    .with_oauth(Some(token))
    .with_datadome(datadome.as_deref());

    if let Some(ref bs) = body_str {
        request = request.header("Content-Type", "application/json").body(bs.clone());
    }

    let response = request.send().await.map_err(|e| format!("Failed to {}: {}", operation, e))?;

    state.update_datadome(extract_datadome_from_response(&response));

    let status = response.status();
    if status.is_success() {
        return Ok(Some(response.text().await.unwrap_or_default()));
    }

    let resp_body = response.text().await.unwrap_or_default();
    log::error!("[{}] {} failed: {} - {}", operation, method.as_str(), status, resp_body);
    let sanitized = sanitize_error_body(resp_body);

    if !webview_send::is_antibot(&sanitized) {
        return Err(format!("Failed to {}: HTTP {} - {}", operation, status, sanitized));
    }

    let req = match body_str {
        Some(bs) => webview_send::WebviewRequest { method: method.as_str(), url, content_type: Some("application/json"), body: Some(bs) },
        None => webview_send::WebviewRequest::bare(method.as_str(), url),
    };

    webview_send::send_via_webview(app, token, operation, req).await
}

async fn modify_playlist_tracks<F>(playlist_id: u64, app: &tauri::AppHandle, operation: &str, modifier: F) -> Result<(), String>
where
    F: FnOnce(Vec<u64>) -> Result<Vec<u64>, String>,
{
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

    send_playlist_write(app, &token, HttpMethod::Put, put_url, Some(serde_json::json!({"playlist": {"tracks": new_track_ids.clone()}})), operation).await?;

    app.state::<LibraryCache>().set_track_ids(playlist_id, new_track_ids.into_iter().collect());

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn add_track_to_playlist(playlist_id: u64, track_id: u64, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[add_track_to_playlist] Adding track {} to playlist {}", track_id, playlist_id);

    modify_playlist_tracks(playlist_id, &app, "add-track-to-playlist", |mut ids| {
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

    modify_playlist_tracks(playlist_id, &app, "remove-track-from-playlist", |ids| {
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

    let (token, client_id) = super::require_auth_and_cid(&app).await?;
    let url = format!("{}/playlists?client_id={}", API_V2_BASE, client_id);

    let raw = send_playlist_write(
        &app,
        &token,
        HttpMethod::Post,
        url,
        Some(serde_json::json!({"playlist": {"title": title, "sharing": sharing, "tracks": [track_id]}})),
        "create-playlist",
    )
    .await?;
    let body = raw.filter(|b| !b.is_empty()).ok_or_else(|| "Playlist created but the response was unreadable; refresh to see it".to_string())?;

    let resp: CreatePlaylistApiResponse = serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    let resp_title = resp.title.unwrap_or(title);
    let permalink_url = resp.permalink_url.unwrap_or_default();

    log::info!("[create_playlist] Successfully created playlist '{}' (id: {})", resp_title, resp.id);

    Ok(CreatedPlaylist { id: resp.id, title: resp_title, permalink_url })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_playlist(playlist_id: u64, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[delete_playlist] Deleting playlist {}", playlist_id);

    let (token, client_id) = super::require_auth_and_cid(&app).await?;
    let url = format!("{}/playlists/{}?client_id={}", API_V2_BASE, playlist_id, client_id);

    send_playlist_write(&app, &token, HttpMethod::Delete, url, None, "delete-playlist").await?;

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

    let (token, client_id) = super::require_auth_and_cid(&app).await?;
    let url = format!("{}/playlists/{}?client_id={}", API_V2_BASE, playlist_id, client_id);

    let mut playlist = serde_json::Map::new();
    playlist.insert("title".to_string(), serde_json::json!(title));
    playlist.insert("tracks".to_string(), serde_json::json!(track_ids));
    if let Some(value) = sharing {
        playlist.insert("sharing".to_string(), serde_json::json!(value));
    }

    send_playlist_write(&app, &token, HttpMethod::Put, url, Some(serde_json::json!({ "playlist": playlist })), "update-playlist").await?;

    log::info!("[update_playlist] Successfully updated playlist {}", playlist_id);
    Ok(())
}
