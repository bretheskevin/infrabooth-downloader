use tauri::Manager;

use crate::services::follow;
use crate::services::storage::AuthState;

use super::require_auth_and_cid;

#[tauri::command]
#[specta::specta]
pub async fn follow_user(
    app: tauri::AppHandle,
    user_id: u64,
) -> Result<(), String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    follow::follow_user(&token, &client_id, datadome.as_deref(), user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn unfollow_user(
    app: tauri::AppHandle,
    user_id: u64,
) -> Result<(), String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    follow::unfollow_user(&token, &client_id, datadome.as_deref(), user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_follow_status(
    app: tauri::AppHandle,
    user_id: u64,
) -> Result<bool, String> {
    let datadome = app.state::<AuthState>().get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    follow::check_follow_status(&token, &client_id, datadome.as_deref(), user_id)
        .await
        .map_err(|e| e.to_string())
}
