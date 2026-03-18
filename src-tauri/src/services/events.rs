//! Centralized event name constants for Tauri event emission.
//!
//! All event names used in `app.emit()` calls should be defined here
//! to prevent typos and enable easy discovery of the full event surface.

pub const DOWNLOAD_PROGRESS: &str = "download-progress";
pub const QUEUE_PROGRESS: &str = "queue-progress";
pub const QUEUE_COMPLETE: &str = "queue-complete";
pub const QUEUE_CANCELLED: &str = "queue-cancelled";
pub const DOWNLOAD_RATE_LIMITED: &str = "download-rate-limited";
pub const DOWNLOAD_AUTH_NEEDED: &str = "download-auth-needed";
pub const PLAYLIST_TRACKS_BATCH: &str = "playlist-tracks-batch";
pub const AUTH_STATE_CHANGED: &str = "auth-state-changed";
pub const AUTH_REAUTH_NEEDED: &str = "auth-reauth-needed";
pub const OPEN_SETTINGS: &str = "open-settings";
pub const UPDATE_DOWNLOAD_PROGRESS: &str = "update-download-progress";
