pub mod auth;
pub mod download;
pub mod ffmpeg;
pub mod playlist;
pub mod settings;
pub mod updater;

pub fn require_user_id(app: &tauri::AppHandle) -> Result<u64, String> {
    use tauri::Manager;
    app.state::<crate::services::storage::AuthState>().get_user_id().ok_or_else(|| "User ID not available — re-authenticate".to_string())
}

pub async fn get_optional_auth_and_cid(app: &tauri::AppHandle) -> Result<(Option<String>, String), String> {
    use tauri::Manager;
    let token = app.state::<crate::services::storage::AuthState>().get_token();
    let cid = crate::services::client_id::get_client_id().await.map_err(|e| {
        log::error!("[get_optional_auth_and_cid] Failed to get client_id: {}", e);
        format!("Failed to get client_id: {}", e)
    })?;
    Ok((token, cid))
}

pub async fn require_auth_and_cid(app: &tauri::AppHandle) -> Result<(String, String), String> {
    let (token, cid) = get_optional_auth_and_cid(app).await?;
    let token = token.ok_or_else(|| {
        log::warn!("[require_auth_and_cid] No auth token available");
        "Authentication required".to_string()
    })?;
    Ok((token, cid))
}

pub use auth::{check_auth, check_firefox_installed, open_in_firefox, refresh_auth, sign_out};
pub use download::{cancel_download_queue, download_track_full, respond_to_rate_limit_choice, scan_existing_tracks, start_download_queue};
pub use ffmpeg::test_ffmpeg;
pub use playlist::{
    add_track_to_playlist, create_playlist, delete_playlist, get_playlist_info, get_track_info, remove_track_from_playlist, update_playlist,
    validate_soundcloud_url,
};
pub use settings::{
    check_write_permission, enable_tls_verify, get_app_data_path, get_default_download_path, get_feature_flags, get_log_path, is_tls_verify_disabled,
    validate_download_path,
};
pub use updater::{check_for_updates, install_update};

pub mod library;
pub use library::{
    clear_library_cache, clear_liked_tracks_cache, get_library_playlists, get_liked_tracks, get_owned_playlists_for_track, get_playlist_tracks,
    remove_playlist_from_library_cache, resolve_library_artwork,
};

pub mod search;
pub use search::{search_playlists, search_tracks, search_users};

pub mod player;
pub use player::resolve_playback_url;

pub mod selections;
pub use selections::get_selections;

pub mod new_tracks;
pub use new_tracks::{get_artist_activity, get_artist_releases, get_followed_artists, get_release_tracks, mark_artist_releases_seen, mark_artist_seen};

pub mod notifications;
pub use notifications::{get_notifications_page, get_unread_count, mark_notifications_seen};

pub mod related;
pub use related::fetch_related_tracks;

pub mod artist;
pub use artist::{
    get_all_artist_tracks, get_artist_followers, get_artist_followings, get_artist_liked_tracks, get_artist_playlists, get_artist_profile,
    resolve_soundcloud_link, resolve_user,
};

pub mod follow;
pub use follow::{check_follow_status, follow_user, unfollow_user};

pub mod like;
pub use like::{like_playlist, like_track, unlike_playlist, unlike_track};

pub mod rekordbox;
pub use rekordbox::{
    delete_rekordbox_playlist, detect_rekordbox, export_to_rekordbox, get_default_rekordbox_data_directory_parent, get_rekordbox_playlist_tree,
    list_rekordbox_backups, list_rekordbox_playlists, quit_rekordbox, restore_rekordbox_backup,
};

pub mod rekordbox_export;
pub use rekordbox_export::{cancel_rekordbox_export, export_playlist_to_rekordbox, RekordboxExportCancellation};

pub mod messages;
pub use messages::{
    get_conversation_messages, get_conversations_page, get_unread_conversations_flag, mark_conversation_read, resolve_message_embed, send_message,
};

pub use crate::services::paths::persist_json;
