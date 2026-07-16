//! Centralized event name constants for Tauri event emission.
//!
//! All event names used in `app.emit()` calls should be defined here
//! to prevent typos and enable easy discovery of the full event surface.

use serde::Serialize;
use specta::Type;
use tauri::Emitter;

use crate::models::artist::{ArtistPlaylist, ArtistProfile};
use crate::services::library::LibraryPlaylist;
use crate::services::playlist::TrackInfo;

pub const DOWNLOAD_PROGRESS: &str = "download-progress";
pub const QUEUE_PROGRESS: &str = "queue-progress";
pub const QUEUE_COMPLETE: &str = "queue-complete";
pub const QUEUE_CANCELLED: &str = "queue-cancelled";
pub const DOWNLOAD_RATE_LIMITED: &str = "download-rate-limited";
pub const PLAYLIST_TRACKS_BATCH: &str = "playlist-tracks-batch";
pub const ARTIST_TRACKS_BATCH: &str = "artist-tracks-batch";

pub const AUTH_STATE_CHANGED: &str = "auth-state-changed";
pub const AUTH_REAUTH_NEEDED: &str = "auth-reauth-needed";
pub const AUTH_PROFILE_SELECTION_NEEDED: &str = "auth-profile-selection-needed";
pub const OPEN_SETTINGS: &str = "open-settings";
pub const UPDATE_DOWNLOAD_PROGRESS: &str = "update-download-progress";
pub const REKORDBOX_EXPORT_PROGRESS: &str = "rekordbox-export-progress";
pub const LIKED_TRACKS_BATCH: &str = "liked-tracks-batch";
pub const ARTIST_LIKED_TRACKS_BATCH: &str = "artist-liked-tracks-batch";
pub const ARTIST_PLAYLISTS_BATCH: &str = "artist-playlists-batch";
pub const ARTIST_ALBUMS_BATCH: &str = "artist-albums-batch";
pub const LIBRARY_PLAYLISTS_BATCH: &str = "library-playlists-batch";
pub const ARTIST_FOLLOWERS_BATCH: &str = "artist-followers-batch";
pub const ARTIST_FOLLOWINGS_BATCH: &str = "artist-followings-batch";
pub const REMOTE_COMMAND: &str = "remote-command";
pub const WEBVIEW_SEND_STATUS: &str = "webview-send-status";

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct WebviewSendStatusEvent {
    pub operation: String,
    pub active: bool,
}

pub fn emit_webview_send_status(app: &tauri::AppHandle, operation: &str, active: bool) {
    let _ = app.emit(WEBVIEW_SEND_STATUS, WebviewSendStatusEvent { operation: operation.to_string(), active });
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TracksBatchEvent {
    pub entity_id: u64,
    pub tracks: Vec<TrackInfo>,
}

pub fn make_batch_emitter(app: &tauri::AppHandle, event_name: &'static str, entity_id: u64) -> impl Fn(&[TrackInfo]) {
    let app = app.clone();
    move |batch: &[TrackInfo]| {
        let _ = app.emit(event_name, TracksBatchEvent { entity_id, tracks: batch.to_vec() });
    }
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPlaylistsBatchEvent {
    pub playlists: Vec<LibraryPlaylist>,
}

pub fn emit_library_playlists_batch(app: &tauri::AppHandle, playlists: &[LibraryPlaylist]) {
    let _ = app.emit(LIBRARY_PLAYLISTS_BATCH, LibraryPlaylistsBatchEvent { playlists: playlists.to_vec() });
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ArtistPlaylistsBatchEvent {
    pub entity_id: u64,
    pub playlists: Vec<ArtistPlaylist>,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ArtistAlbumsBatchEvent {
    pub entity_id: u64,
    pub albums: Vec<ArtistPlaylist>,
}

pub fn make_playlist_batch_emitter(app: &tauri::AppHandle, entity_id: u64) -> impl Fn(&[ArtistPlaylist]) {
    let app = app.clone();
    move |batch: &[ArtistPlaylist]| {
        let _ = app.emit(ARTIST_PLAYLISTS_BATCH, ArtistPlaylistsBatchEvent { entity_id, playlists: batch.to_vec() });
    }
}

pub fn make_album_batch_emitter(app: &tauri::AppHandle, entity_id: u64) -> impl Fn(&[ArtistPlaylist]) {
    let app = app.clone();
    move |batch: &[ArtistPlaylist]| {
        let _ = app.emit(ARTIST_ALBUMS_BATCH, ArtistAlbumsBatchEvent { entity_id, albums: batch.to_vec() });
    }
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ArtistProfilesBatchEvent {
    pub entity_id: u64,
    pub profiles: Vec<ArtistProfile>,
}

pub fn make_profile_batch_emitter(app: &tauri::AppHandle, event_name: &'static str, entity_id: u64) -> impl Fn(&[ArtistProfile]) {
    let app = app.clone();
    move |batch: &[ArtistProfile]| {
        let _ = app.emit(event_name, ArtistProfilesBatchEvent { entity_id, profiles: batch.to_vec() });
    }
}
