// src-tauri/src/commands/library.rs

use tauri::Manager;

use crate::services::events;
use crate::services::liked_tracks::{fetch_all_liked_tracks, LikedTracksCache};

use crate::services::library::{
    fetch_all_library_pages, fetch_owned_playlists_for_track, resolve_playlist_artwork as resolve_artwork, LibraryCache, LibraryPlaylist,
    PlaylistForTrackPicker,
};
use crate::services::playlist;
use crate::services::playlist::TrackInfo;

#[tauri::command]
#[specta::specta]
pub async fn get_library_playlists(app: tauri::AppHandle) -> Result<Vec<LibraryPlaylist>, String> {
    let cache = app.state::<LibraryCache>();

    if let Some(cached) = cache.get_if_complete_enriched() {
        log::info!("[get_library_playlists] Returning {} cached playlists", cached.len());
        return Ok(cached);
    }

    log::info!("[get_library_playlists] Cache miss, fetching from API");

    let (token, cid) = super::require_auth_and_cid(&app).await?;

    let emitter = |batch: &[LibraryPlaylist]| {
        events::emit_library_playlists_batch(&app, batch);
    };

    match fetch_all_library_pages(&token, &cid, emitter).await {
        Ok(playlists) => {
            log::info!("[get_library_playlists] Fetched {} playlists from API", playlists.len());
            Ok(cache.set_and_enrich(playlists))
        }
        Err(e) => {
            log::error!("[get_library_playlists] Error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn clear_library_cache(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[clear_library_cache] Clearing library cache");
    app.state::<LibraryCache>().clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_library_artwork(playlist_id: u64, secret_token: Option<String>, app: tauri::AppHandle) -> Result<Option<String>, String> {
    if let Some(cached) = app.state::<LibraryCache>().get_artwork(playlist_id) {
        return Ok(cached);
    }

    let (token, cid) = super::require_auth_and_cid(&app).await?;

    let artwork = resolve_artwork(&token, &cid, playlist_id, secret_token).await.map_err(|e| e.to_string())?;

    app.state::<LibraryCache>().set_artwork(playlist_id, artwork.clone());
    Ok(artwork)
}

#[tauri::command]
#[specta::specta]
pub async fn get_owned_playlists_for_track(track_id: u64, app: tauri::AppHandle) -> Result<Vec<PlaylistForTrackPicker>, String> {
    let (token, cid) = super::require_auth_and_cid(&app).await?;
    let cache = app.state::<LibraryCache>();

    let playlists = if let Some(cached) = cache.get_if_complete() {
        cached
    } else {
        let fetched = fetch_all_library_pages(&token, &cid, |_| {}).await.map_err(|e| e.to_string())?;
        cache.set(fetched.clone());
        fetched
    };

    fetch_owned_playlists_for_track(&token, &cid, track_id, &playlists, &cache).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_playlist_tracks(playlist_id: u64, secret_token: Option<String>, app: tauri::AppHandle) -> Result<Vec<TrackInfo>, String> {
    let (token, _cid) = super::get_optional_auth_and_cid(&app).await?;

    let resolved_secret = secret_token.or_else(|| app.state::<LibraryCache>().get_secret_token(playlist_id));

    let on_batch = events::make_batch_emitter(&app, events::PLAYLIST_TRACKS_BATCH, playlist_id);

    playlist::fetch_playlist_by_id(playlist_id, resolved_secret.as_deref(), token.as_deref(), on_batch).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_liked_tracks(app: tauri::AppHandle) -> Result<Vec<TrackInfo>, String> {
    let cache = app.state::<LikedTracksCache>();

    if let Some(cached) = cache.get_if_complete() {
        log::info!("[get_liked_tracks] Returning {} cached tracks", cached.len());
        return Ok(cached);
    }

    log::info!("[get_liked_tracks] Cache miss, fetching from API");

    let (token, cid) = super::require_auth_and_cid(&app).await?;
    let user_id = super::require_user_id(&app)?;

    let emitter = events::make_batch_emitter(&app, events::LIKED_TRACKS_BATCH, user_id);

    match fetch_all_liked_tracks(&token, &cid, user_id, emitter).await {
        Ok(tracks) => {
            log::info!("[get_liked_tracks] Fetched {} tracks from API", tracks.len());
            cache.set(tracks.clone());
            Ok(tracks)
        }
        Err(e) => {
            log::error!("[get_liked_tracks] Error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn clear_liked_tracks_cache(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[clear_liked_tracks_cache] Clearing liked tracks cache");
    app.state::<LikedTracksCache>().clear();
    Ok(())
}
