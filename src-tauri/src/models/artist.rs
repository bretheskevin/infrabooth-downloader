use serde::{Deserialize, Serialize};
use specta::Type;

use crate::services::playlist::TrackInfo;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum SortOption {
    #[serde(rename = "recent")]
    Recent,
    #[serde(rename = "popular")]
    Popular,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ArtistProfile {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
    pub description: Option<String>,
    pub followers_count: u64,
    pub track_count: u64,
    pub permalink_url: String,
    #[serde(default)]
    pub visuals: Option<VisualsWrapper>,
}

/// API shape: `{ visuals: { visuals: [{ visual_url: "..." }] } }`
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct VisualsWrapper {
    pub visuals: Vec<VisualItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct VisualItem {
    pub visual_url: String,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct ArtistTracksResponse {
    pub tracks: Vec<TrackInfo>,
    pub has_more: bool,
    pub next_offset: u64,
}
