// src-tauri/src/commands/library.rs

use tauri::Manager;

use crate::services::client_id;
use crate::services::library::{
    fetch_all_library_pages, resolve_playlist_artwork as resolve_artwork, LibraryCache,
    LibraryError, LibraryPlaylist,
};
use crate::services::storage::AuthState;

#[tauri::command]
#[specta::specta]
pub async fn get_library_playlists(
    app: tauri::AppHandle,
) -> Result<Vec<LibraryPlaylist>, String> {
    if let Some(cached) = app.state::<LibraryCache>().get_if_complete() {
        log::info!(
            "[get_library_playlists] Returning {} cached playlists",
            cached.len()
        );
        return Ok(cached);
    }

    log::info!("[get_library_playlists] Cache miss, fetching from API");

    let token = app
        .state::<AuthState>()
        .get_token()
        .ok_or_else(|| {
            log::error!("[get_library_playlists] No auth token");
            LibraryError::AuthRequired.to_string()
        })?;

    let cid = client_id::get_client_id()
        .await
        .map_err(|e| {
            log::error!("[get_library_playlists] Failed to get client_id: {}", e);
            LibraryError::FetchFailed(e.to_string()).to_string()
        })?;

    match fetch_all_library_pages(&token, &cid).await {
        Ok(playlists) => {
            log::info!(
                "[get_library_playlists] Fetched {} playlists from API",
                playlists.len()
            );
            app.state::<LibraryCache>().set(playlists.clone());
            Ok(playlists)
        }
        Err(e) => {
            log::error!("[get_library_playlists] Error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn clear_library_cache(
    app: tauri::AppHandle,
) -> Result<(), String> {
    log::info!("[clear_library_cache] Clearing library cache");
    app.state::<LibraryCache>().clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_library_artwork(
    playlist_id: u64,
    secret_token: Option<String>,
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    if let Some(cached) = app.state::<LibraryCache>().get_artwork(playlist_id) {
        return Ok(cached);
    }

    let token = app
        .state::<AuthState>()
        .get_token()
        .ok_or_else(|| LibraryError::AuthRequired.to_string())?;

    let cid = client_id::get_client_id()
        .await
        .map_err(|e| LibraryError::FetchFailed(e.to_string()).to_string())?;

    let artwork = resolve_artwork(&token, &cid, playlist_id, secret_token)
        .await
        .map_err(|e| e.to_string())?;

    app.state::<LibraryCache>().set_artwork(playlist_id, artwork.clone());
    Ok(artwork)
}
