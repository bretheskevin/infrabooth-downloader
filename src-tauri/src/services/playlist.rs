//! SoundCloud API client for fetching track and playlist metadata.
//!
//! This module fetches metadata using the SoundCloud API:
//! - Authenticated users: Uses OAuth token for private content access
//! - Unauthenticated users: Uses app token (client credentials) for public content

use std::sync::Mutex;

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::services::oauth::{get_app_token, get_client_secret};
use crate::services::storage::{is_token_expired_or_expiring, load_tokens};

#[derive(Debug, Deserialize)]
struct ResolveResponse {
    status: Option<String>,
    location: Option<String>,
}

/// Errors that can occur during playlist operations.
#[derive(Debug, Error)]
pub enum PlaylistError {
    #[error("Token expired and refresh required")]
    TokenExpired,

    #[error("Failed to fetch playlist: {0}")]
    FetchFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Invalid response format")]
    InvalidResponse,

    #[error("Track not found")]
    TrackNotFound,

    #[error("Track unavailable in your region")]
    GeoBlocked,

    #[error("Private content requires sign-in")]
    AuthRequired,
}

/// User information from SoundCloud API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub username: String,
}

/// Publisher metadata from SoundCloud API.
/// Contains the actual artist name for label-distributed content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublisherMetadata {
    /// The actual artist name (different from uploader username for label content)
    pub artist: Option<String>,
}

/// Raw track information from SoundCloud API.
/// Used for deserializing the API response before transforming to TrackInfo.
#[derive(Debug, Clone, Deserialize)]
struct RawTrackInfo {
    pub id: u64,
    pub title: String,
    pub user: UserInfo,
    pub artwork_url: Option<String>,
    /// Duration in milliseconds.
    pub duration: u64,
    /// Publisher metadata containing the actual artist name for label content.
    pub publisher_metadata: Option<PublisherMetadata>,
}

/// Track information from SoundCloud API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackInfo {
    pub id: u64,
    pub title: String,
    pub user: UserInfo,
    pub artwork_url: Option<String>,
    /// Duration in milliseconds.
    pub duration: u64,
}

impl From<RawTrackInfo> for TrackInfo {
    fn from(raw: RawTrackInfo) -> Self {
        // Use publisher_metadata.artist if available, otherwise fall back to user.username
        let artist_name = raw
            .publisher_metadata
            .and_then(|pm| pm.artist)
            .filter(|a| !a.is_empty())
            .unwrap_or_else(|| raw.user.username.clone());

        TrackInfo {
            id: raw.id,
            title: raw.title,
            user: UserInfo {
                username: artist_name,
            },
            artwork_url: raw.artwork_url,
            duration: raw.duration,
        }
    }
}

/// Raw playlist information from SoundCloud API.
/// Used for deserializing the API response before transforming to PlaylistInfo.
#[derive(Debug, Clone, Deserialize)]
struct RawPlaylistInfo {
    pub id: u64,
    pub title: String,
    pub user: UserInfo,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub tracks: Vec<RawTrackInfo>,
}

/// Playlist information from SoundCloud API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistInfo {
    pub id: u64,
    pub title: String,
    pub user: UserInfo,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub tracks: Vec<TrackInfo>,
}

impl From<RawPlaylistInfo> for PlaylistInfo {
    fn from(raw: RawPlaylistInfo) -> Self {
        PlaylistInfo {
            id: raw.id,
            title: raw.title,
            user: raw.user,
            artwork_url: raw.artwork_url,
            track_count: raw.track_count,
            tracks: raw.tracks.into_iter().map(TrackInfo::from).collect(),
        }
    }
}

/// Cached app token for unauthenticated API requests.
struct CachedAppToken {
    token: String,
    expires_at: u64,
}

static APP_TOKEN_CACHE: Lazy<Mutex<Option<CachedAppToken>>> = Lazy::new(|| Mutex::new(None));

