mod commands;
mod models;
mod services;

use commands::{check_auth_state, complete_oauth, download_track_full, get_playlist_info, get_track_info, sign_out, start_oauth, test_ffmpeg, test_ytdlp, validate_soundcloud_url, OAuthState};
use services::deep_link::handle_deep_link;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .manage(OAuthState::default())
        .invoke_handler(tauri::generate_handler![start_oauth, complete_oauth, check_auth_state, sign_out, validate_soundcloud_url, get_playlist_info, get_track_info, test_ytdlp, test_ffmpeg, download_track_full])
        .setup(|app| {
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
