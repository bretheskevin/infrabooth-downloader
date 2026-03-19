use serde::{Deserialize, Serialize};
use specta::Type;

/// Core track data shared across all track-related types.
///
/// This struct contains the essential fields that identify and describe a track.
/// It is embedded via `#[serde(flatten)]` in `QueueItemRequest`, `QueueItem`,
/// and `DownloadRequest` to avoid field duplication.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TrackCore {
    /// SoundCloud API URL for the track (e.g., `https://api.soundcloud.com/tracks/123`)
    pub track_url: String,
    /// SoundCloud track ID as string
    pub track_id: String,
    /// Track title
    pub title: String,
    /// Artist/uploader name
    pub artist: String,
    /// URL to track artwork image
    pub artwork_url: Option<String>,
    /// Track duration in milliseconds
    pub duration_ms: u64,
    /// URL to download original file (if artist enabled free download)
    pub download_url: Option<String>,
}
