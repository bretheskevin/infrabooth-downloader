mod commands;
mod models;
mod services;

use std::sync::Arc;

use commands::{
    add_track_to_playlist, cancel_download_queue, check_auth, check_firefox_installed, check_follow_status, check_for_updates,
    check_write_permission, clear_library_cache, delete_rekordbox_playlist, detect_rekordbox, download_track_full, export_to_rekordbox,
    fetch_related_tracks, follow_user, get_all_artist_tracks, get_app_data_path, get_artist_activity, get_artist_playlist_tracks,
    get_artist_playlists, get_artist_profile, get_artist_releases, get_conversation_messages, get_conversations_page,
    get_default_download_path, get_default_rekordbox_data_directory_parent, get_feature_flags, get_followed_artists,
    get_library_playlist_tracks, get_library_playlists, get_log_path, get_notifications_page, get_owned_playlists_for_track,
    get_playlist_info, get_release_tracks, get_selections, get_track_info, get_unread_conversations_flag, get_unread_count, install_update,
    list_rekordbox_backups, list_rekordbox_playlists, mark_artist_releases_seen, mark_artist_seen, mark_notifications_seen,
    open_in_firefox, refresh_auth, remove_track_from_playlist, resolve_library_artwork, resolve_message_embed, resolve_playback_url,
    resolve_soundcloud_link, resolve_user, respond_to_rate_limit_choice, restore_rekordbox_backup, scan_existing_tracks, search_tracks,
    search_users, send_message, sign_out, start_download_queue, test_ffmpeg, unfollow_user, validate_download_path,
    validate_soundcloud_url,
};
use services::cancellation::CancellationState;
use services::events;
use services::library::LibraryCache;
use services::messages::MessagesCache;
use services::new_tracks::{NewTracksCache, SeenArtistsState};
use services::notifications::{LastSeenActivityState, NotificationsCache};
use services::rate_limit_choice::RateLimitChoiceState;
use services::selections::SelectionCache;
use services::storage::AuthState;
#[cfg(target_os = "macos")]
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
#[cfg(target_os = "macos")]
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

use services::downloader::DownloadProgressEvent;
use services::events::TracksBatchEvent;
use services::queue::{QueueCancelledEvent, QueueCompleteEvent, QueueProgressEvent};
#[cfg(debug_assertions)]
use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, collect_events, Builder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .events(collect_events![
            DownloadProgressEvent,
            QueueProgressEvent,
            QueueCompleteEvent,
            QueueCancelledEvent,
            TracksBatchEvent
        ])
        .commands(collect_commands![
            check_auth,
            refresh_auth,
            sign_out,
            validate_soundcloud_url,
            add_track_to_playlist,
            remove_track_from_playlist,
            get_playlist_info,
            get_track_info,
            test_ffmpeg,
            download_track_full,
            start_download_queue,
            cancel_download_queue,
            respond_to_rate_limit_choice,
            check_write_permission,
            get_app_data_path,
            get_default_download_path,
            get_log_path,
            get_feature_flags,
            validate_download_path,
            check_for_updates,
            install_update,
            get_library_playlists,
            resolve_library_artwork,
            clear_library_cache,
            get_library_playlist_tracks,
            get_owned_playlists_for_track,
            scan_existing_tracks,
            search_tracks,
            search_users,
            resolve_playback_url,
            get_selections,
            get_followed_artists,
            get_artist_activity,
            get_artist_releases,
            get_release_tracks,
            mark_artist_seen,
            mark_artist_releases_seen,
            fetch_related_tracks,
            get_artist_profile,
            get_all_artist_tracks,
            resolve_user,
            resolve_soundcloud_link,
            get_artist_playlists,
            get_artist_playlist_tracks,
            follow_user,
            unfollow_user,
            check_follow_status,
            check_firefox_installed,
            open_in_firefox,
            detect_rekordbox,
            get_default_rekordbox_data_directory_parent,
            export_to_rekordbox,
            list_rekordbox_playlists,
            delete_rekordbox_playlist,
            list_rekordbox_backups,
            restore_rekordbox_backup,
            get_unread_count,
            get_notifications_page,
            mark_notifications_seen,
            get_conversations_page,
            get_conversation_messages,
            get_unread_conversations_flag,
            resolve_message_embed,
            send_message,
        ]);

    // Export TypeScript bindings in debug mode
    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default().bigint(BigIntExportBehavior::Number).header("// @ts-nocheck"),
            "../src/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .manage(AuthState::default())
        .manage(LibraryCache::default())
        .manage(SelectionCache::default())
        .manage(NewTracksCache::default())
        .manage(NotificationsCache::default())
        .manage(MessagesCache::default())
        .manage(CancellationState::default())
        .manage(Arc::new(RateLimitChoiceState::default()))
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);

            let seen_path = commands::new_tracks::seen_state_path(app.handle());
            app.manage(SeenArtistsState::load(&seen_path));

            let activities_path = commands::notifications::last_seen_activities_path(app.handle());
            app.manage(LastSeenActivityState::load(&activities_path));

            #[cfg(target_os = "macos")]
            {
                let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;

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

                app.on_menu_event(move |app_handle, event| {
                    if event.id() == settings_item.id() {
                        let _ = app_handle.emit(events::OPEN_SETTINGS, ());
                    }
                });
            }

            let log_level = if cfg!(debug_assertions) {
                log::LevelFilter::Debug
            } else {
                log::LevelFilter::Info
            };

            let log_dir = app.path().app_data_dir().expect("failed to resolve app data dir").join("logs");
            std::fs::create_dir_all(&log_dir).ok();

            app.handle().plugin(
                tauri_plugin_log::Builder::new()
                    .targets([
                        Target::new(TargetKind::Stdout),
                        Target::new(TargetKind::Webview),
                        Target::new(TargetKind::Folder { path: log_dir, file_name: Some("infrabooth".into()) }),
                    ])
                    .level(log_level)
                    .filter(|metadata| {
                        // Filter out noisy rookie debug logs
                        !(metadata.target().starts_with("rookie") && metadata.level() > log::LevelFilter::Info)
                    })
                    .max_file_size(10_000_000) // 10 MB per file
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                    .format(|out, message, record| {
                        let now = time::OffsetDateTime::now_local().unwrap_or_else(|_| time::OffsetDateTime::now_utc());
                        let target = record.target();
                        let clean_target = if target.contains("node_modules") { "webview" } else { target };
                        out.finish(format_args!(
                            "[{:04}-{:02}-{:02} {:02}:{:02}][{}][{}] {}",
                            now.year(),
                            now.month() as u8,
                            now.day(),
                            now.hour(),
                            now.minute(),
                            record.level(),
                            clean_target,
                            message
                        ))
                    })
                    .build(),
            )?;

            if let Ok(log_dir) = app.path().app_log_dir() {
                log::info!("Log directory: {}", log_dir.display());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
