use crate::models::error::ErrorResponse;
use crate::services::history_store::{self, DownloadHistoryEntry};
use crate::services::paths::get_app_data_dir;

#[tauri::command]
#[specta::specta]
pub async fn list_download_history(app: tauri::AppHandle) -> Result<Vec<DownloadHistoryEntry>, ErrorResponse> {
    let app_data_dir = get_app_data_dir(&app).map_err(|e| ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e })?;
    Ok(history_store::load_history(&app_data_dir))
}

#[tauri::command]
#[specta::specta]
pub async fn append_download_history_entry(app: tauri::AppHandle, entry: DownloadHistoryEntry) -> Result<(), ErrorResponse> {
    let app_data_dir = get_app_data_dir(&app).map_err(|e| ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e })?;
    history_store::append_entry(&app_data_dir, entry).map_err(|e| ErrorResponse { code: "HISTORY_WRITE_ERROR".to_string(), message: e })
}

#[tauri::command]
#[specta::specta]
pub async fn remove_download_history_entry(app: tauri::AppHandle, id: String) -> Result<(), ErrorResponse> {
    let app_data_dir = get_app_data_dir(&app).map_err(|e| ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e })?;
    history_store::remove_entry(&app_data_dir, &id).map_err(|e| ErrorResponse { code: "HISTORY_WRITE_ERROR".to_string(), message: e })
}

#[tauri::command]
#[specta::specta]
pub async fn clear_download_history(app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    let app_data_dir = get_app_data_dir(&app).map_err(|e| ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e })?;
    history_store::clear_history(&app_data_dir).map_err(|e| ErrorResponse { code: "HISTORY_WRITE_ERROR".to_string(), message: e })
}
