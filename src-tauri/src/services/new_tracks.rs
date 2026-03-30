use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

use crate::services::http::{ApiResponseError, API_V2_BASE, HTTP_CLIENT, RequestBuilderExt, validate_api_response};
use crate::services::playlist::TrackInfo;

#[derive(Debug, Error)]
pub enum NewTracksError {
    #[error("Authentication required")]
    AuthRequired,
    #[error("Rate limited by SoundCloud")]
    RateLimited,
    #[error("Failed to fetch: {0}")]
    FetchFailed(String),
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    #[error("Invalid response")]
    InvalidResponse,
}

impl From<ApiResponseError> for NewTracksError {
    fn from(e: ApiResponseError) -> Self {
        match e {
            ApiResponseError::AuthRequired => NewTracksError::AuthRequired,
            ApiResponseError::RateLimited => NewTracksError::RateLimited,
            _ => NewTracksError::FetchFailed(e.to_string()),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct FollowingsResponse {
    pub collection: Vec<RawFollowedArtist>,
    pub next_href: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RawFollowedArtist {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FollowedArtist {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
    pub has_new_content: bool,
    pub has_original_tracks: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
pub enum ActivityType {
    Track,
    Repost,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ActivityItem {
    pub track: TrackInfo,
    pub activity_type: ActivityType,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
struct StreamResponse {
    collection: Vec<StreamItem>,
    next_href: Option<String>,
}

#[derive(Debug, Deserialize)]
struct StreamItem {
    #[serde(rename = "type")]
    type_field: String,
    created_at: String,
    user: StreamUser,
    track: Option<crate::services::playlist::RawTrackInfo>,
}

#[derive(Debug, Deserialize)]
struct StreamUser {
    id: u64,
}

struct NewTracksCacheInner {
    artists: Option<Vec<FollowedArtist>>,
    activity: HashMap<u64, Vec<ActivityItem>>,
}

impl Default for NewTracksCacheInner {
    fn default() -> Self {
        Self {
            artists: None,
            activity: HashMap::new(),
        }
    }
}

#[derive(Default)]
pub struct NewTracksCache {
    inner: Mutex<NewTracksCacheInner>,
}

impl NewTracksCache {
    pub fn get_artists(&self) -> Option<Vec<FollowedArtist>> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).artists.clone()
    }

    pub fn set_artists(&self, artists: Vec<FollowedArtist>) {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).artists = Some(artists);
    }

    pub fn get_activity(&self, artist_id: u64) -> Option<Vec<ActivityItem>> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).activity.get(&artist_id).cloned()
    }

    pub fn set_activity(&self, artist_id: u64, items: Vec<ActivityItem>) {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).activity.insert(artist_id, items);
    }

    pub fn update_artist_seen(&self, artist_id: u64) {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(ref mut artists) = inner.artists {
            if let Some(artist) = artists.iter_mut().find(|a| a.id == artist_id) {
                artist.has_new_content = false;
            }
        }
    }

    pub fn clear(&self) {
        let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        inner.artists = None;
        inner.activity.clear();
    }
}

#[derive(Default)]
pub struct SeenArtistsState {
    inner: Mutex<HashMap<u64, i64>>,
}

impl SeenArtistsState {
    pub fn load(path: &std::path::Path) -> Self {
        let map = std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        SeenArtistsState {
            inner: Mutex::new(map),
        }
    }

    pub fn get(&self, artist_id: u64) -> Option<i64> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).get(&artist_id).copied()
    }

    pub fn mark_seen(&self, artist_id: u64, timestamp: i64) {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).insert(artist_id, timestamp);
    }

    pub fn to_json(&self) -> Result<String, String> {
        let inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        serde_json::to_string(&*inner)
            .map_err(|e| format!("Failed to serialize seen state: {}", e))
    }

    #[cfg(test)]
    pub fn save(&self, path: &std::path::Path) -> Result<(), String> {
        let json = self.to_json()?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        std::fs::write(path, json)
            .map_err(|e| format!("Failed to write seen state: {}", e))?;
        Ok(())
    }
}

