//! Centralized event name constants for Tauri event emission.
//!
//! All event names used in `app.emit()` calls should be defined here
//! to prevent typos and enable easy discovery of the full event surface.

use serde::Serialize;
use specta::Type;
use tauri::Emitter;

use crate::services::playlist::TrackInfo;

pub const DOWNLOAD_PROGRESS: &str = "download-progress";
pub const QUEUE_PROGRESS: &str = "queue-progress";
pub const QUEUE_COMPLETE: &str = "queue-complete";
pub const QUEUE_CANCELLED: &str = "queue-cancelled";
pub const DOWNLOAD_RATE_LIMITED: &str = "download-rate-limited";
pub const PLAYLIST_TRACKS_BATCH: &str = "playlist-tracks-batch";
pub const ARTIST_TRACKS_BATCH: &str = "artist-tracks-batch";
pub const ARTIST_PLAYLIST_TRACKS_BATCH: &str = "artist-playlist-tracks-batch";
pub const AUTH_STATE_CHANGED: &str = "auth-state-changed";
pub const AUTH_REAUTH_NEEDED: &str = "auth-reauth-needed";
pub const OPEN_SETTINGS: &str = "open-settings";
pub const UPDATE_DOWNLOAD_PROGRESS: &str = "update-download-progress";

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
