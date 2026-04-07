// src-tauri/src/services/library.rs

use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

use crate::models::PlaylistTracksResponse;
use crate::services::http::{validate_api_response, API_V2_BASE, HTTP_CLIENT, RequestBuilderExt};
use crate::services::playlist::build_playlist_url;

// === Error Type ===

#[derive(Debug, Error)]
pub enum LibraryError {
    #[error("Authentication required")]
    AuthRequired,

    #[error("Rate limited by SoundCloud")]
    RateLimited,

    #[error("Failed to fetch library: {0}")]
    FetchFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] rquest::Error),

    #[error("Invalid response format")]
    InvalidResponse,
}

impl From<crate::services::http::ApiResponseError> for LibraryError {
    fn from(e: crate::services::http::ApiResponseError) -> Self {
        use crate::services::http::ApiResponseError;
        match e {
            ApiResponseError::AuthRequired => Self::AuthRequired,
            ApiResponseError::RateLimited => Self::RateLimited,
            ApiResponseError::NotFound => Self::FetchFailed("Not found".to_string()),
            ApiResponseError::GeoBlocked => Self::FetchFailed("Access forbidden".to_string()),
            ApiResponseError::FetchFailed(msg) => Self::FetchFailed(msg),
            ApiResponseError::InvalidResponse(_) => Self::InvalidResponse,
        }
    }
}

// === Internal deserialization types (not exposed to frontend) ===

