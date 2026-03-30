use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

use url::Url;

use crate::models::error::HasErrorCode;
use crate::services::http::{validate_api_response, API_V2_BASE, HTTP_CLIENT};
use crate::services::playlist::{RawTrackInfo, TrackInfo};

// === Error Type ===

#[derive(Debug, Error)]
pub enum SearchError {
    #[error("Search failed: {0}")]
    FetchFailed(String),

    #[error("Rate limited by SoundCloud")]
    RateLimited,

    #[error("Authentication required")]
    AuthRequired,

    #[error("Access forbidden")]
    GeoBlocked,

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Invalid response format")]
    InvalidResponse,
}

impl From<crate::services::http::ApiResponseError> for SearchError {
    fn from(e: crate::services::http::ApiResponseError) -> Self {
        use crate::services::http::ApiResponseError;
        match e {
            ApiResponseError::RateLimited => Self::RateLimited,
            ApiResponseError::AuthRequired => Self::AuthRequired,
            ApiResponseError::GeoBlocked => Self::GeoBlocked,
            ApiResponseError::NotFound => Self::FetchFailed("Not found".to_string()),
            ApiResponseError::FetchFailed(msg) => Self::FetchFailed(msg),
        }
    }
}

impl HasErrorCode for SearchError {
    fn code(&self) -> &'static str {
        match self {
            SearchError::FetchFailed(_) => "SEARCH_FAILED",
            SearchError::RateLimited => "RATE_LIMITED",
            SearchError::AuthRequired => "AUTH_REQUIRED",
            SearchError::GeoBlocked => "GEO_BLOCKED",
            SearchError::NetworkError(_) => "NETWORK_ERROR",
            SearchError::InvalidResponse => "SEARCH_FAILED",
        }
    }
}

// === Internal deserialization types ===

#[derive(Debug, Deserialize)]
struct SearchApiResponse {
    collection: Vec<RawTrackInfo>,
    total_results: Option<i64>,
}

// === Public types ===

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchResponse {
    pub collection: Vec<TrackInfo>,
    pub total_results: Option<i64>,
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

    validate_api_response(response.status())?;

    let api_response: SearchApiResponse = response
        .json()
        .await
        .map_err(|_| SearchError::InvalidResponse)?;

    let collection = api_response
        .collection
        .into_iter()
        .map(TrackInfo::from)
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
    fn test_raw_track_to_track_info() {
        let json = r#"{
            "id": 456,
            "title": "My Song",
            "user": { "username": "Artist" },
            "artwork_url": "https://artwork.jpg",
            "duration": 240000,
            "permalink_url": "https://soundcloud.com/artist/my-song"
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(track.id, 456);
        assert_eq!(track.title, "My Song");
        assert_eq!(track.user.username, "Artist");
        assert_eq!(track.artwork_url, Some("https://artwork.jpg".to_string()));
        assert_eq!(track.duration, 240000);
    }

    #[test]
    fn test_raw_track_to_track_info_null_artwork() {
        let json = r#"{
            "id": 789,
            "title": "No Art",
            "user": { "username": "User" },
            "artwork_url": null,
            "duration": 60000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
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
        use crate::services::playlist::UserInfo;
        let response = SearchResponse {
            collection: vec![TrackInfo {
                id: 1,
                title: "Test".to_string(),
                user: UserInfo {
                    id: 1,
                    username: "user".to_string(),
                    avatar_url: None,
                },
                artwork_url: None,
                duration: 100000,
                permalink_url: "https://soundcloud.com/user/test".to_string(),
                waveform_url: None,
                downloadable: false,
                download_url: None,
            }],
            total_results: Some(1),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"id\":1"));
        assert!(json.contains("\"total_results\":1"));
    }
}