fn current_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Gets a valid app token, fetching a new one if needed.
async fn get_cached_app_token() -> Result<String, PlaylistError> {
    // Check if we have a valid cached token
    {
        let cache = APP_TOKEN_CACHE.lock().unwrap();
        if let Some(ref cached) = *cache {
            // Use 5-minute buffer before expiration
            if cached.expires_at > current_timestamp() + 300 {
                return Ok(cached.token.clone());
            }
        }
    }

    // Need to fetch a new token
    log::info!("[soundcloud] Fetching new app token via client credentials");
    let secret = get_client_secret().map_err(|e| PlaylistError::FetchFailed(e.to_string()))?;
    let response = get_app_token(secret)
        .await
        .map_err(|e| PlaylistError::FetchFailed(e.to_string()))?;

    let expires_at = current_timestamp() + response.expires_in;

    // Cache the new token
    {
        let mut cache = APP_TOKEN_CACHE.lock().unwrap();
        *cache = Some(CachedAppToken {
            token: response.access_token.clone(),
            expires_at,
        });
    }

    log::info!(
        "[soundcloud] App token cached, expires in {} seconds",
        response.expires_in
    );
    Ok(response.access_token)
}

/// Gets the authentication mode - user OAuth token if available, otherwise app token.
///
/// # Returns
/// * `Ok(token)` - Access token (user or app level)
/// * `Err(PlaylistError::TokenExpired)` - If user token exists but is expired
async fn get_access_token() -> Result<String, PlaylistError> {
    match load_tokens() {
        Ok(Some(tokens)) => {
            if is_token_expired_or_expiring(tokens.expires_at) {
                Err(PlaylistError::TokenExpired)
            } else {
                log::debug!("[soundcloud] Using user OAuth token");
                Ok(tokens.access_token)
            }
        }
        Ok(None) => {
            log::debug!("[soundcloud] No user token, using app token");
            get_cached_app_token().await
        }
        Err(e) => {
            log::warn!(
                "[soundcloud] Failed to load user tokens: {}, using app token",
                e
            );
            get_cached_app_token().await
        }
    }
}

async fn resolve_url<T: serde::de::DeserializeOwned>(
    url: &str,
    access_token: &str,
) -> Result<T, PlaylistError> {
    let client = reqwest::Client::new();
    let resolve_url = format!(
        "https://api.soundcloud.com/resolve?url={}",
        urlencoding::encode(url),
    );
    let auth_header = format!("OAuth {}", access_token);

    let response = client
        .get(&resolve_url)
        .header("Authorization", &auth_header)
        .send()
        .await?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(PlaylistError::TrackNotFound);
    }

    if response.status() == reqwest::StatusCode::FORBIDDEN {
        return Err(PlaylistError::GeoBlocked);
    }

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(PlaylistError::AuthRequired);
    }

    if !response.status().is_success() && response.status() != reqwest::StatusCode::FOUND {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(PlaylistError::FetchFailed(format!(
            "HTTP {}: {}",
            status, body
        )));
    }

    let body = response.text().await?;

    if let Ok(redirect) = serde_json::from_str::<ResolveResponse>(&body) {
        if let Some(location) = redirect.location {
            log::info!("[soundcloud] Following redirect to: {}", location);

            let redirect_response = client
                .get(&location)
                .header("Authorization", &auth_header)
                .send()
                .await?;

            if redirect_response.status() == reqwest::StatusCode::UNAUTHORIZED {
                return Err(PlaylistError::AuthRequired);
            }

            if !redirect_response.status().is_success() {
                let status = redirect_response.status();
                let body = redirect_response.text().await.unwrap_or_default();
                return Err(PlaylistError::FetchFailed(format!(
                    "HTTP {}: {}",
                    status, body
                )));
            }

            return redirect_response
                .json()
                .await
                .map_err(|_| PlaylistError::InvalidResponse);
        }
    }

    serde_json::from_str(&body).map_err(|_| PlaylistError::InvalidResponse)
}

pub async fn fetch_playlist_info(url: &str) -> Result<PlaylistInfo, PlaylistError> {
    let token = get_access_token().await?;
    log::info!("[soundcloud] Fetching playlist info for URL: {}", url);
    let raw: RawPlaylistInfo = resolve_url(url, &token).await?;
    Ok(PlaylistInfo::from(raw))
}