#[derive(Debug, Deserialize)]
struct LibraryResponse {
    collection: Vec<LibraryItem>,
    next_href: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LibraryItem {
    #[serde(rename = "type")]
    item_type: String,
    playlist: Option<LibraryPlaylistRaw>,
}

#[derive(Debug, Deserialize)]
struct LibraryPlaylistRaw {
    id: u64,
    title: String,
    user: LibraryUserRaw,
    artwork_url: Option<String>,
    track_count: u32,
    duration: u64,
    permalink_url: String,
    public: bool,
    secret_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LibraryUserRaw {
    #[allow(dead_code)]
    id: u64,
    username: String,
}


// === Public types (exposed to frontend via specta) ===

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct LibraryPlaylist {
    pub id: u64,
    pub title: String,
    pub username: String,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub duration: u64,
    pub permalink_url: String,
    pub is_owned: bool,
    pub is_public: bool,
    pub secret_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct PlaylistForTrackPicker {
    pub id: u64,
    pub title: String,
    pub artwork_url: Option<String>,
    pub contains_track: bool,
}

#[derive(Debug)]
struct LibraryPageResponse {
    playlists: Vec<LibraryPlaylist>,
    next_cursor: Option<String>,
}

// === Cache ===

struct LibraryCacheInner {
    playlists: Vec<LibraryPlaylist>,
    complete: bool,
    artwork: HashMap<u64, Option<String>>,
}

pub struct LibraryCache {
    inner: Mutex<LibraryCacheInner>,
}

impl Default for LibraryCache {
    fn default() -> Self {
        Self {
            inner: Mutex::new(LibraryCacheInner {
                playlists: Vec::new(),
                complete: false,
                artwork: HashMap::new(),
            }),
        }
    }
}

impl LibraryCache {
    pub fn get_if_complete(&self) -> Option<Vec<LibraryPlaylist>> {
        let inner = self.inner.lock().expect("LibraryCache lock poisoned");
        if inner.complete {
            Some(inner.playlists.clone())
        } else {
            None
        }
    }

    pub fn set(&self, playlists: Vec<LibraryPlaylist>) {
        let mut inner = self.inner.lock().expect("LibraryCache lock poisoned");
        inner.playlists = playlists;
        inner.complete = true;
    }

    pub fn clear(&self) {
        let mut inner = self.inner.lock().expect("LibraryCache lock poisoned");
        inner.playlists.clear();
        inner.complete = false;
        inner.artwork.clear();
    }

    pub fn get_artwork(&self, playlist_id: u64) -> Option<Option<String>> {
        let inner = self.inner.lock().expect("LibraryCache lock poisoned");
        inner.artwork.get(&playlist_id).cloned()
    }

    pub fn set_artwork(&self, playlist_id: u64, url: Option<String>) {
        let mut inner = self.inner.lock().expect("LibraryCache lock poisoned");
        inner.artwork.insert(playlist_id, url);
    }

    pub fn get_secret_token(&self, playlist_id: u64) -> Option<String> {
        let inner = self.inner.lock().expect("LibraryCache lock poisoned");
        inner
            .playlists
            .iter()
            .find(|p| p.id == playlist_id)
            .and_then(|p| p.secret_token.clone())
    }
}

// === Mapping ===

fn map_library_item(item: &LibraryItem) -> Option<LibraryPlaylist> {
    let playlist = item.playlist.as_ref()?;
    let is_owned = item.item_type == "playlist";

    Some(LibraryPlaylist {
        id: playlist.id,
        title: playlist.title.clone(),
        username: playlist.user.username.clone(),
        artwork_url: playlist.artwork_url.clone(),
        track_count: playlist.track_count,
        duration: playlist.duration,
        permalink_url: playlist.permalink_url.clone(),
        is_owned,
        is_public: playlist.public,
        secret_token: playlist.secret_token.clone(),
    })
}

// === Service function ===

async fn fetch_library_page(
    oauth_token: &str,
    client_id: &str,
    cursor: Option<String>,
) -> Result<LibraryPageResponse, LibraryError> {
    let url = match cursor {
        Some(ref next_href) => next_href.clone(),
        None => format!(
            "{}/me/library/all?client_id={}&limit=50&linked_partitioning=1",
            API_V2_BASE, client_id
        ),
    };

    let response = HTTP_CLIENT
        .get(&url)
        .with_oauth(Some(oauth_token))
        .send()
        .await?;

    validate_api_response(response.status())?;

    let library_response: LibraryResponse = response
        .json()
        .await
        .map_err(|_| LibraryError::InvalidResponse)?;

    let playlists: Vec<LibraryPlaylist> = library_response
        .collection
        .iter()
        .filter(|item| item.item_type == "playlist" || item.item_type == "playlist-like")
        .filter_map(map_library_item)
        .collect();

    Ok(LibraryPageResponse {
        playlists,
        next_cursor: library_response.next_href,
    })
}

pub async fn fetch_all_library_pages(
    oauth_token: &str,
    client_id: &str,
) -> Result<Vec<LibraryPlaylist>, LibraryError> {
    let mut all_playlists = Vec::new();
    let mut cursor = None;

    loop {
        let page = fetch_library_page(oauth_token, client_id, cursor).await?;
        all_playlists.extend(page.playlists);

        match page.next_cursor {
            Some(next) => cursor = Some(next),
            None => break,
        }
    }

    Ok(all_playlists)
}

pub async fn fetch_owned_playlists_for_track(
    oauth_token: &str,
    client_id: &str,
    track_id: u64,
    playlists: &[LibraryPlaylist],
    cache: &LibraryCache,
) -> Result<Vec<PlaylistForTrackPicker>, LibraryError> {
    use futures::future::join_all;

    let owned: Vec<_> = playlists.iter().filter(|p| p.is_owned).collect();

    let futures = owned.iter().map(|playlist| {
        let oauth = oauth_token.to_string();
        let cid = client_id.to_string();
        let pid = playlist.id;
        let secret = playlist.secret_token.clone();
        let already_has_artwork = playlist.artwork_url.is_some();
        let cached_artwork = cache.get_artwork(pid);

        async move {
            let url = build_playlist_url(pid, &cid, secret.as_deref());

            let response = HTTP_CLIENT
                .get(&url)
                .with_oauth(Some(&oauth))
                .send()
                .await;

            match response {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(playlist_data) = resp.json::<PlaylistTracksResponse>().await {
                        let contains = playlist_data.tracks.iter().any(|t| t.id == track_id);
                        let was_cached = cached_artwork.is_some();
                        let resolved_artwork: Option<String> = if already_has_artwork {
                            None
                        } else {
                            cached_artwork.flatten().or_else(|| playlist_data.first_track_artwork())
                        };
                        let should_cache = !already_has_artwork && !was_cached;
                        Ok((pid, contains, resolved_artwork, should_cache))
                    } else {
                        Err(pid)
                    }
                }
                _ => Err(pid),
            }
        }
    });

    let results = join_all(futures).await;

    let picker_playlists: Vec<PlaylistForTrackPicker> = owned
        .iter()
        .zip(results)
        .map(|(playlist, result)| {
            let (contains, fallback_artwork) = match &result {
                Ok((_, contains, artwork, should_cache)) => {
                    if *should_cache {
                        cache.set_artwork(playlist.id, artwork.clone());
                    }
                    (*contains, artwork.clone())
                }
                Err(_) => (false, None),
            };
            PlaylistForTrackPicker {
                id: playlist.id,
                title: playlist.title.clone(),
                artwork_url: playlist.artwork_url.clone().or(fallback_artwork),
                contains_track: contains,
            }
        })
        .collect();

    Ok(picker_playlists)
}

pub async fn resolve_playlist_artwork(
    oauth_token: &str,
    client_id: &str,
    playlist_id: u64,
    secret_token: Option<String>,
) -> Result<Option<String>, LibraryError> {
    let url = build_playlist_url(playlist_id, client_id, secret_token.as_deref());

    let response = HTTP_CLIENT
        .get(&url)
        .with_oauth(Some(oauth_token))
        .send()
        .await?;

    validate_api_response(response.status())?;

    let playlist_data: PlaylistTracksResponse = response
        .json()
        .await
        .map_err(|_| LibraryError::InvalidResponse)?;

    Ok(playlist_data.first_track_artwork())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_library_response_deserializes_with_playlists() {
        let json = r#"{
            "collection": [
                {
                    "created_at": "2026-01-28T21:02:45Z",
                    "type": "playlist",
                    "playlist": {
                        "id": 2182253849,
                        "title": "Set Acidcore #3",
                        "user": { "id": 526801914, "username": "Kandid", "avatar_url": "https://i1.sndcdn.com/avatars-xxx.jpg" },
                        "artwork_url": null,
                        "track_count": 20,
                        "duration": 7949744,
                        "permalink_url": "https://soundcloud.com/kandid_rl/sets/set-acidcore-4",
                        "public": false
                    }
                }
            ],
            "next_href": "https://api-v2.soundcloud.com/me/library/all?offset=abc&limit=50"
        }"#;
        let response: LibraryResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.collection.len(), 1);
        assert_eq!(response.collection[0].item_type, "playlist");
        assert!(response.next_href.is_some());
    }

