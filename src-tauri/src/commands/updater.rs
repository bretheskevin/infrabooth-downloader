use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

use crate::services::updater::{self, UpdateInfo};

/// Checks for available updates.
///
/// # Returns
/// * `Ok(Some(UpdateInfo))` - Update available with version, notes, and date
/// * `Ok(None)` - No update available
/// * `Err(String)` - Error message if check fails
#[tauri::command]
#[specta::specta]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    log::info!("[updater] Checking for updates...");
    match updater::check_for_update(&app).await {
        Ok(Some(info)) => {
            log::info!("[updater] Update available: v{}", info.version);
            Ok(Some(info))
        }
        Ok(None) => {
            log::info!("[updater] No update available");
            Ok(None)
        }
        Err(e) => {
            log::error!("[updater] Error checking for updates: {}", e);
            Err(e)
        }
    }
}

/// Downloads and installs an available update.
///
/// This will download the update in the background and install it.
/// On most platforms, the app will need to restart to apply the update.
///
/// # Returns
/// * `Ok(())` - Update downloaded and installed successfully
/// * `Err(String)` - Error message if installation fails
#[tauri::command]
#[specta::specta]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    log::info!("[updater] Starting update installation...");

    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            log::info!("[updater] Downloading update v{}...", update.version);

            update
                .download_and_install(
                    |downloaded, total| {
                        if let Some(total) = total {
                            let percent = (downloaded as f64 / total as f64) * 100.0;
                            log::debug!("[updater] Download progress: {:.1}%", percent);
                        }
                    },
                    || {
                        log::info!("[updater] Download complete, installing...");
                    },
                )
                .await
                .map_err(|e| {
                    log::error!("[updater] Installation failed: {}", e);
                    e.to_string()
                })?;

            log::info!("[updater] Update installed successfully");
            Ok(())
        }
        Ok(None) => {
            log::info!("[updater] No update available to install");
            Err("No update available".to_string())
        }
        Err(e) => {
            log::error!("[updater] Error checking for update: {}", e);
            Err(e.to_string())
        }
    }
}