pub async fn fetch_track_info(url: &str) -> Result<TrackInfo, PlaylistError> {
    let token = get_access_token().await?;
    log::info!("[soundcloud] Fetching track info for URL: {}", url);
    let raw: RawTrackInfo = resolve_url(url, &token).await?;
    Ok(TrackInfo::from(raw))
}

#[cfg(test)]
mod tests {
    use super::*;

    // UserInfo tests
    #[test]
    fn test_user_info_deserializes_correctly() {
        let json = r#"{"username": "test_artist"}"#;
        let user: UserInfo = serde_json::from_str(json).unwrap();
        assert_eq!(user.username, "test_artist");
    }

    #[test]
    fn test_user_info_serializes_correctly() {
        let user = UserInfo {
            username: "test_artist".to_string(),
        };
        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("\"username\":\"test_artist\""));
    }

    // RawTrackInfo and TrackInfo tests
    #[test]
    fn test_raw_track_info_deserializes_with_all_fields() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist"},
            "artwork_url": "https://i1.sndcdn.com/artworks-xxx-large.jpg",
            "duration": 180000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(track.id, 123456);
        assert_eq!(track.title, "Test Track");
        // Without publisher_metadata, falls back to user.username
        assert_eq!(track.user.username, "test_artist");
        assert_eq!(
            track.artwork_url,
            Some("https://i1.sndcdn.com/artworks-xxx-large.jpg".to_string())
        );
        assert_eq!(track.duration, 180000);
    }

    #[test]
    fn test_raw_track_info_deserializes_with_null_artwork() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist"},
            "artwork_url": null,
            "duration": 180000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert!(track.artwork_url.is_none());
    }

    #[test]
    fn test_track_info_uses_publisher_metadata_artist_when_available() {
        // Simulates a label-distributed track where user is the label but
        // publisher_metadata contains the actual artist
        let json = r#"{
            "id": 123456,
            "title": "FreakFreak",
            "user": {"username": "NA"},
            "artwork_url": null,
            "duration": 180000,
            "publisher_metadata": {"artist": "PioUPioU"}
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        // Should use publisher_metadata.artist instead of user.username
        assert_eq!(track.user.username, "PioUPioU");
    }

    #[test]
    fn test_track_info_falls_back_to_username_when_publisher_metadata_missing() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "regular_artist"},
            "artwork_url": null,
            "duration": 180000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(track.user.username, "regular_artist");
    }

    #[test]
    fn test_track_info_falls_back_to_username_when_publisher_metadata_artist_null() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "uploader"},
            "artwork_url": null,
            "duration": 180000,
            "publisher_metadata": {"artist": null}
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(track.user.username, "uploader");
    }

    #[test]
    fn test_track_info_falls_back_to_username_when_publisher_metadata_artist_empty() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "uploader"},
            "artwork_url": null,
            "duration": 180000,
            "publisher_metadata": {"artist": ""}
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(track.user.username, "uploader");
    }

    #[test]
    fn test_track_info_serializes_correctly() {
        let track = TrackInfo {
            id: 123456,
            title: "Test Track".to_string(),
            user: UserInfo {
                username: "test_artist".to_string(),
            },
            artwork_url: Some("https://example.com/art.jpg".to_string()),
            duration: 180000,
        };
        let json = serde_json::to_string(&track).unwrap();
        assert!(json.contains("\"id\":123456"));
        assert!(json.contains("\"title\":\"Test Track\""));
        assert!(json.contains("\"duration\":180000"));
    }

    // RawPlaylistInfo and PlaylistInfo tests
    #[test]
    fn test_raw_playlist_info_deserializes_with_all_fields() {
        let json = r#"{
            "id": 999,
            "title": "My Playlist",
            "user": {"username": "playlist_owner"},
            "artwork_url": "https://i1.sndcdn.com/artworks-playlist-large.jpg",
            "track_count": 2,
            "tracks": [
                {
                    "id": 1,
                    "title": "Track 1",
                    "user": {"username": "artist1"},
                    "artwork_url": null,
                    "duration": 120000
                },
                {
                    "id": 2,
                    "title": "Track 2",
                    "user": {"username": "artist2"},
                    "artwork_url": "https://example.com/art2.jpg",
                    "duration": 240000
                }
            ]
        }"#;
        let raw: RawPlaylistInfo = serde_json::from_str(json).unwrap();
        let playlist = PlaylistInfo::from(raw);
        assert_eq!(playlist.id, 999);
        assert_eq!(playlist.title, "My Playlist");
        assert_eq!(playlist.user.username, "playlist_owner");
        assert_eq!(playlist.track_count, 2);
        assert_eq!(playlist.tracks.len(), 2);
        assert_eq!(playlist.tracks[0].title, "Track 1");
        assert_eq!(playlist.tracks[1].title, "Track 2");
    }

    #[test]
    fn test_raw_playlist_info_deserializes_with_empty_tracks() {
        let json = r#"{
            "id": 999,
            "title": "Empty Playlist",
            "user": {"username": "owner"},
            "artwork_url": null,
            "track_count": 0,
            "tracks": []
        }"#;
        let raw: RawPlaylistInfo = serde_json::from_str(json).unwrap();
        let playlist = PlaylistInfo::from(raw);
        assert_eq!(playlist.track_count, 0);
        assert!(playlist.tracks.is_empty());
    }

    #[test]
    fn test_playlist_tracks_use_publisher_metadata_artist() {
        // Playlist with label-distributed tracks
        let json = r#"{
            "id": 999,
            "title": "Label Compilation",
            "user": {"username": "record_label"},
            "artwork_url": null,
            "track_count": 2,
            "tracks": [
                {
                    "id": 1,
                    "title": "Track A",
                    "user": {"username": "NA"},
                    "artwork_url": null,
                    "duration": 120000,
                    "publisher_metadata": {"artist": "Artist One"}
                },
                {
                    "id": 2,
                    "title": "Track B",
                    "user": {"username": "regular_uploader"},
                    "artwork_url": null,
                    "duration": 180000
                }
            ]
        }"#;
        let raw: RawPlaylistInfo = serde_json::from_str(json).unwrap();
        let playlist = PlaylistInfo::from(raw);
        // First track should use publisher_metadata.artist
        assert_eq!(playlist.tracks[0].user.username, "Artist One");
        // Second track should fall back to user.username
        assert_eq!(playlist.tracks[1].user.username, "regular_uploader");
    }

    #[test]
    fn test_playlist_info_serializes_correctly() {
        let playlist = PlaylistInfo {
            id: 999,
            title: "My Playlist".to_string(),
            user: UserInfo {
                username: "owner".to_string(),
            },
            artwork_url: Some("https://example.com/playlist.jpg".to_string()),
            track_count: 1,
            tracks: vec![TrackInfo {
                id: 1,
                title: "Track 1".to_string(),
                user: UserInfo {
                    username: "artist".to_string(),
                },
                artwork_url: None,
                duration: 180000,
            }],
        };
        let json = serde_json::to_string(&playlist).unwrap();
        assert!(json.contains("\"id\":999"));
        assert!(json.contains("\"title\":\"My Playlist\""));
        assert!(json.contains("\"track_count\":1"));
    }

    // PlaylistError tests
    #[test]
    fn test_playlist_error_token_expired_message() {
        let err = PlaylistError::TokenExpired;
        assert_eq!(err.to_string(), "Token expired and refresh required");
    }

    #[test]
    fn test_playlist_error_auth_required_message() {
        let err = PlaylistError::AuthRequired;
        assert_eq!(err.to_string(), "Private content requires sign-in");
    }

    #[test]
    fn test_playlist_error_fetch_failed_message() {
        let err = PlaylistError::FetchFailed("HTTP 404: Not found".to_string());
        assert_eq!(
            err.to_string(),
            "Failed to fetch playlist: HTTP 404: Not found"
        );
    }

    #[test]
    fn test_playlist_error_invalid_response_message() {
        let err = PlaylistError::InvalidResponse;
        assert_eq!(err.to_string(), "Invalid response format");
    }

    #[test]
    fn test_playlist_error_track_not_found_message() {
        let err = PlaylistError::TrackNotFound;
        assert_eq!(err.to_string(), "Track not found");
    }

    #[test]
    fn test_playlist_error_geo_blocked_message() {
        let err = PlaylistError::GeoBlocked;
        assert_eq!(err.to_string(), "Track unavailable in your region");
    }
}
