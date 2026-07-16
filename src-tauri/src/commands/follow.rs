use tauri::Manager;

use crate::services::follow;
use crate::services::storage::AuthState;
use crate::services::webview_send;

use super::{require_auth_and_cid, require_user_id};

#[tauri::command]
#[specta::specta]
pub async fn follow_user(app: tauri::AppHandle, user_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) = follow::follow_user(&token, &client_id, datadome.as_deref(), current_user_id, user_id).await;
    state.update_datadome(new_datadome);
    webview_send::retry_if_antibot(&app, &token, "follow-user", result, || follow::follow_webview_request(current_user_id, user_id, &client_id, true)).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unfollow_user(app: tauri::AppHandle, user_id: u64) -> Result<(), String> {
    let current_user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) = follow::unfollow_user(&token, &client_id, datadome.as_deref(), current_user_id, user_id).await;
    state.update_datadome(new_datadome);
    webview_send::retry_if_antibot(&app, &token, "unfollow-user", result, || follow::follow_webview_request(current_user_id, user_id, &client_id, false))
        .await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn check_follow_status(app: tauri::AppHandle, user_id: u64) -> Result<bool, String> {
    let current_user_id = require_user_id(&app)?;
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    follow::check_follow_status(&token, &client_id, datadome.as_deref(), current_user_id, user_id).await.map_err(|e| e.to_string())
}
