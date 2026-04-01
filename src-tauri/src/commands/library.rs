// src-tauri/src/commands/library.rs

use tauri::Manager;

use crate::services::events;

use crate::services::library::{
    fetch_all_library_pages, fetch_owned_playlists_for_track, resolve_playlist_artwork as resolve_artwork,
    LibraryCache, LibraryPlaylist, PlaylistForTrackPicker,
};
use crate::services::playlist;
use crate::services::playlist::TrackInfo;

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

    let (token, cid) = super::require_auth_and_cid(&app).await?;

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

    let (token, cid) = super::require_auth_and_cid(&app).await?;

    let artwork = resolve_artwork(&token, &cid, playlist_id, secret_token)
        .await
        .map_err(|e| e.to_string())?;

    app.state::<LibraryCache>().set_artwork(playlist_id, artwork.clone());
    Ok(artwork)
}

#[tauri::command]
#[specta::specta]
pub async fn get_owned_playlists_for_track(
    track_id: u64,
    app: tauri::AppHandle,
) -> Result<Vec<PlaylistForTrackPicker>, String> {
    let (token, cid) = super::require_auth_and_cid(&app).await?;

    let playlists = if let Some(cached) = app.state::<LibraryCache>().get_if_complete() {
        cached
    } else {
        let fetched = fetch_all_library_pages(&token, &cid)
            .await
            .map_err(|e| e.to_string())?;
        app.state::<LibraryCache>().set(fetched.clone());
        fetched
    };

    let cache = app.state::<LibraryCache>();
    fetch_owned_playlists_for_track(&token, &cid, track_id, &playlists, &cache)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_library_playlist_tracks(
    playlist_id: u64,
    app: tauri::AppHandle,
) -> Result<Vec<TrackInfo>, String> {
    let (token, _cid) = super::require_auth_and_cid(&app).await?;

    let secret_token = app
        .state::<LibraryCache>()
        .get_secret_token(playlist_id);

    let on_batch = events::make_batch_emitter(&app, events::PLAYLIST_TRACKS_BATCH, playlist_id);

    match playlist::fetch_playlist_by_id(
        playlist_id,
        secret_token.as_deref(),
        Some(&token),
        on_batch,
    )
    .await
    {
        Ok(tracks) => {
            log::info!(
                "[get_library_playlist_tracks] Returning {} tracks for playlist {}",
                tracks.len(),
                playlist_id
            );
            Ok(tracks)
        }
        Err(e) => {
            log::error!("[get_library_playlist_tracks] Error: {}", e);
            Err(e.to_string())
        }
    }
}
