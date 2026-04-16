use std::path::PathBuf;

use tauri::Manager;

/// Gets the system downloads directory.
///
/// Returns the OS-specific downloads folder path.
pub fn get_downloads_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .download_dir()
        .map_err(|e| format!("Failed to get downloads directory: {}", e))
}

pub fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

pub async fn persist_json(path: &std::path::Path, json: String) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    tokio::fs::write(path, json)
        .await
        .map_err(|e| format!("Failed to persist state: {}", e))?;
    Ok(())
}
