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
