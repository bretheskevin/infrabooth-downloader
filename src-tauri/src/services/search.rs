use serde::{Deserialize, Serialize};
use specta::Type;

use url::Url;

use crate::models::artist::{ArtistPlaylist, RawArtistPlaylist};
use crate::models::error::ScApiError;
use crate::services::http::{validate_api_response, API_V2_BASE, HTTP_CLIENT};
use crate::services::playlist::{RawTrackInfo, TrackInfo};

// === Internal deserialization types ===

#[derive(Debug, Deserialize)]
struct ApiSearchResponse<T> {
    collection: Vec<T>,
    total_results: Option<i64>,
}

// === Public types ===

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SearchResponse {
    pub collection: Vec<TrackInfo>,
    pub total_results: Option<i64>,
}

// === User search internal deserialization types ===

#[derive(Debug, Deserialize)]
struct RawUserInfo {
    id: u64,
    username: String,
    avatar_url: Option<String>,
    followers_count: Option<u64>,
    track_count: Option<u64>,
    permalink_url: Option<String>,
}

// === Public user search types ===

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UserSearchResult {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
    pub followers_count: u64,
    pub track_count: u64,
    pub permalink_url: String,
}

impl From<RawUserInfo> for UserSearchResult {
    fn from(raw: RawUserInfo) -> Self {
        Self {
            id: raw.id,
            username: raw.username,
            avatar_url: raw.avatar_url,
            followers_count: raw.followers_count.unwrap_or(0),
            track_count: raw.track_count.unwrap_or(0),
            permalink_url: raw.permalink_url.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UserSearchResponse {
    pub collection: Vec<UserSearchResult>,
    pub total_results: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlaylistSearchResponse {
    pub collection: Vec<ArtistPlaylist>,
    pub total_results: Option<i64>,
}

// === Service functions ===

async fn search_api<Raw, Out>(client_id: &str, query: &str, limit: u32, offset: u32, endpoint: &str) -> Result<(Vec<Out>, Option<i64>), ScApiError>
where
    Raw: serde::de::DeserializeOwned,
    Out: From<Raw>,
{
    let url = Url::parse_with_params(
        &format!("{}/search/{}", API_V2_BASE, endpoint),
        &[("q", query), ("client_id", client_id), ("limit", &limit.to_string()), ("offset", &offset.to_string())],
    )
    .map_err(|e| ScApiError::FetchFailed(e.to_string()))?;

    let response = HTTP_CLIENT.get(url).send().await?;
    validate_api_response(response.status())?;

    let api_response: ApiSearchResponse<Raw> = response.json().await.map_err(|_| ScApiError::InvalidResponse)?;

    let collection = api_response.collection.into_iter().map(Out::from).collect();

    Ok((collection, api_response.total_results))
}

pub async fn search_tracks(client_id: &str, query: &str, limit: u32, offset: u32) -> Result<SearchResponse, ScApiError> {
    let (collection, total_results) = search_api::<RawTrackInfo, TrackInfo>(client_id, query, limit, offset, "tracks").await?;
    Ok(SearchResponse { collection, total_results })
}

pub async fn search_users(client_id: &str, query: &str, limit: u32, offset: u32) -> Result<UserSearchResponse, ScApiError> {
    let (collection, total_results) = search_api::<RawUserInfo, UserSearchResult>(client_id, query, limit, offset, "users").await?;
    Ok(UserSearchResponse { collection, total_results })
}

pub async fn search_playlists(client_id: &str, query: &str, limit: u32, offset: u32) -> Result<PlaylistSearchResponse, ScApiError> {
    let (collection, total_results) = search_api::<RawArtistPlaylist, ArtistPlaylist>(client_id, query, limit, offset, "playlists_without_albums").await?;
    Ok(PlaylistSearchResponse { collection, total_results })
}

pub async fn search_albums(client_id: &str, query: &str, limit: u32, offset: u32) -> Result<PlaylistSearchResponse, ScApiError> {
    let (collection, total_results) = search_api::<RawArtistPlaylist, ArtistPlaylist>(client_id, query, limit, offset, "albums").await?;
    Ok(PlaylistSearchResponse { collection, total_results })
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
                    "user": { "id": 10, "username": "TestUser" },
                    "artwork_url": "https://i1.sndcdn.com/artworks-abc.jpg",
                    "duration": 180000
                }
            ],
            "total_results": 42
        }"#;
        let response: ApiSearchResponse<RawTrackInfo> = serde_json::from_str(json).unwrap();
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
        let response: ApiSearchResponse<RawTrackInfo> = serde_json::from_str(json).unwrap();
        assert!(response.collection.is_empty());
        assert!(response.total_results.is_none());
    }

