use serde::{Deserialize, Serialize};
use specta::Type;

// -- Constants ----------------------------------------------------------------

pub const PLAYLIST_TYPE_PLAYLIST: i32 = 0;
pub const PLAYLIST_TYPE_FOLDER: i32 = 1;
pub const FILE_TYPE_MP3: i32 = 1;
pub const INFRABOOTH_FOLDER_NAME: &str = "InfraBooth Downloader";
pub const ALL_TRACKS_PLAYLIST_NAME: &str = "All Tracks";
pub const MAX_NAME_CONFLICTS: i32 = 999;
pub const MASTER_DB_FILENAME: &str = "master.db";
pub const MASTER_PLAYLISTS_XML: &str = "masterPlaylists6.xml";

// -- Database row structs (internal, not specta-exported) ---------------------

#[cfg_attr(not(test), allow(dead_code))]
pub struct DjmdPlaylist {
    pub id: String,
    pub seq: i32,
    pub name: String,
    pub attribute: i32,
    pub parent_id: String,
}

#[cfg_attr(not(test), allow(dead_code))]
pub struct DjmdSongPlaylist {
    pub content_id: String,
    pub track_no: i32,
}

pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration_ms: Option<i64>,
    pub bit_rate: Option<i32>,
    pub sample_rate: Option<i32>,
}

pub struct UsnUpdate {
    pub table_name: String,
    pub row_id: String,
}

// -- DTOs for Tauri commands (specta-exported) --------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportTrackRequest {
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub exported_count: i32,
    pub skipped_count: i32,
    pub playlist_name: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RekordboxPlaylistInfo {
    pub id: String,
    pub name: String,
    pub track_count: i32,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: String,
    pub size_mb: f64,
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RekordboxStatus {
    pub found: bool,
    pub version: Option<String>,
    pub db_path: Option<String>,
    pub is_running: bool,
}

#[derive(Debug, Clone)]
pub struct RekordboxConfig {
    pub db_path: std::path::PathBuf,
    pub db_dir: std::path::PathBuf,
    pub version: String,
}
