use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ArtistProfile {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
    pub description: Option<String>,
    pub followers_count: u64,
    pub followings_count: u64,
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
    pub secret_token: Option<String>,
    #[serde(default)]
    pub duration: Option<u64>,
    #[serde(default)]
    pub user: Option<ArtistPlaylistUser>,
    #[serde(default)]
    pub is_public: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ArtistPlaylistUser {
    pub id: u64,
    pub username: String,
}

/// Raw playlist shape returned by both the artist-playlists and search endpoints.
/// Centralizes artwork fallback and the `sharing` → `is_public` mapping so the
/// enrichment lives in one place.
#[derive(Debug, Deserialize)]
pub(crate) struct RawArtistPlaylist {
    #[serde(flatten)]
    base: ArtistPlaylist,
    #[serde(default)]
    tracks: Vec<RawPlaylistArtwork>,
    #[serde(default)]
    sharing: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawPlaylistArtwork {
    artwork_url: Option<String>,
}

impl From<RawArtistPlaylist> for ArtistPlaylist {
    fn from(mut raw: RawArtistPlaylist) -> Self {
        if raw.base.artwork_url.is_none() {
            raw.base.artwork_url = raw.tracks.iter().find_map(|t| t.artwork_url.clone());
        }
        raw.base.is_public = raw.sharing.as_deref() == Some("public");
        raw.base
    }
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct ResolvedLink {
    pub kind: String,
    pub user_id: Option<u64>,
    pub username: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(json: &str) -> ArtistPlaylist {
        serde_json::from_str::<RawArtistPlaylist>(json).unwrap().into()
    }

    #[test]
    fn artwork_falls_back_to_first_track() {
        let playlist = parse(
            r#"{"id":1,"title":"No Art","artwork_url":null,"track_count":2,"created_at":"2026-01-01T00:00:00Z",
                "permalink_url":"https://soundcloud.com/user/sets/no-art","secret_token":null,
                "tracks":[{"artwork_url":null},{"artwork_url":"https://track2.jpg"}]}"#,
        );
        assert_eq!(playlist.artwork_url, Some("https://track2.jpg".into()));
    }

    #[test]
    fn own_artwork_takes_precedence() {
        let playlist = parse(
            r#"{"id":2,"title":"Has Art","artwork_url":"https://own-art.jpg","track_count":1,"created_at":"2026-01-01T00:00:00Z",
                "permalink_url":"https://soundcloud.com/user/sets/has-art","secret_token":null,
                "tracks":[{"artwork_url":"https://track-art.jpg"}]}"#,
        );
        assert_eq!(playlist.artwork_url, Some("https://own-art.jpg".into()));
    }

    #[test]
    fn no_artwork_anywhere_returns_none() {
        let playlist = parse(
            r#"{"id":3,"title":"Empty","artwork_url":null,"track_count":0,"created_at":"2026-01-01T00:00:00Z",
                "permalink_url":"https://soundcloud.com/user/sets/empty","secret_token":null,"tracks":[]}"#,
        );
        assert_eq!(playlist.artwork_url, None);
    }

    #[test]
    fn sharing_public_maps_to_is_public() {
        let playlist = parse(
            r#"{"id":4,"title":"Public","artwork_url":null,"track_count":0,"created_at":"2026-01-01T00:00:00Z",
                "permalink_url":"https://soundcloud.com/user/sets/public","secret_token":null,"sharing":"public","tracks":[]}"#,
        );
        assert!(playlist.is_public);
    }

    #[test]
    fn sharing_private_and_missing_map_to_not_public() {
        let private = parse(
            r#"{"id":5,"title":"Private","artwork_url":null,"track_count":0,"created_at":"2026-01-01T00:00:00Z",
                "permalink_url":"https://soundcloud.com/user/sets/private","secret_token":null,"sharing":"private","tracks":[]}"#,
        );
        assert!(!private.is_public);

        let missing = parse(
            r#"{"id":6,"title":"Unknown","artwork_url":null,"track_count":0,"created_at":"2026-01-01T00:00:00Z",
                "permalink_url":"https://soundcloud.com/user/sets/unknown","secret_token":null,"tracks":[]}"#,
        );
        assert!(!missing.is_public);
    }
}