const THIRTY_DAYS_SECS: i64 = 30 * 24 * 60 * 60;
const MAX_STREAM_PAGES: usize = 2;

pub fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn parse_iso_timestamp(s: &str) -> Option<i64> {
    time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339)
        .ok()
        .map(|dt| dt.unix_timestamp())
}

fn is_within_30_days(created_at: &str) -> bool {
    parse_iso_timestamp(created_at)
        .map(|ts| now_unix() - ts <= THIRTY_DAYS_SECS)
        .unwrap_or(false)
}

pub async fn fetch_followed_artists_page(
    oauth_token: &str,
    url: &str,
) -> Result<FollowingsResponse, NewTracksError> {
    let response = HTTP_CLIENT
        .get(url)
        .with_oauth(Some(oauth_token))
        .send()
        .await?;

    validate_api_response(response.status())?;

    response
        .json::<FollowingsResponse>()
        .await
        .map_err(|_| NewTracksError::InvalidResponse)
}

async fn resolve_user_id(
    oauth_token: &str,
    client_id: &str,
) -> Result<u64, NewTracksError> {
    #[derive(Deserialize)]
    struct MeResponse {
        id: u64,
    }

    let url = format!("{}/me?client_id={}", API_V2_BASE, client_id);
    let response = HTTP_CLIENT
        .get(&url)
        .with_oauth(Some(oauth_token))
        .send()
        .await?;

    validate_api_response(response.status())?;

    let me: MeResponse = response
        .json()
        .await
        .map_err(|_| NewTracksError::InvalidResponse)?;

    Ok(me.id)
}

pub async fn fetch_all_followed_artists(
    oauth_token: &str,
    client_id: &str,
) -> Result<Vec<RawFollowedArtist>, NewTracksError> {
    let user_id = resolve_user_id(oauth_token, client_id).await?;

    let mut all_artists = Vec::new();
    let mut url = format!(
        "{}/users/{}/followings?client_id={}&limit=200&linked_partitioning=1",
        API_V2_BASE, user_id, client_id
    );

    loop {
        let page = fetch_followed_artists_page(oauth_token, &url).await?;
        all_artists.extend(page.collection);

        match page.next_href {
            Some(next) => url = next,
            None => break,
        }
    }

    Ok(all_artists)
}

async fn fetch_stream_page(
    oauth_token: &str,
    url: &str,
) -> Result<StreamResponse, NewTracksError> {
    let response = HTTP_CLIENT
        .get(url)
        .with_oauth(Some(oauth_token))
        .send()
        .await?;

    validate_api_response(response.status())?;

    response
        .json::<StreamResponse>()
        .await
        .map_err(|_| NewTracksError::InvalidResponse)
}

