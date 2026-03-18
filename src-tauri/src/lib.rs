mod commands;
mod models;
mod services;

use std::sync::Arc;

use commands::{
    cancel_download_queue, check_auth, check_for_updates, check_write_permission,
    clear_library_cache, download_track_full, get_default_download_path,
    get_library_playlist_tracks, get_library_playlists, get_playlist_info, get_track_info,
    install_update, refresh_auth, resolve_library_artwork, resolve_playback_url,
    respond_to_auth_choice, respond_to_rate_limit_choice, scan_existing_tracks, search_tracks,
    sign_out, start_download_queue, test_ffmpeg, validate_download_path, validate_soundcloud_url,
};
use services::auth_choice::AuthChoiceState;
use services::rate_limit_choice::RateLimitChoiceState;
use services::cancellation::CancellationState;
use services::library::LibraryCache;
use services::storage::AuthState;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use services::events;
use tauri::Emitter;

#[cfg(debug_assertions)]
use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, Builder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        check_auth,
        refresh_auth,
        sign_out,
        validate_soundcloud_url,
        get_playlist_info,
        get_track_info,
        test_ffmpeg,
        download_track_full,
        start_download_queue,
        cancel_download_queue,
        respond_to_auth_choice,
        respond_to_rate_limit_choice,
        check_write_permission,
        get_default_download_path,
        validate_download_path,
        check_for_updates,
        install_update,
        get_library_playlists,
        resolve_library_artwork,
        clear_library_cache,
        get_library_playlist_tracks,
        scan_existing_tracks,
        search_tracks,
        resolve_playback_url
    ]);

    // Export TypeScript bindings in debug mode
    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default()
                .bigint(BigIntExportBehavior::Number)
                .header("// @ts-nocheck"),
            "../src/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AuthState::default())
        .manage(LibraryCache::default())
        .manage(CancellationState::default())
        .manage(Arc::new(AuthChoiceState::default()))
        .manage(Arc::new(RateLimitChoiceState::default()))
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);

            // Create settings menu item with Cmd+, shortcut
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;

            // Create minimal app menu (required for macOS keyboard shortcuts)
            let app_menu = Submenu::with_items(
                app,
                "InfraBooth Downloader",
                true,
                &[
                    &PredefinedMenuItem::about(app, Some("About InfraBooth Downloader"), None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &settings_item,
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

            // Handle custom menu events
            app.on_menu_event(move |app_handle, event| {
                if event.id() == settings_item.id() {
                    let _ = app_handle.emit(events::OPEN_SETTINGS, ());
                }
            });

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .max_file_size(1_000_000) // 1 MB per file
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                    .build(),
            )?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
