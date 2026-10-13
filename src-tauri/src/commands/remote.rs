use tauri::Manager;

use crate::models::error::ErrorResponse;
use crate::services::raycast::LocalApiState;
use crate::services::remote::{self, RemoteServerInfo};

fn remote_error(message: String) -> ErrorResponse {
    ErrorResponse { code: "REMOTE_ERROR".to_string(), message }
}

#[tauri::command]
#[specta::specta]
pub async fn start_remote_server(app: tauri::AppHandle) -> Result<RemoteServerInfo, ErrorResponse> {
    remote::start_server(app).await.map_err(remote_error)
}

#[tauri::command]
#[specta::specta]
pub async fn reset_remote_link(app: tauri::AppHandle) -> Result<Option<RemoteServerInfo>, ErrorResponse> {
    remote::reset_link(app).await.map_err(remote_error)
}

#[tauri::command]
#[specta::specta]
pub async fn stop_remote_server(app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    remote::stop_server(&app).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn push_remote_state(state_json: String, app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    remote::broadcast_state(&app, state_json);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn is_local_api_active(app: tauri::AppHandle) -> bool {
    let active = app.state::<LocalApiState>().is_active();
    log::debug!("[remote] is_local_api_active -> {active}");
    active
}
