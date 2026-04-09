use tauri::Manager;

use crate::models::artist::{ArtistProfile, SortOption};
use crate::services::artist;
use crate::services::events;
use crate::services::playlist::TrackInfo;
use crate::services::storage::AuthState;

use super::get_optional_auth_and_cid;

#[tauri::command]
#[specta::specta]
pub async fn resolve_user(
    app: tauri::AppHandle,
    permalink: String,
) -> Result<ArtistProfile, String> {
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    artist::resolve_user(&client_id, token.as_deref(), &permalink).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_profile(
    app: tauri::AppHandle,
    artist_id: u64,
) -> Result<ArtistProfile, String> {
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    artist::fetch_artist_profile(&client_id, token.as_deref(), artist_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_artist_tracks(
    app: tauri::AppHandle,
    artist_id: u64,
    sort: SortOption,
) -> Result<Vec<TrackInfo>, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;

    let on_batch = events::make_batch_emitter(&app, events::ARTIST_TRACKS_BATCH, artist_id);

    artist::fetch_all_artist_tracks(&client_id, token.as_deref(), datadome.as_deref(), artist_id, &sort, on_batch).await
}
