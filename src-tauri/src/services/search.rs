use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

use url::Url;

use crate::models::error::HasErrorCode;
use crate::services::http::{API_V2_BASE, HTTP_CLIENT};
use crate::services::playlist::{TrackInfo, UserInfo};

// === Error Type ===

#[derive(Debug, Error)]
pub enum SearchError {
    #[error("Search failed: {0}")]
    FetchFailed(String),

    #[error("Rate limited by SoundCloud")]
    RateLimited,

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Invalid response format")]
    InvalidResponse,
}

impl HasErrorCode for SearchError {
    fn code(&self) -> &'static str {
        match self {
            SearchError::FetchFailed(_) => "SEARCH_FAILED",
            SearchError::RateLimited => "RATE_LIMITED",
            SearchError::NetworkError(_) => "NETWORK_ERROR",
            SearchError::InvalidResponse => "SEARCH_FAILED",
        }
    }
}

// === Internal deserialization types ===

#[derive(Debug, Deserialize)]
struct RawSearchTrack {
    id: u64,
    title: String,
    user: RawSearchUser,
    artwork_url: Option<String>,
    duration: u64,
    /// SoundCloud permalink URL. Always present in API responses; `#[serde(default)]` is a safety net.
    #[serde(default)]
    permalink_url: String,
}

#[derive(Debug, Deserialize)]
struct RawSearchUser {
    username: String,
}

#[derive(Debug, Deserialize)]
struct SearchApiResponse {
    collection: Vec<RawSearchTrack>,
    total_results: Option<i64>,
}

// === Public types ===

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchResponse {
    pub collection: Vec<TrackInfo>,
    pub total_results: Option<i64>,
}

// === Mapping ===

fn map_raw_track(raw: RawSearchTrack) -> TrackInfo {
    TrackInfo {
        id: raw.id,
        title: raw.title,
        user: UserInfo {
            username: raw.user.username,
        },
        artwork_url: raw.artwork_url,
        duration: raw.duration,
        permalink_url: raw.permalink_url,
    }
}

// === Service function ===

pub async fn search_tracks(
    client_id: &str,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<SearchResponse, SearchError> {
    let url = Url::parse_with_params(
        &format!("{}/search/tracks", API_V2_BASE),
        &[
            ("q", query),
            ("client_id", client_id),
            ("limit", &limit.to_string()),
            ("offset", &offset.to_string()),
        ],
    )
    .map_err(|e| SearchError::FetchFailed(e.to_string()))?;

    let response = HTTP_CLIENT
        .get(url)
        .send()
        .await?;

    let status = response.status();
    if status == 429 {
        return Err(SearchError::RateLimited);
    }
    if !status.is_success() {
        return Err(SearchError::FetchFailed(format!("HTTP {}", status)));
    }

    let api_response: SearchApiResponse = response
        .json()
        .await
        .map_err(|_| SearchError::InvalidResponse)?;

    let collection = api_response
        .collection
        .into_iter()
        .map(map_raw_track)
        .collect();

    Ok(SearchResponse {
        collection,
        total_results: api_response.total_results,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_api_response_deserializes() {
        let json = r#"{
            "collection": [
                {
                    "id": 123,
                    "title": "Test Track",
                    "user": { "username": "TestUser" },
                    "artwork_url": "https://i1.sndcdn.com/artworks-abc.jpg",
                    "duration": 180000
                }
            ],
            "total_results": 42
        }"#;
        let response: SearchApiResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.collection.len(), 1);
        assert_eq!(response.collection[0].title, "Test Track");
        assert_eq!(response.total_results, Some(42));
    }

    #[test]
    fn test_search_api_response_null_total_results() {
        let json = r#"{
            "collection": [],
            "total_results": null
        }"#;
        let response: SearchApiResponse = serde_json::from_str(json).unwrap();
        assert!(response.collection.is_empty());
        assert!(response.total_results.is_none());
    }

    #[test]
    fn test_search_api_response_missing_total_results() {
        let json = r#"{
            "collection": []
        }"#;
        let response: SearchApiResponse = serde_json::from_str(json).unwrap();
        assert!(response.total_results.is_none());
    }

    #[test]
    fn test_map_raw_track() {
        let raw = RawSearchTrack {
            id: 456,
            title: "My Song".to_string(),
            user: RawSearchUser {
                username: "Artist".to_string(),
            },
            artwork_url: Some("https://artwork.jpg".to_string()),
            duration: 240000,
            permalink_url: "https://soundcloud.com/artist/my-song".to_string(),
        };
        let track = map_raw_track(raw);
        assert_eq!(track.id, 456);
        assert_eq!(track.title, "My Song");
        assert_eq!(track.user.username, "Artist");
        assert_eq!(track.artwork_url, Some("https://artwork.jpg".to_string()));
        assert_eq!(track.duration, 240000);
    }

    #[test]
    fn test_map_raw_track_null_artwork() {
        let raw = RawSearchTrack {
            id: 789,
            title: "No Art".to_string(),
            user: RawSearchUser {
                username: "User".to_string(),
            },
            artwork_url: None,
            duration: 60000,
            permalink_url: "https://soundcloud.com/user/no-art".to_string(),
        };
        let track = map_raw_track(raw);
        assert!(track.artwork_url.is_none());
    }

    #[test]
    fn test_search_error_messages() {
        assert_eq!(
            SearchError::RateLimited.to_string(),
            "Rate limited by SoundCloud"
        );
        assert_eq!(
            SearchError::FetchFailed("HTTP 500".to_string()).to_string(),
            "Search failed: HTTP 500"
        );
        assert_eq!(
            SearchError::InvalidResponse.to_string(),
            "Invalid response format"
        );
    }

    #[test]
    fn test_search_response_serializes() {
        let response = SearchResponse {
            collection: vec![TrackInfo {
                id: 1,
                title: "Test".to_string(),
                user: UserInfo {
                    username: "user".to_string(),
                },
                artwork_url: None,
                duration: 100000,
                permalink_url: "https://soundcloud.com/user/test".to_string(),
            }],
            total_results: Some(1),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"id\":1"));
        assert!(json.contains("\"total_results\":1"));
    }
}
