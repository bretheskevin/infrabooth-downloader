use crate::models::artist::{ArtistProfile, ArtistTracksResponse};
use crate::services::artist;
use crate::services::storage::AuthState;
use tauri::Manager;

use super::require_auth_and_cid;

#[tauri::command]
#[specta::specta]
pub async fn resolve_user(
    app: tauri::AppHandle,
    permalink: String,
) -> Result<ArtistProfile, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;

    artist::resolve_user(&client_id, &token, &permalink).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_profile(
    app: tauri::AppHandle,
    artist_id: u64,
) -> Result<ArtistProfile, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;

    artist::fetch_artist_profile(&client_id, &token, artist_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_tracks(
    app: tauri::AppHandle,
    artist_id: u64,
    limit: u64,
    offset: u64,
) -> Result<ArtistTracksResponse, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    artist::fetch_artist_tracks(&client_id, &token, datadome.as_deref(), artist_id, limit, offset).await
}
