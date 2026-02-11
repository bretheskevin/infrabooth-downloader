mod commands;
mod models;
mod services;

use commands::{check_auth_state, check_write_permission, complete_oauth, download_track_full, get_default_download_path, get_playlist_info, get_track_info, sign_out, start_download_queue, start_oauth, test_ffmpeg, test_ytdlp, validate_download_path, validate_soundcloud_url, OAuthState};
use services::deep_link::handle_deep_link;
use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(OAuthState::default())
        .invoke_handler(tauri::generate_handler![start_oauth, complete_oauth, check_auth_state, sign_out, validate_soundcloud_url, get_playlist_info, get_track_info, test_ytdlp, test_ffmpeg, download_track_full, start_download_queue, check_write_permission, get_default_download_path, validate_download_path])
        .setup(|app| {
            // Create minimal app menu (required for macOS keyboard shortcuts)
            let app_menu = Submenu::with_items(
                app,
                "InfraBooth Downloader",
                true,
                &[
                    &PredefinedMenuItem::about(app, Some("About InfraBooth Downloader"), None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, Some("Hide"))?,
                    &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
                    &PredefinedMenuItem::show_all(app, Some("Show All"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some("Quit"))?,
                ],
            )?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, Some("Undo"))?,
                    &PredefinedMenuItem::redo(app, Some("Redo"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some("Cut"))?,
                    &PredefinedMenuItem::copy(app, Some("Copy"))?,
                    &PredefinedMenuItem::paste(app, Some("Paste"))?,
                    &PredefinedMenuItem::select_all(app, Some("Select All"))?,
                ],
            )?;

            let menu = Menu::with_items(app, &[&app_menu, &edit_menu])?;
            app.set_menu(menu)?;
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .max_file_size(1_000_000) // 1 MB per file
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                    .build(),
            )?;

            // Register deep link handler using the plugin's extension trait
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls: Vec<String> = event.urls().iter().map(|u| u.to_string()).collect();
                log::info!("[deep-link] on_open_url triggered with {} URLs: {:?}", urls.len(), urls);
                handle_deep_link(&handle, urls);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
