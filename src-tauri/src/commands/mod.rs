pub mod auth;
pub mod download;
pub mod ffmpeg;
pub mod playlist;
pub mod settings;
pub mod updater;

pub fn require_user_id(app: &tauri::AppHandle) -> Result<u64, String> {
    use tauri::Manager;
    app.state::<crate::services::storage::AuthState>()
        .get_user_id()
        .ok_or_else(|| "User ID not available — re-authenticate".to_string())
}

pub async fn get_optional_auth_and_cid(app: &tauri::AppHandle) -> Result<(Option<String>, String), String> {
    use tauri::Manager;
    let token = app.state::<crate::services::storage::AuthState>().get_token();
    let cid = crate::services::client_id::get_client_id()
        .await
        .map_err(|e| {
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
pub use download::{
    cancel_download_queue, download_track_full,
    respond_to_rate_limit_choice, scan_existing_tracks, start_download_queue,
};
pub use ffmpeg::test_ffmpeg;
pub use playlist::{add_track_to_playlist, get_playlist_info, get_track_info, remove_track_from_playlist, validate_soundcloud_url};
pub use settings::{check_write_permission, get_app_data_path, get_default_download_path, get_log_path, validate_download_path};
pub use updater::{check_for_updates, install_update};

pub mod library;
pub use library::{
    clear_library_cache, get_library_playlist_tracks, get_library_playlists,
    get_owned_playlists_for_track, resolve_library_artwork,
};

pub mod search;
pub use search::{search_tracks, search_users};

pub mod player;
pub use player::resolve_playback_url;

pub mod selections;
pub use selections::get_selections;

pub mod new_tracks;
pub use new_tracks::{
    get_followed_artists, get_artist_activity, get_artist_releases, get_release_tracks,
    mark_artist_seen, mark_artist_releases_seen,
};

pub mod related;
pub use related::fetch_related_tracks;

pub mod artist;
pub use artist::{get_artist_profile, get_all_artist_tracks, resolve_user, get_artist_playlists, get_artist_playlist_tracks};

pub mod follow;
pub use follow::{follow_user, unfollow_user, check_follow_status};
