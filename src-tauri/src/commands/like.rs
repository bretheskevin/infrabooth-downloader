use tauri::Manager;

use crate::services::library::LibraryCache;
use crate::services::like;
use crate::services::liked_tracks::LikedTracksCache;
use crate::services::storage::AuthState;
use crate::services::webview_send;

use super::{require_auth_and_cid, require_user_id};

#[tauri::command]
#[specta::specta]
pub async fn like_track(app: tauri::AppHandle, track_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) = like::like_track(&token, &client_id, datadome.as_deref(), current_user_id, track_id).await;
    state.update_datadome(new_datadome);
    webview_send::retry_if_antibot(&app, &token, "like-track", result, || like::track_like_webview_request(current_user_id, track_id, &client_id, true))
        .await?;

    app.state::<LikedTracksCache>().clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unlike_track(app: tauri::AppHandle, track_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) = like::unlike_track(&token, &client_id, datadome.as_deref(), current_user_id, track_id).await;
    state.update_datadome(new_datadome);
    webview_send::retry_if_antibot(&app, &token, "unlike-track", result, || like::track_like_webview_request(current_user_id, track_id, &client_id, false))
        .await?;

    app.state::<LikedTracksCache>().clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn like_playlist(app: tauri::AppHandle, playlist_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) = like::like_playlist(&token, &client_id, datadome.as_deref(), current_user_id, playlist_id).await;
    state.update_datadome(new_datadome);
    webview_send::retry_if_antibot(&app, &token, "like-playlist", result, || {
        like::playlist_like_webview_request(current_user_id, playlist_id, &client_id, true)
    })
    .await?;

    app.state::<LibraryCache>().clear();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unlike_playlist(app: tauri::AppHandle, playlist_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) = like::unlike_playlist(&token, &client_id, datadome.as_deref(), current_user_id, playlist_id).await;
    state.update_datadome(new_datadome);
    webview_send::retry_if_antibot(&app, &token, "unlike-playlist", result, || {
        like::playlist_like_webview_request(current_user_id, playlist_id, &client_id, false)
    })
    .await?;

    app.state::<LibraryCache>().clear();
    Ok(())
}
