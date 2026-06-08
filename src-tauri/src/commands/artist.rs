use tauri::Manager;

use crate::models::artist::{ArtistPlaylist, ArtistProfile, ResolvedLink, SortOption};
use crate::services::artist;
use crate::services::artist_playlists;
use crate::services::events;
use crate::services::playlist::TrackInfo;
use crate::services::storage::AuthState;

use super::get_optional_auth_and_cid;

#[tauri::command]
#[specta::specta]
pub async fn resolve_user(app: tauri::AppHandle, permalink: String) -> Result<ArtistProfile, String> {
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    artist::resolve_user(&client_id, token.as_deref(), &permalink).await
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_soundcloud_link(app: tauri::AppHandle, url: String) -> Result<ResolvedLink, String> {
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    artist::resolve_soundcloud_link(&client_id, token.as_deref(), &url).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_profile(app: tauri::AppHandle, artist_id: u64) -> Result<ArtistProfile, String> {
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    artist::fetch_artist_profile(&client_id, token.as_deref(), artist_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_artist_tracks(app: tauri::AppHandle, artist_id: u64, sort: SortOption) -> Result<Vec<TrackInfo>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    let on_batch = events::make_batch_emitter(&app, events::ARTIST_TRACKS_BATCH, artist_id);

    artist::fetch_all_artist_tracks(&client_id, token.as_deref(), datadome.as_deref(), artist_id, &sort, on_batch).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_liked_tracks(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<TrackInfo>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    let on_batch = events::make_batch_emitter(&app, events::ARTIST_LIKED_TRACKS_BATCH, artist_id);

    artist::fetch_all_artist_likes(&client_id, token.as_deref(), datadome.as_deref(), artist_id, on_batch).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_followers(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<ArtistProfile>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    let on_batch = events::make_profile_batch_emitter(&app, events::ARTIST_FOLLOWERS_BATCH, artist_id);

    artist::fetch_all_artist_follow_list(&client_id, token.as_deref(), datadome.as_deref(), artist_id, "followers", on_batch).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_followings(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<ArtistProfile>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    let on_batch = events::make_profile_batch_emitter(&app, events::ARTIST_FOLLOWINGS_BATCH, artist_id);

    artist::fetch_all_artist_follow_list(&client_id, token.as_deref(), datadome.as_deref(), artist_id, "followings", on_batch).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_playlists(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<ArtistPlaylist>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;
    let on_batch = events::make_playlist_batch_emitter(&app, artist_id);

    artist_playlists::fetch_artist_playlists(&client_id, token.as_deref(), datadome.as_deref(), artist_id, on_batch).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_albums(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<ArtistPlaylist>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;
    let on_batch = events::make_album_batch_emitter(&app, artist_id);

    artist_playlists::fetch_artist_albums(&client_id, token.as_deref(), datadome.as_deref(), artist_id, on_batch).await
}