    #[test]
    fn test_library_response_deserializes_with_null_next_href() {
        let json = r#"{
            "collection": [],
            "next_href": null
        }"#;
        let response: LibraryResponse = serde_json::from_str(json).unwrap();
        assert!(response.collection.is_empty());
        assert!(response.next_href.is_none());
    }

    #[test]
    fn test_library_item_deserializes_playlist_like() {
        let json = r#"{
            "created_at": "2026-01-15T10:00:00Z",
            "type": "playlist-like",
            "playlist": {
                "id": 999,
                "title": "Liked Playlist",
                "user": { "id": 123, "username": "other_user", "avatar_url": null },
                "artwork_url": "https://i1.sndcdn.com/artworks-abc.jpg",
                "track_count": 5,
                "duration": 300000,
                "permalink_url": "https://soundcloud.com/other/sets/liked",
                "public": true
            }
        }"#;
        let item: LibraryItem = serde_json::from_str(json).unwrap();
        assert_eq!(item.item_type, "playlist-like");
        assert!(item.playlist.is_some());
    }

    #[test]
    fn test_map_owned_playlist() {
        let item = LibraryItem {
            item_type: "playlist".to_string(),
            playlist: Some(LibraryPlaylistRaw {
                id: 100,
                title: "My Playlist".to_string(),
                user: LibraryUserRaw {
                    id: 1,
                    username: "me".to_string(),
                },
                artwork_url: Some("https://artwork.jpg".to_string()),
                track_count: 10,
                duration: 600000,
                permalink_url: "https://soundcloud.com/me/sets/my-playlist".to_string(),
                public: true,
                secret_token: None,
            }),
        };
        let result = map_library_item(&item).unwrap();
        assert!(result.is_owned);
        assert!(result.is_public);
        assert_eq!(result.artwork_url, Some("https://artwork.jpg".to_string()));
    }

    #[test]
    fn test_map_liked_playlist() {
        let item = LibraryItem {
            item_type: "playlist-like".to_string(),
            playlist: Some(LibraryPlaylistRaw {
                id: 200,
                title: "Liked One".to_string(),
                user: LibraryUserRaw {
                    id: 2,
                    username: "someone".to_string(),
                },
                artwork_url: None,
                track_count: 5,
                duration: 300000,
                permalink_url: "https://soundcloud.com/someone/sets/liked".to_string(),
                public: false,
                secret_token: None,
            }),
        };
        let result = map_library_item(&item).unwrap();
        assert!(!result.is_owned);
        assert!(!result.is_public);
        assert!(result.artwork_url.is_none());
    }

    #[test]
    fn test_map_null_artwork_stays_null() {
        let item = LibraryItem {
            item_type: "playlist".to_string(),
            playlist: Some(LibraryPlaylistRaw {
                id: 300,
                title: "No Art".to_string(),
                user: LibraryUserRaw {
                    id: 3,
                    username: "user3".to_string(),
                },
                artwork_url: None,
                track_count: 1,
                duration: 60000,
                permalink_url: "https://soundcloud.com/user3/sets/no-art".to_string(),
                public: true,
                secret_token: None,
            }),
        };
        let result = map_library_item(&item).unwrap();
        assert!(result.artwork_url.is_none());
    }

    #[test]
    fn test_map_item_without_playlist_returns_none() {
        let item = LibraryItem {
            item_type: "track".to_string(),
            playlist: None,
        };
        assert!(map_library_item(&item).is_none());
    }

    #[test]
    fn test_library_error_auth_required_message() {
        let err = LibraryError::AuthRequired;
        assert_eq!(err.to_string(), "Authentication required");
    }

    #[test]
    fn test_library_error_rate_limited_message() {
        let err = LibraryError::RateLimited;
        assert_eq!(err.to_string(), "Rate limited by SoundCloud");
    }

    #[test]
    fn test_library_error_fetch_failed_message() {
        let err = LibraryError::FetchFailed("HTTP 500".to_string());
        assert_eq!(err.to_string(), "Failed to fetch library: HTTP 500");
    }

    #[test]
    fn test_library_error_invalid_response_message() {
        let err = LibraryError::InvalidResponse;
        assert_eq!(err.to_string(), "Invalid response format");
    }

    #[test]
    fn test_library_playlist_serializes_correctly() {
        let playlist = LibraryPlaylist {
            id: 100,
            title: "Test".to_string(),
            username: "user".to_string(),
            artwork_url: None,
            track_count: 5,
            duration: 300000,
            permalink_url: "https://soundcloud.com/user/sets/test".to_string(),
            is_owned: true,
            is_public: true,
            secret_token: None,
        };
        let json = serde_json::to_string(&playlist).unwrap();
        assert!(json.contains("\"id\":100"));
        assert!(json.contains("\"is_owned\":true"));
        assert!(json.contains("\"is_public\":true"));
    }

    #[test]
    fn test_library_cache_get_set_clear() {
        let cache = LibraryCache::default();
        assert!(cache.get_if_complete().is_none());

        let playlists = vec![LibraryPlaylist {
            id: 1,
            title: "Test".to_string(),
            username: "user".to_string(),
            artwork_url: None,
            track_count: 5,
            duration: 300000,
            permalink_url: "https://soundcloud.com/user/sets/test".to_string(),
            is_owned: true,
            is_public: true,
            secret_token: None,
        }];
        cache.set(playlists.clone());

        let cached = cache.get_if_complete().unwrap();
        assert_eq!(cached.len(), 1);
        assert_eq!(cached[0].title, "Test");

        cache.clear();
        assert!(cache.get_if_complete().is_none());
    }

    #[test]
    fn test_library_cache_artwork() {
        let cache = LibraryCache::default();
        assert!(cache.get_artwork(1).is_none());

        cache.set_artwork(1, Some("https://example.com/art.jpg".to_string()));
        assert_eq!(
            cache.get_artwork(1),
            Some(Some("https://example.com/art.jpg".to_string()))
        );

        cache.set_artwork(2, None);
        assert_eq!(cache.get_artwork(2), Some(None));

        cache.clear();
        assert!(cache.get_artwork(1).is_none());
        assert!(cache.get_artwork(2).is_none());
    }

    #[test]
    fn test_library_cache_get_secret_token() {
        let cache = LibraryCache::default();
        cache.set(vec![
            LibraryPlaylist {
                id: 1,
                title: "Public".into(),
                username: "user".into(),
                artwork_url: None,
                track_count: 5,
                duration: 300000,
                permalink_url: "https://soundcloud.com/user/sets/public".into(),
                is_owned: true,
                is_public: true,
                secret_token: None,
            },
            LibraryPlaylist {
                id: 2,
                title: "Private".into(),
                username: "user".into(),
                artwork_url: None,
                track_count: 3,
                duration: 180000,
                permalink_url: "https://soundcloud.com/user/sets/private".into(),
                is_owned: true,
                is_public: false,
                secret_token: Some("s-abc123".into()),
            },
        ]);
        assert_eq!(cache.get_secret_token(1), None);
        assert_eq!(cache.get_secret_token(2), Some("s-abc123".into()));
        assert_eq!(cache.get_secret_token(999), None);
    }
}