pub async fn fetch_stream(
    oauth_token: &str,
) -> Result<HashMap<u64, Vec<ActivityItem>>, NewTracksError> {
    let mut all_items: HashMap<u64, Vec<ActivityItem>> = HashMap::new();
    let mut url = format!("{}/stream?limit=200", API_V2_BASE);

    for _ in 0..MAX_STREAM_PAGES {
        let page = fetch_stream_page(oauth_token, &url).await?;

        for item in page.collection {
            let track = match item.track {
                Some(t) => t,
                None => continue,
            };

            let activity_type = match item.type_field.as_str() {
                "track" => ActivityType::Track,
                "track-repost" => ActivityType::Repost,
                _ => continue,
            };

            if !is_within_30_days(&item.created_at) {
                continue;
            }

            let activity = ActivityItem {
                created_at: item.created_at,
                track: TrackInfo::from(track),
                activity_type,
            };

            all_items.entry(item.user.id).or_default().push(activity);
        }

        match page.next_href {
            Some(next) => url = next,
            None => break,
        }
    }

    for items in all_items.values_mut() {
        items.sort_by(|a, b| {
            let ts_a = parse_iso_timestamp(&a.created_at).unwrap_or(0);
            let ts_b = parse_iso_timestamp(&b.created_at).unwrap_or(0);
            ts_b.cmp(&ts_a)
        });
    }

    Ok(all_items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::playlist::{TrackInfo, UserInfo};

    fn make_artist(id: u64, name: &str) -> FollowedArtist {
        FollowedArtist {
            id,
            username: name.to_string(),
            avatar_url: None,
            has_new_content: true,
            has_original_tracks: true,
        }
    }

    fn make_activity_item(title: &str, activity_type: ActivityType) -> ActivityItem {
        ActivityItem {
            track: TrackInfo {
                id: 1,
                title: title.to_string(),
                user: UserInfo {
                    id: 1,
                    username: "artist".to_string(),
                    avatar_url: None,
                },
                artwork_url: None,
                duration: 180000,
                permalink_url: "https://soundcloud.com/test/track".to_string(),
                waveform_url: None,
                downloadable: false,
                download_url: None,
            },
            activity_type,
            created_at: "2026-03-20T12:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_cache_artists_empty_initially() {
        let cache = NewTracksCache::default();
        assert!(cache.get_artists().is_none());
    }

    #[test]
    fn test_cache_artists_set_and_get() {
        let cache = NewTracksCache::default();
        let artists = vec![make_artist(1, "Ratus"), make_artist(2, "Zomboy")];
        cache.set_artists(artists.clone());
        let result = cache.get_artists().unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].username, "Ratus");
    }

    #[test]
    fn test_cache_activity_empty_initially() {
        let cache = NewTracksCache::default();
        assert!(cache.get_activity(1).is_none());
    }

    #[test]
    fn test_cache_activity_set_and_get() {
        let cache = NewTracksCache::default();
        let items = vec![make_activity_item("Track 1", ActivityType::Track)];
        cache.set_activity(42, items);
        let result = cache.get_activity(42).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].track.title, "Track 1");
    }

    #[test]
    fn test_cache_update_artist_seen() {
        let cache = NewTracksCache::default();
        cache.set_artists(vec![make_artist(1, "Ratus")]);
        cache.update_artist_seen(1);
        let artists = cache.get_artists().unwrap();
        assert!(!artists[0].has_new_content);
    }

    #[test]
    fn test_cache_clear() {
        let cache = NewTracksCache::default();
        cache.set_artists(vec![make_artist(1, "Ratus")]);
        cache.set_activity(1, vec![make_activity_item("Track", ActivityType::Track)]);
        cache.clear();
        assert!(cache.get_artists().is_none());
        assert!(cache.get_activity(1).is_none());
    }

    #[test]
    fn test_seen_state_get_returns_none() {
        let state = SeenArtistsState::default();
        assert!(state.get(1).is_none());
    }

    #[test]
    fn test_seen_state_mark_and_get() {
        let state = SeenArtistsState::default();
        state.mark_seen(42, 1711929600);
        assert_eq!(state.get(42), Some(1711929600));
    }

    #[test]
    fn test_seen_state_save_and_load() {
        let dir = std::env::temp_dir().join("test_seen_state");
        let path = dir.join("seen_artists.json");
        let _ = std::fs::remove_file(&path);

        let state = SeenArtistsState::default();
        state.mark_seen(1, 100);
        state.mark_seen(2, 200);
        state.save(&path).unwrap();

        let loaded = SeenArtistsState::load(&path);
        assert_eq!(loaded.get(1), Some(100));
        assert_eq!(loaded.get(2), Some(200));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_seen_state_load_missing_file() {
        let path = std::path::Path::new("/tmp/nonexistent_seen_artists_test.json");
        let state = SeenArtistsState::load(path);
        assert!(state.get(1).is_none());
    }

    #[test]
    fn test_followings_response_deserializes() {
        let json = serde_json::json!({
            "collection": [
                {
                    "id": 123,
                    "username": "Ratus",
                    "avatar_url": "https://example.com/avatar.jpg"
                },
                {
                    "id": 456,
                    "username": "Zomboy",
                    "avatar_url": null
                }
            ],
            "next_href": "https://api-v2.soundcloud.com/me/followings?cursor=abc"
        });
        let resp: FollowingsResponse = serde_json::from_value(json).unwrap();
        assert_eq!(resp.collection.len(), 2);
        assert_eq!(resp.collection[0].username, "Ratus");
        assert!(resp.next_href.is_some());
    }

    #[test]
    fn test_followings_response_no_next_href() {
        let json = serde_json::json!({
            "collection": [],
            "next_href": null
        });
        let resp: FollowingsResponse = serde_json::from_value(json).unwrap();
        assert!(resp.collection.is_empty());
        assert!(resp.next_href.is_none());
    }

    #[test]
    fn test_stream_response_deserializes() {
        let json = serde_json::json!({
            "collection": [
                {
                    "type": "track-repost",
                    "created_at": "2026-03-20T12:00:00Z",
                    "user": {
                        "id": 123,
                        "username": "Galetek",
                        "avatar_url": "https://example.com/avatar.jpg"
                    },
                    "track": {
                        "id": 789,
                        "title": "Reposted Track",
                        "user": { "username": "OtherArtist", "avatar_url": null },
                        "artwork_url": null,
                        "duration": 240000,
                        "publisher_metadata": null,
                        "permalink_url": "https://soundcloud.com/other/track",
                        "media": { "transcodings": [] },
                        "waveform_url": null,
                        "downloadable": false,
                        "download_url": null
                    }
                },
                {
                    "type": "playlist",
                    "created_at": "2026-03-19T12:00:00Z",
                    "user": {
                        "id": 456,
                        "username": "Someone",
                        "avatar_url": null
                    },
                    "track": null
                }
            ],
            "next_href": "https://api-v2.soundcloud.com/stream?offset=2&limit=200"
        });
        let resp: StreamResponse = serde_json::from_value(json).unwrap();
        assert_eq!(resp.collection.len(), 2);
        assert_eq!(resp.collection[0].type_field, "track-repost");
        assert_eq!(resp.collection[0].user.id, 123);
        assert!(resp.collection[0].track.is_some());
        assert!(resp.collection[1].track.is_none());
        assert!(resp.next_href.is_some());
    }

    #[test]
    fn test_activity_item_serializes() {
        let item = make_activity_item("Test Track", ActivityType::Repost);
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["activity_type"], "Repost");
        assert_eq!(json["track"]["title"], "Test Track");
    }

    #[test]
    fn test_parse_iso_timestamp_valid() {
        let ts = parse_iso_timestamp("2026-03-20T12:00:00Z");
        assert!(ts.is_some());
    }

    #[test]
    fn test_parse_iso_timestamp_invalid() {
        let ts = parse_iso_timestamp("not-a-date");
        assert!(ts.is_none());
    }

    #[test]
    fn test_is_within_30_days_recent() {
        let one_day_ago = now_unix() - 86400;
        let dt = time::OffsetDateTime::from_unix_timestamp(one_day_ago).unwrap();
        let iso = dt.format(&time::format_description::well_known::Rfc3339).unwrap();
        assert!(is_within_30_days(&iso));
    }

    #[test]
    fn test_is_within_30_days_old() {
        let sixty_days_ago = now_unix() - 60 * 24 * 60 * 60;
        let dt = time::OffsetDateTime::from_unix_timestamp(sixty_days_ago).unwrap();
        let iso = dt.format(&time::format_description::well_known::Rfc3339).unwrap();
        assert!(!is_within_30_days(&iso));
    }
}
