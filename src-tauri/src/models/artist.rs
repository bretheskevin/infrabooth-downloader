use serde::{Deserialize, Serialize};
use specta::Type;

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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum SortOption {
    Recent,
    Popular,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ArtistPlaylist {
    pub id: u64,
    pub title: String,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub created_at: String,
    pub permalink_url: String,
}
