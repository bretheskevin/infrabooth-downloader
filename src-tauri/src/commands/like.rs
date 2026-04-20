use tauri::Manager;

use crate::services::like;
use crate::services::liked_tracks::LikedTracksCache;
use crate::services::storage::AuthState;

use super::{require_auth_and_cid, require_user_id};

#[tauri::command]
#[specta::specta]
pub async fn like_track(app: tauri::AppHandle, track_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    like::like_track(&token, &client_id, datadome.as_deref(), current_user_id, track_id)
        .await
        .map_err(|e| e.to_string())?;

    app.state::<LikedTracksCache>().clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unlike_track(app: tauri::AppHandle, track_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    like::unlike_track(&token, &client_id, datadome.as_deref(), current_user_id, track_id)
        .await
        .map_err(|e| e.to_string())?;

    app.state::<LikedTracksCache>().clear();
    Ok(())
}
