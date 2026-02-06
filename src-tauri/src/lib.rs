mod commands;
mod models;
mod services;

use commands::{complete_oauth, start_oauth, OAuthState};
use services::deep_link::handle_deep_link;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file if present
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .manage(OAuthState::default())
        .invoke_handler(tauri::generate_handler![start_oauth, complete_oauth])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register deep link handler using the plugin's extension trait
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls: Vec<String> = event.urls().iter().map(|u| u.to_string()).collect();
                handle_deep_link(&handle, urls);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
