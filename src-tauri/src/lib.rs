mod commands;
mod models;
mod services;

use std::sync::Arc;
use std::sync::Once;

use commands::{
    add_track_to_playlist, cancel_download_queue, check_auth, check_firefox_installed, check_follow_status, check_for_updates,
    check_write_permission, clear_library_cache, clear_liked_tracks_cache, delete_rekordbox_playlist, detect_rekordbox,
    download_track_full, export_playlist_to_rekordbox, export_to_rekordbox, fetch_related_tracks, follow_user, get_all_artist_tracks,
    get_app_data_path, get_artist_activity, get_artist_liked_tracks, get_artist_playlist_tracks, get_artist_playlists, get_artist_profile,
    get_artist_releases, get_conversation_messages, get_conversations_page, get_default_download_path,
    get_default_rekordbox_data_directory_parent, get_feature_flags, get_followed_artists, get_library_playlist_tracks,
    get_library_playlists, get_liked_tracks, get_log_path, get_notifications_page, get_owned_playlists_for_track, get_playlist_info,
    get_release_tracks, get_selections, get_track_info, get_unread_conversations_flag, get_unread_count, install_update, like_track,
    list_rekordbox_backups, list_rekordbox_playlists, mark_artist_releases_seen, mark_artist_seen, mark_notifications_seen,
    open_in_firefox, quit_rekordbox, refresh_auth, remove_track_from_playlist, resolve_library_artwork, resolve_message_embed,
    resolve_playback_url, resolve_soundcloud_link, resolve_user, respond_to_rate_limit_choice, restore_rekordbox_backup,
    scan_existing_tracks, search_tracks, search_users, send_message, sign_out, start_download_queue, test_ffmpeg, unfollow_user,
    unlike_track, validate_download_path, validate_soundcloud_url,
};
use services::cancellation::CancellationState;
use services::events;
use services::library::LibraryCache;
use services::liked_tracks::LikedTracksCache;
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
use services::events::{LibraryPlaylistsBatchEvent, TracksBatchEvent};
use services::queue::{QueueCancelledEvent, QueueCompleteEvent, QueueProgressEvent};
use services::rekordbox::models::RekordboxExportProgressEvent;
#[cfg(debug_assertions)]
use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, collect_events, Builder};

static PANIC_HOOK_INIT: Once = Once::new();

fn install_panic_hook() {
    PANIC_HOOK_INIT.call_once(|| {
        let default_hook = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |panic_info| {
            let payload = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
                s.to_string()
            } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
                s.clone()
            } else {
                "Unknown panic payload".to_string()
            };

            let location = panic_info
                .location()
                .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
                .unwrap_or_else(|| "unknown location".to_string());

            let backtrace = std::backtrace::Backtrace::force_capture();

            let crash_msg = format!(
                "=== PANIC DETECTED ===\n\
                 Payload: {}\n\
                 Location: {}\n\
                 Backtrace:\n{}\n\
                 ======================",
                payload, location, backtrace
            );

            // Log to the Tauri logger (if initialized)
            log::error!("[PANIC] {}", crash_msg);

            // Also write to a crash log file as backup
            if let Ok(crash_log_path) = get_crash_log_path() {
                let timestamp = time::OffsetDateTime::now_utc();
                let timestamped_msg = format!(
                    "[{:04}-{:02}-{:02} {:02}:{:02}:{:02}]\n{}",
                    timestamp.year(),
                    timestamp.month() as u8,
                    timestamp.day(),
                    timestamp.hour(),
                    timestamp.minute(),
                    timestamp.second(),
                    crash_msg
                );
                if let Some(parent) = crash_log_path.parent() {
                    let _ = std::fs::create_dir_all(parent);
                }
                let _ = std::fs::write(&crash_log_path, &timestamped_msg);
                eprintln!("Crash log written to: {}", crash_log_path.display());
            }

            // Call the default hook (prints to stderr)
            default_hook(panic_info);
        }));
    });
}

fn get_crash_log_path() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA").map_err(|_| "APPDATA not set")?;
        Ok(std::path::PathBuf::from(app_data)
            .join("com.infrabooth.downloader")
            .join("crash.log"))
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not set")?;
        Ok(std::path::PathBuf::from(home)
            .join("Library/Application Support/com.infrabooth.downloader")
            .join("crash.log"))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_hook();
    let builder = Builder::<tauri::Wry>::new()
        .events(collect_events![
            DownloadProgressEvent,
            QueueProgressEvent,
            QueueCompleteEvent,
            QueueCancelledEvent,
            TracksBatchEvent,
            LibraryPlaylistsBatchEvent,
            RekordboxExportProgressEvent
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
            get_artist_liked_tracks,
            resolve_user,
            resolve_soundcloud_link,
            get_artist_playlists,
            get_artist_playlist_tracks,
            follow_user,
            unfollow_user,
            check_follow_status,
            like_track,
            unlike_track,
            check_firefox_installed,
            open_in_firefox,
            detect_rekordbox,
            get_default_rekordbox_data_directory_parent,
            export_to_rekordbox,
            list_rekordbox_playlists,
            delete_rekordbox_playlist,
            list_rekordbox_backups,
            restore_rekordbox_backup,
            quit_rekordbox,
            export_playlist_to_rekordbox,
            get_unread_count,
            get_notifications_page,
            mark_notifications_seen,
            get_conversations_page,
            get_conversation_messages,
            get_unread_conversations_flag,
            resolve_message_embed,
            send_message,
            get_liked_tracks,
            clear_liked_tracks_cache,
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
        .plugin(tauri_plugin_os::init())
        .manage(AuthState::default())
        .manage(LibraryCache::default())
        .manage(LikedTracksCache::default())
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
