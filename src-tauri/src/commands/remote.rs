use crate::models::error::ErrorResponse;
use crate::services::remote::{self, RemoteServerInfo};

#[tauri::command]
#[specta::specta]
pub async fn start_remote_server(app: tauri::AppHandle) -> Result<RemoteServerInfo, ErrorResponse> {
    remote::start_server(app).await.map_err(|e| ErrorResponse { code: "REMOTE_ERROR".to_string(), message: e })
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
    remote::broadcast_state(&app, state_json).await;
    Ok(())
}
