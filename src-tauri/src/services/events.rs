//! Centralized event name constants for Tauri event emission.
//!
//! All event names used in `app.emit()` calls should be defined here
//! to prevent typos and enable easy discovery of the full event surface.

use serde::Serialize;
use specta::Type;
use tauri::Emitter;

use crate::models::artist::{ArtistPlaylist, ArtistProfile};
use crate::services::library::LibraryPlaylist;
use crate::services::player::emitter::{PlayerEngineState, PlayerEvent};
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
pub const PLAYER_STATE_CHANGED: &str = "player-state-changed";
pub const PLAYER_PROGRESS: &str = "player-progress";
pub const PLAYER_ENDED: &str = "player-ended";
pub const PLAYER_ERROR: &str = "player-error";
pub const PLAYER_FULLY_BUFFERED: &str = "player-fully-buffered";
pub const PLAYER_CROSSFADE_COMPLETE: &str = "player-crossfade-complete";
pub const PLAYER_URL_EXPIRED: &str = "player-url-expired";
pub const PLAYER_MEDIA_KEY: &str = "player-media-key";
pub const DOCK_SETTING: &str = "dock-setting";
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerMediaKeyAction {
    Play,
    Pause,
    Toggle,
    Next,
    Previous,
    Seek {
        #[serde(rename = "positionMs")]
        position_ms: u64,
    },
    ToggleShuffle,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerMediaKeyEvent {
    pub action: PlayerMediaKeyAction,
}

pub fn emit_player_media_key(app: &tauri::AppHandle, action: PlayerMediaKeyAction) {
    if let Err(e) = app.emit(PLAYER_MEDIA_KEY, PlayerMediaKeyEvent { action }) {
        log::warn!("[player::events] Failed to emit media key event: {}", e);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
#[allow(clippy::enum_variant_names)]
pub enum DockSettingAction {
    SetCrossfade { enabled: bool },
    SetCrossfadeDuration { seconds: u8 },
    SetMaxConcurrentDownloads { count: u8 },
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct DockSettingEvent {
    pub action: DockSettingAction,
}

pub fn emit_dock_setting(app: &tauri::AppHandle, action: DockSettingAction) {
    log::info!("[player::events] Emitting dock setting action {:?}", action);
    if let Err(e) = app.emit(DOCK_SETTING, DockSettingEvent { action }) {
        log::warn!("[player::events] Failed to emit dock setting event {:?}: {}", action, e);
    }
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerStateChangedEvent {
    pub load_generation: u32,
    pub state: PlayerEngineState,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProgressEvent {
    pub load_generation: u32,
    pub position_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerEndedEvent {
    pub load_generation: u32,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerErrorEvent {
    pub load_generation: u32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerFullyBufferedEvent {
    pub load_generation: u32,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerCrossfadeCompleteEvent {
    pub load_generation: u32,
}

#[derive(Debug, Clone, Serialize, Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct PlayerUrlExpiredEvent {
    pub load_generation: u32,
    pub position_ms: u64,
}

pub fn emit_player_event(app: &tauri::AppHandle, load_generation: u32, event: PlayerEvent) {
    let result = match event {
        PlayerEvent::StateChanged(state) => app.emit(PLAYER_STATE_CHANGED, PlayerStateChangedEvent { load_generation, state }),
        PlayerEvent::Progress { position_ms, duration_ms } => app.emit(PLAYER_PROGRESS, PlayerProgressEvent { load_generation, position_ms, duration_ms }),
        PlayerEvent::Ended => app.emit(PLAYER_ENDED, PlayerEndedEvent { load_generation }),
        PlayerEvent::Error(message) => app.emit(PLAYER_ERROR, PlayerErrorEvent { load_generation, message }),
        PlayerEvent::FullyBuffered => app.emit(PLAYER_FULLY_BUFFERED, PlayerFullyBufferedEvent { load_generation }),
        PlayerEvent::CrossfadeComplete => app.emit(PLAYER_CROSSFADE_COMPLETE, PlayerCrossfadeCompleteEvent { load_generation }),
        PlayerEvent::UrlExpired { position_ms } => app.emit(PLAYER_URL_EXPIRED, PlayerUrlExpiredEvent { load_generation, position_ms }),
    };
    if let Err(e) = result {
        log::warn!("[player::events] Failed to emit player event (gen={}): {}", load_generation, e);
    }
}

#[cfg(test)]
mod player_event_tests {
    use super::*;

    #[test]
    fn progress_event_serializes_camel_case() {
        let json = serde_json::to_string(&PlayerProgressEvent { load_generation: 3, position_ms: 1000, duration_ms: 5000 }).unwrap();
        assert_eq!(json, r#"{"loadGeneration":3,"positionMs":1000,"durationMs":5000}"#);
    }

    #[test]
    fn state_event_serializes_lowercase_state() {
        let json = serde_json::to_string(&PlayerStateChangedEvent { load_generation: 1, state: PlayerEngineState::Loading }).unwrap();
        assert_eq!(json, r#"{"loadGeneration":1,"state":"loading"}"#);
    }

    #[test]
    fn media_key_event_serializes_tagged_actions() {
        let toggle = serde_json::to_string(&PlayerMediaKeyEvent { action: PlayerMediaKeyAction::Toggle }).unwrap();
        assert_eq!(toggle, r#"{"action":{"type":"toggle"}}"#);
        let seek = serde_json::to_string(&PlayerMediaKeyEvent { action: PlayerMediaKeyAction::Seek { position_ms: 4200 } }).unwrap();
        assert_eq!(seek, r#"{"action":{"type":"seek","positionMs":4200}}"#);
    }

    #[test]
    fn media_key_event_serializes_toggle_shuffle() {
        let shuffle = serde_json::to_string(&PlayerMediaKeyEvent { action: PlayerMediaKeyAction::ToggleShuffle }).unwrap();
        assert_eq!(shuffle, r#"{"action":{"type":"toggleShuffle"}}"#);
    }

    #[test]
    fn dock_setting_event_serializes_tagged_actions() {
        let crossfade = serde_json::to_string(&DockSettingEvent { action: DockSettingAction::SetCrossfade { enabled: true } }).unwrap();
        assert_eq!(crossfade, r#"{"action":{"type":"setCrossfade","enabled":true}}"#);
        let duration = serde_json::to_string(&DockSettingEvent { action: DockSettingAction::SetCrossfadeDuration { seconds: 7 } }).unwrap();
        assert_eq!(duration, r#"{"action":{"type":"setCrossfadeDuration","seconds":7}}"#);
        let parallel = serde_json::to_string(&DockSettingEvent { action: DockSettingAction::SetMaxConcurrentDownloads { count: 1 } }).unwrap();
        assert_eq!(parallel, r#"{"action":{"type":"setMaxConcurrentDownloads","count":1}}"#);
    }
}