    #[test]
    fn test_search_api_response_missing_total_results() {
        let json = r#"{
            "collection": []
        }"#;
        let response: ApiSearchResponse<RawTrackInfo> = serde_json::from_str(json).unwrap();
        assert!(response.total_results.is_none());
    }

    #[test]
    fn test_raw_track_to_track_info() {
        let json = r#"{
            "id": 456,
            "title": "My Song",
            "user": { "id": 20, "username": "Artist" },
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
            "user": { "id": 30, "username": "User" },
            "artwork_url": null,
            "duration": 60000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert!(track.artwork_url.is_none());
    }

    #[test]
    fn test_search_error_messages() {
        assert_eq!(ScApiError::RateLimited.to_string(), "Rate limited by SoundCloud");
        assert_eq!(ScApiError::FetchFailed("HTTP 500".to_string()).to_string(), "HTTP 500");
        assert_eq!(ScApiError::InvalidResponse.to_string(), "Invalid response");
    }

    #[test]
    fn test_search_response_serializes() {
        use crate::services::playlist::UserInfo;
        let response = SearchResponse {
            collection: vec![TrackInfo {
                id: 1,
                title: "Test".to_string(),
                user: UserInfo { id: 1, username: "user".to_string(), avatar_url: None },
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

    #[test]
    fn test_user_search_api_response_deserializes() {
        let json = r#"{
            "collection": [
                {
                    "id": 456,
                    "username": "TestArtist",
                    "avatar_url": "https://i1.sndcdn.com/avatars-abc.jpg",
                    "followers_count": 1200,
                    "track_count": 42,
                    "permalink_url": "https://soundcloud.com/testartist"
                }
            ],
            "total_results": 10
        }"#;
        let response: ApiSearchResponse<RawUserInfo> = serde_json::from_str(json).unwrap();
        assert_eq!(response.collection.len(), 1);
        assert_eq!(response.collection[0].username, "TestArtist");
        assert_eq!(response.total_results, Some(10));
    }

    #[test]
    fn test_user_search_api_response_handles_missing_fields() {
        let json = r#"{
            "collection": [
                {
                    "id": 789,
                    "username": "MinimalUser"
                }
            ],
            "total_results": null
        }"#;
        let response: ApiSearchResponse<RawUserInfo> = serde_json::from_str(json).unwrap();
        let user = UserSearchResult::from(response.collection.into_iter().next().unwrap());
        assert_eq!(user.id, 789);
        assert_eq!(user.username, "MinimalUser");
        assert!(user.avatar_url.is_none());
        assert_eq!(user.followers_count, 0);
        assert_eq!(user.track_count, 0);
        assert_eq!(user.permalink_url, "");
    }

    #[test]
    fn test_raw_user_to_user_search_result() {
        let raw = RawUserInfo {
            id: 100,
            username: "Artist".to_string(),
            avatar_url: Some("https://avatar.jpg".to_string()),
            followers_count: Some(5000),
            track_count: Some(20),
            permalink_url: Some("https://soundcloud.com/artist".to_string()),
        };
        let result = UserSearchResult::from(raw);
        assert_eq!(result.id, 100);
        assert_eq!(result.followers_count, 5000);
        assert_eq!(result.track_count, 20);
        assert_eq!(result.permalink_url, "https://soundcloud.com/artist");
    }

    #[test]
    fn test_user_search_response_serializes() {
        let response = UserSearchResponse {
            collection: vec![UserSearchResult {
                id: 1,
                username: "user".to_string(),
                avatar_url: None,
                followers_count: 100,
                track_count: 5,
                permalink_url: "https://soundcloud.com/user".to_string(),
            }],
            total_results: Some(1),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"id\":1"));
        assert!(json.contains("\"total_results\":1"));
    }

    #[test]
    fn test_playlist_search_api_response_deserializes() {
        let json = r#"{
            "collection": [
                {
                    "id": 789,
                    "title": "Chill Vibes",
                    "artwork_url": "https://i1.sndcdn.com/artworks-abc.jpg",
                    "track_count": 15,
                    "created_at": "2026-01-01T00:00:00Z",
                    "permalink_url": "https://soundcloud.com/user/sets/chill-vibes",
                    "tracks": []
                }
            ],
            "total_results": 5
        }"#;
        let response: ApiSearchResponse<RawArtistPlaylist> = serde_json::from_str(json).unwrap();
        assert_eq!(response.collection.len(), 1);
        let playlist = ArtistPlaylist::from(response.collection.into_iter().next().unwrap());
        assert_eq!(playlist.title, "Chill Vibes");
        assert_eq!(response.total_results, Some(5));
    }

    #[test]
    fn test_playlist_search_response_serializes() {
        let response = PlaylistSearchResponse {
            collection: vec![ArtistPlaylist {
                id: 1,
                title: "Test".into(),
                artwork_url: None,
                track_count: 0,
                created_at: "2026-01-01T00:00:00Z".into(),
                permalink_url: "https://soundcloud.com/user/sets/test".into(),
                secret_token: None,
                duration: None,
                user: None,
                is_public: false,
            }],
            total_results: Some(1),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"title\":\"Test\""));
    }

    #[test]
    fn test_album_search_api_response_deserializes() {
        let json = r#"{
            "collection": [
                {
                    "id": 456,
                    "title": "Studio Album",
                    "artwork_url": "https://i1.sndcdn.com/artworks-xyz.jpg",
                    "track_count": 12,
                    "created_at": "2026-03-15T00:00:00Z",
                    "permalink_url": "https://soundcloud.com/artist/sets/studio-album",
                    "tracks": []
                }
            ],
            "total_results": 3
        }"#;
        let response: ApiSearchResponse<RawArtistPlaylist> = serde_json::from_str(json).unwrap();
        assert_eq!(response.collection.len(), 1);
        let album = ArtistPlaylist::from(response.collection.into_iter().next().unwrap());
        assert_eq!(album.title, "Studio Album");
        assert_eq!(response.total_results, Some(3));
    }

    #[test]
    fn test_album_search_response_serializes() {
        let response = PlaylistSearchResponse {
            collection: vec![ArtistPlaylist {
                id: 2,
                title: "My Album".into(),
                artwork_url: None,
                track_count: 10,
                created_at: "2026-03-15T00:00:00Z".into(),
                permalink_url: "https://soundcloud.com/artist/sets/my-album".into(),
                secret_token: None,
                duration: None,
                user: None,
                is_public: false,
            }],
            total_results: Some(1),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"title\":\"My Album\""));
    }
}
