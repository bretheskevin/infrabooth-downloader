use std::sync::Mutex;

use serde::Deserialize;

use crate::models::error::ScApiError;
use crate::services::http::{validate_api_response, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT, SC_APP_VERSION};
use crate::services::playlist::TrackInfo;

#[derive(Debug, Deserialize)]
struct LikedTracksResponse {
    collection: Vec<LikedTrackItem>,
    next_href: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LikedTrackItem {
    track: LikedTrackRaw,
}

#[derive(Debug, Deserialize)]
struct LikedTrackRaw {
    id: u64,
    title: String,
    user: LikedTrackUser,
    artwork_url: Option<String>,
    duration: u64,
    permalink_url: String,
    waveform_url: Option<String>,
    #[serde(default)]
    downloadable: bool,
    download_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LikedTrackUser {
    id: u64,
    username: String,
    avatar_url: Option<String>,
}

struct LikedTracksPageResponse {
    tracks: Vec<TrackInfo>,
    next_cursor: Option<String>,
}

pub struct LikedTracksCache {
    inner: Mutex<LikedTracksCacheInner>,
}

struct LikedTracksCacheInner {
    tracks: Vec<TrackInfo>,
    complete: bool,
}

impl Default for LikedTracksCache {
    fn default() -> Self {
        Self { inner: Mutex::new(LikedTracksCacheInner { tracks: Vec::new(), complete: false }) }
    }
}

impl LikedTracksCache {
    pub fn get_if_complete(&self) -> Option<Vec<TrackInfo>> {
        let inner = self.inner.lock().expect("LikedTracksCache lock poisoned");
        if inner.complete {
            Some(inner.tracks.clone())
        } else {
            None
        }
    }

    pub fn set(&self, tracks: Vec<TrackInfo>) {
        let mut inner = self.inner.lock().expect("LikedTracksCache lock poisoned");
        inner.tracks = tracks;
        inner.complete = true;
    }

    pub fn clear(&self) {
        let mut inner = self.inner.lock().expect("LikedTracksCache lock poisoned");
        inner.tracks.clear();
        inner.complete = false;
    }
}

fn map_track(item: LikedTrackItem) -> TrackInfo {
    TrackInfo {
        id: item.track.id,
        title: item.track.title,
        user: crate::services::playlist::UserInfo { id: item.track.user.id, username: item.track.user.username, avatar_url: item.track.user.avatar_url },
        artwork_url: item.track.artwork_url,
        duration: item.track.duration,
        permalink_url: item.track.permalink_url,
        waveform_url: item.track.waveform_url,
        downloadable: item.track.downloadable,
        download_url: item.track.download_url,
    }
}

async fn fetch_liked_tracks_page(oauth_token: &str, client_id: &str, user_id: u64, cursor: Option<String>) -> Result<LikedTracksPageResponse, ScApiError> {
    let url = match cursor {
        Some(ref next_href) => next_href.clone(),
        None => format!(
            "{}/users/{}/track_likes?client_id={}&limit=50&linked_partitioning=1&app_version={}&app_locale=en",
            API_V2_BASE, user_id, client_id, SC_APP_VERSION
        ),
    };

    let response = HTTP_CLIENT.get(&url).with_oauth(Some(oauth_token)).send().await?;

    validate_api_response(response.status())?;

    let data: LikedTracksResponse = response.json().await.map_err(|_| ScApiError::InvalidResponse)?;

    let tracks: Vec<TrackInfo> = data.collection.into_iter().map(map_track).collect();

    Ok(LikedTracksPageResponse { tracks, next_cursor: data.next_href })
}

pub async fn fetch_all_liked_tracks<F>(oauth_token: &str, client_id: &str, user_id: u64, on_batch: F) -> Result<Vec<TrackInfo>, ScApiError>
where
    F: Fn(&[TrackInfo]),
{
    let mut all_tracks = Vec::new();
    let mut cursor = None;

    loop {
        let page = fetch_liked_tracks_page(oauth_token, client_id, user_id, cursor).await?;
        on_batch(&page.tracks);
        all_tracks.extend(page.tracks);

        match page.next_cursor {
            Some(next) => cursor = Some(next),
            None => break,
        }
    }

    log::info!("[fetch_all_liked_tracks] Fetched {} total liked tracks", all_tracks.len());
    Ok(all_tracks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_liked_tracks_response_deserializes() {
        let json = r#"{
            "collection": [
                {
                    "created_at": "2026-04-01T10:00:00Z",
                    "track": {
                        "id": 123456,
                        "title": "Test Track",
                        "user": { "id": 789, "username": "artist", "avatar_url": null },
                        "artwork_url": "https://i1.sndcdn.com/artworks-abc.jpg",
                        "duration": 180000,
                        "permalink_url": "https://soundcloud.com/artist/test-track",
                        "waveform_url": null,
                        "downloadable": false,
                        "download_url": null
                    }
                }
            ],
            "next_href": "https://api-v2.soundcloud.com/me/track_likes?offset=abc"
        }"#;
        let response: LikedTracksResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.collection.len(), 1);
        assert_eq!(response.collection[0].track.title, "Test Track");
        assert!(response.next_href.is_some());
    }

    #[test]
    fn test_map_track() {
        let item = LikedTrackItem {
            track: LikedTrackRaw {
                id: 100,
                title: "My Track".to_string(),
                user: LikedTrackUser { id: 1, username: "artist".to_string(), avatar_url: Some("https://avatar.jpg".to_string()) },
                artwork_url: Some("https://artwork.jpg".to_string()),
                duration: 240000,
                permalink_url: "https://soundcloud.com/artist/my-track".to_string(),
                waveform_url: None,
                downloadable: true,
                download_url: Some("https://download.url".to_string()),
            },
        };
        let track = map_track(item);
        assert_eq!(track.id, 100);
        assert_eq!(track.title, "My Track");
        assert_eq!(track.user.username, "artist");
        assert!(track.downloadable);
    }

    #[test]
    fn test_liked_tracks_cache() {
        let cache = LikedTracksCache::default();
        assert!(cache.get_if_complete().is_none());

        let tracks = vec![TrackInfo {
            id: 1,
            title: "Test".to_string(),
            user: crate::services::playlist::UserInfo { id: 1, username: "user".to_string(), avatar_url: None },
            artwork_url: None,
            duration: 1000,
            permalink_url: "https://soundcloud.com/user/test".to_string(),
            waveform_url: None,
            downloadable: false,
            download_url: None,
        }];
        cache.set(tracks.clone());

        let cached = cache.get_if_complete().unwrap();
        assert_eq!(cached.len(), 1);
        assert_eq!(cached[0].title, "Test");

        cache.clear();
        assert!(cache.get_if_complete().is_none());
    }
}
