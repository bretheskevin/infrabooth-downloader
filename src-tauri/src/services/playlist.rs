//! Playlist metadata fetching service.
//!
//! This module provides functionality to fetch playlist and track information
//! from SoundCloud using the authenticated user's token.

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::services::oauth::CLIENT_ID;
use crate::services::storage::{is_token_expired_or_expiring, load_tokens};

/// Errors that can occur during playlist operations.
#[derive(Debug, Error)]
pub enum PlaylistError {
    #[error("No authentication token available")]
    NoToken,

    #[error("Token expired and refresh required")]
    TokenExpired,

    #[error("Failed to fetch playlist: {0}")]
    FetchFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Invalid response format")]
    InvalidResponse,
}

/// User information from SoundCloud API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub username: String,
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

/// Gets a valid access token from storage.
///
/// # Returns
/// * `Ok(String)` - The access token if available and not expired
/// * `Err(PlaylistError)` - If no token or token is expired
fn get_valid_access_token() -> Result<String, PlaylistError> {
    let tokens = load_tokens()
        .map_err(|e| PlaylistError::FetchFailed(e.to_string()))?
        .ok_or(PlaylistError::NoToken)?;

    if is_token_expired_or_expiring(tokens.expires_at) {
        return Err(PlaylistError::TokenExpired);
    }

    Ok(tokens.access_token)
}

/// Fetches playlist information from SoundCloud using the resolve endpoint.
///
/// The resolve endpoint converts a URL to API data, returning the full
/// playlist object including track list.
///
/// # Arguments
/// * `url` - The SoundCloud playlist URL
///
/// # Returns
/// * `Ok(PlaylistInfo)` - The playlist metadata and tracks
/// * `Err(PlaylistError)` - If fetch fails
pub async fn fetch_playlist_info(url: &str) -> Result<PlaylistInfo, PlaylistError> {
    let access_token = get_valid_access_token()?;

    let client = reqwest::Client::new();
    let resolve_url = format!(
        "https://api.soundcloud.com/resolve?url={}&client_id={}",
        urlencoding::encode(url),
        CLIENT_ID
    );

    let response = client
        .get(&resolve_url)
        .header("Authorization", format!("OAuth {}", access_token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(PlaylistError::FetchFailed(format!(
            "HTTP {}: {}",
            status, body
        )));
    }

    let playlist: PlaylistInfo = response
        .json()
        .await
        .map_err(|_| PlaylistError::InvalidResponse)?;

    Ok(playlist)
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

    // TrackInfo tests
    #[test]
    fn test_track_info_deserializes_with_all_fields() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist"},
            "artwork_url": "https://i1.sndcdn.com/artworks-xxx-large.jpg",
            "duration": 180000
        }"#;
        let track: TrackInfo = serde_json::from_str(json).unwrap();
        assert_eq!(track.id, 123456);
        assert_eq!(track.title, "Test Track");
        assert_eq!(track.user.username, "test_artist");
        assert_eq!(
            track.artwork_url,
            Some("https://i1.sndcdn.com/artworks-xxx-large.jpg".to_string())
        );
        assert_eq!(track.duration, 180000);
    }

    #[test]
    fn test_track_info_deserializes_with_null_artwork() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist"},
            "artwork_url": null,
            "duration": 180000
        }"#;
        let track: TrackInfo = serde_json::from_str(json).unwrap();
        assert!(track.artwork_url.is_none());
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

    // PlaylistInfo tests
    #[test]
    fn test_playlist_info_deserializes_with_all_fields() {
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
        let playlist: PlaylistInfo = serde_json::from_str(json).unwrap();
        assert_eq!(playlist.id, 999);
        assert_eq!(playlist.title, "My Playlist");
        assert_eq!(playlist.user.username, "playlist_owner");
        assert_eq!(playlist.track_count, 2);
        assert_eq!(playlist.tracks.len(), 2);
        assert_eq!(playlist.tracks[0].title, "Track 1");
        assert_eq!(playlist.tracks[1].title, "Track 2");
    }

    #[test]
    fn test_playlist_info_deserializes_with_empty_tracks() {
        let json = r#"{
            "id": 999,
            "title": "Empty Playlist",
            "user": {"username": "owner"},
            "artwork_url": null,
            "track_count": 0,
            "tracks": []
        }"#;
        let playlist: PlaylistInfo = serde_json::from_str(json).unwrap();
        assert_eq!(playlist.track_count, 0);
        assert!(playlist.tracks.is_empty());
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
    fn test_playlist_error_no_token_message() {
        let err = PlaylistError::NoToken;
        assert_eq!(err.to_string(), "No authentication token available");
    }

    #[test]
    fn test_playlist_error_token_expired_message() {
        let err = PlaylistError::TokenExpired;
        assert_eq!(err.to_string(), "Token expired and refresh required");
    }

    #[test]
    fn test_playlist_error_fetch_failed_message() {
        let err = PlaylistError::FetchFailed("HTTP 404: Not found".to_string());
        assert_eq!(err.to_string(), "Failed to fetch playlist: HTTP 404: Not found");
    }

    #[test]
    fn test_playlist_error_invalid_response_message() {
        let err = PlaylistError::InvalidResponse;
        assert_eq!(err.to_string(), "Invalid response format");
    }
}
