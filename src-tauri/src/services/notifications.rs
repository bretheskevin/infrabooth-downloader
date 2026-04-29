use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::models::error::ScApiError;
use crate::services::http::{validate_api_response, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT};
use crate::services::playlist::{RawTrackInfo, RawUserInfo, TrackInfo, UserInfo};

// ---------------------------------------------------------------------------
// Frontend-facing types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ActorInfo {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
    pub permalink_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlaylistSummary {
    pub id: u64,
    pub title: String,
    pub artwork_url: Option<String>,
    pub permalink_url: String,
    pub track_count: u32,
    pub user: UserInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum NotificationItem {
    Affiliation { id: String, created_at: String, actor: ActorInfo },
    TrackLike { id: String, created_at: String, actor: ActorInfo, track: TrackInfo },
    TrackRepost { id: String, created_at: String, actor: ActorInfo, track: TrackInfo },
    Comment { id: String, created_at: String, actor: ActorInfo, track: TrackInfo, body: String },
    Mention { id: String, created_at: String, actor: ActorInfo, track: TrackInfo, body: String },
    PlaylistLike { id: String, created_at: String, actor: ActorInfo, playlist: PlaylistSummary },
    PlaylistRepost { id: String, created_at: String, actor: ActorInfo, playlist: PlaylistSummary },
}

impl NotificationItem {
    pub fn created_at(&self) -> &str {
        match self {
            NotificationItem::Affiliation { created_at, .. }
            | NotificationItem::TrackLike { created_at, .. }
            | NotificationItem::TrackRepost { created_at, .. }
            | NotificationItem::Comment { created_at, .. }
            | NotificationItem::Mention { created_at, .. }
            | NotificationItem::PlaylistLike { created_at, .. }
            | NotificationItem::PlaylistRepost { created_at, .. } => created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NotificationsPage {
    pub items: Vec<NotificationItem>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UnreadCountResult {
    pub unread: bool,
    pub latest_created_at: Option<String>,
}

// ---------------------------------------------------------------------------
// Raw deserialization (private)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RawActivitiesPage {
    collection: Vec<RawActivity>,
    next_href: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawActivity {
    #[serde(rename = "type")]
    type_field: String,
    created_at: String,
    uuid: String,
    user: RawSoundCloudUser,
    #[serde(default)]
    track: Option<RawTrackInfo>,
    #[serde(default)]
    playlist: Option<RawPlaylistSummary>,
    #[serde(default)]
    comment: Option<RawComment>,
}

#[derive(Debug, Deserialize)]
struct RawSoundCloudUser {
    id: u64,
    username: String,
    avatar_url: Option<String>,
    #[serde(default)]
    permalink_url: Option<String>,
}

impl From<RawSoundCloudUser> for ActorInfo {
    fn from(u: RawSoundCloudUser) -> Self {
        ActorInfo { id: u.id, username: u.username, avatar_url: u.avatar_url, permalink_url: u.permalink_url.unwrap_or_default() }
    }
}

impl From<RawPlaylistSummary> for PlaylistSummary {
    fn from(p: RawPlaylistSummary) -> Self {
        PlaylistSummary {
            id: p.id,
            title: p.title,
            artwork_url: p.artwork_url,
            permalink_url: p.permalink_url,
            track_count: p.track_count,
            user: UserInfo { id: p.user.id, username: p.user.username, avatar_url: p.user.avatar_url },
        }
    }
}

#[derive(Debug, Deserialize)]
struct RawPlaylistSummary {
    id: u64,
    title: String,
    artwork_url: Option<String>,
    #[serde(default)]
    permalink_url: String,
    #[serde(default)]
    track_count: u32,
    user: RawUserInfo,
}

#[derive(Debug, Deserialize)]
struct RawComment {
    body: String,
    #[serde(default)]
    track: Option<RawTrackInfo>,
}

// ---------------------------------------------------------------------------
// Raw → Typed conversion
// ---------------------------------------------------------------------------

fn convert_activity(raw: RawActivity) -> Option<NotificationItem> {
    let actor: ActorInfo = raw.user.into();
    let id = raw.uuid;
    let created_at = raw.created_at;

    match raw.type_field.as_str() {
        "affiliation" => Some(NotificationItem::Affiliation { id, created_at, actor }),

        "track-like" => {
            let track = TrackInfo::from(raw.track?);
            Some(NotificationItem::TrackLike { id, created_at, actor, track })
        }
        "track-repost" => {
            let track = TrackInfo::from(raw.track?);
            Some(NotificationItem::TrackRepost { id, created_at, actor, track })
        }

        "comment" => {
            let comment = raw.comment?;
            let track = TrackInfo::from(comment.track?);
            Some(NotificationItem::Comment { id, created_at, actor, track, body: comment.body })
        }
        "mention" => {
            let comment = raw.comment?;
            let track = TrackInfo::from(comment.track?);
            Some(NotificationItem::Mention { id, created_at, actor, track, body: comment.body })
        }

        "playlist-like" => {
            let playlist = PlaylistSummary::from(raw.playlist?);
            Some(NotificationItem::PlaylistLike { id, created_at, actor, playlist })
        }
        "playlist-repost" => {
            let playlist = PlaylistSummary::from(raw.playlist?);
            Some(NotificationItem::PlaylistRepost { id, created_at, actor, playlist })
        }

        unknown => {
            log::warn!("[notifications] Unknown activity type: {}", unknown);
            None
        }
    }
}

fn extract_cursor_from_next_href(next_href: &str) -> Option<String> {
    url::Url::parse(next_href).ok()?.query_pairs().find(|(key, _)| key == "offset").map(|(_, value)| value.into_owned())
}

fn convert_page(raw: RawActivitiesPage) -> NotificationsPage {
    let items: Vec<NotificationItem> = raw.collection.into_iter().filter_map(convert_activity).collect();
    let next_cursor = raw.next_href.as_deref().and_then(extract_cursor_from_next_href);
    NotificationsPage { items, next_cursor }
}

// ---------------------------------------------------------------------------
// Unread helper
// ---------------------------------------------------------------------------

pub fn has_unread(latest_created_at: Option<i64>, last_seen: Option<i64>) -> bool {
    match (latest_created_at, last_seen) {
        (Some(latest), Some(seen)) => latest > seen,
        (Some(_), None) => true,
        _ => false,
    }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

pub const UNREAD_PROBE_TTL: Duration = Duration::from_secs(90);
pub const FIRST_PAGE_TTL: Duration = Duration::from_secs(120);

struct CachedPage {
    page: NotificationsPage,
    fetched_at: Instant,
}

#[derive(Default)]
struct NotificationsCacheInner {
    first_page: Option<CachedPage>,
    unread_probe: Option<UnreadProbe>,
}

struct UnreadProbe {
    latest_created_at: Option<i64>,
    fetched_at: Instant,
}

#[derive(Default)]
pub struct NotificationsCache {
    inner: Mutex<Option<NotificationsCacheInner>>,
}

impl NotificationsCache {
    fn lock(&self) -> std::sync::MutexGuard<'_, Option<NotificationsCacheInner>> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn get_first_page(&self, ttl: Duration) -> Option<NotificationsPage> {
        let guard = self.lock();
        let cached = guard.as_ref()?.first_page.as_ref()?;
        if cached.fetched_at.elapsed() > ttl {
            return None;
        }
        Some(cached.page.clone())
    }

    pub fn set_first_page(&self, page: NotificationsPage) {
        let mut guard = self.lock();
        let inner = guard.get_or_insert_with(Default::default);
        inner.first_page = Some(CachedPage { page, fetched_at: Instant::now() });
    }

    pub fn clear_first_page(&self) {
        let mut guard = self.lock();
        if let Some(inner) = guard.as_mut() {
            inner.first_page = None;
        }
    }

    pub fn get_unread_probe(&self, ttl: Duration) -> Option<Option<i64>> {
        let guard = self.lock();
        let probe = guard.as_ref()?.unread_probe.as_ref()?;
        if probe.fetched_at.elapsed() > ttl {
            return None;
        }
        Some(probe.latest_created_at)
    }

    pub fn set_unread_probe(&self, latest_created_at: Option<i64>) {
        let mut guard = self.lock();
        let inner = guard.get_or_insert_with(Default::default);
        inner.unread_probe = Some(UnreadProbe { latest_created_at, fetched_at: Instant::now() });
    }

    pub fn clear(&self) {
        *self.lock() = None;
    }
}

// ---------------------------------------------------------------------------
// Persisted seen state
// ---------------------------------------------------------------------------

#[derive(Default, Serialize, Deserialize)]
struct LastSeenInner {
    last_seen_at: Option<i64>,
}

#[derive(Default)]
pub struct LastSeenActivityState {
    inner: Mutex<LastSeenInner>,
}

impl LastSeenActivityState {
    fn lock(&self) -> std::sync::MutexGuard<'_, LastSeenInner> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn load(path: &std::path::Path) -> Self {
        let data = match std::fs::read_to_string(path) {
            Ok(s) => s,
            Err(_) => return LastSeenActivityState::default(),
        };
        match serde_json::from_str::<LastSeenInner>(&data) {
            Ok(inner) => LastSeenActivityState { inner: Mutex::new(inner) },
            Err(_) => LastSeenActivityState::default(),
        }
    }

    pub fn get(&self) -> Option<i64> {
        self.lock().last_seen_at
    }

    pub fn set(&self, ts: i64) {
        self.lock().last_seen_at = Some(ts);
    }

    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string(&*self.lock()).map_err(|e| format!("Failed to serialize seen state: {}", e))
    }

    pub fn clear_and_persist(&self, path: &std::path::Path) -> Result<(), String> {
        self.lock().last_seen_at = None;
        let json = self.to_json()?;
        std::fs::write(path, json).map_err(|e| format!("Failed to write seen state: {}", e))?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

pub async fn fetch_activities_page(oauth_token: &str, client_id: &str, cursor: Option<&str>, limit: u32) -> Result<NotificationsPage, ScApiError> {
    let url = match cursor {
        Some(c) => format!("{}/activities?offset={}&limit={}&client_id={}&linked_partitioning=1", API_V2_BASE, urlencoding::encode(c), limit, client_id,),
        None => format!("{}/activities?limit={}&client_id={}&linked_partitioning=1", API_V2_BASE, limit, client_id,),
    };

    let response = HTTP_CLIENT.get(&url).with_oauth(Some(oauth_token)).send().await?;
    validate_api_response(response.status())?;

    let raw: RawActivitiesPage = response.json().await.map_err(|_| ScApiError::InvalidResponse)?;

    Ok(convert_page(raw))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_raw_user() -> serde_json::Value {
        serde_json::json!({
            "id": 123,
            "username": "TestUser",
            "avatar_url": "https://i1.sndcdn.com/avatars-test-large.jpg",
            "permalink_url": "https://soundcloud.com/testuser"
        })
    }

    fn make_raw_track() -> serde_json::Value {
        serde_json::json!({
            "id": 789,
            "title": "Test Track",
            "user": { "id": 100, "username": "TrackArtist", "avatar_url": null },
            "artwork_url": "https://i1.sndcdn.com/artworks-test-large.jpg",
            "duration": 240000,
            "publisher_metadata": null,
            "permalink_url": "https://soundcloud.com/artist/test-track",
            "media": { "transcodings": [] },
            "waveform_url": null,
            "downloadable": false,
            "download_url": null
        })
    }

    fn make_raw_playlist() -> serde_json::Value {
        serde_json::json!({
            "id": 456,
            "title": "Test Playlist",
            "artwork_url": "https://i1.sndcdn.com/artworks-playlist-large.jpg",
            "permalink_url": "https://soundcloud.com/artist/sets/test-playlist",
            "track_count": 12,
            "user": { "id": 100, "username": "PlaylistOwner", "avatar_url": null }
        })
    }

    #[test]
    fn test_deserialize_affiliation() {
        let json = serde_json::json!({
            "type": "affiliation",
            "created_at": "2026-04-12T02:01:47Z",
            "uuid": "uuid-1",
            "user": make_raw_user(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        match item {
            NotificationItem::Affiliation { id, actor, .. } => {
                assert_eq!(id, "uuid-1");
                assert_eq!(actor.username, "TestUser");
            }
            _ => panic!("Expected Affiliation"),
        }
    }

    #[test]
    fn test_deserialize_track_like() {
        let json = serde_json::json!({
            "type": "track-like",
            "created_at": "2026-04-12T02:01:41Z",
            "uuid": "uuid-2",
            "user": make_raw_user(),
            "track": make_raw_track(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        match item {
            NotificationItem::TrackLike { track, .. } => {
                assert_eq!(track.title, "Test Track");
            }
            _ => panic!("Expected TrackLike"),
        }
    }

    #[test]
    fn test_deserialize_track_repost() {
        let json = serde_json::json!({
            "type": "track-repost",
            "created_at": "2026-04-12T02:01:41Z",
            "uuid": "uuid-3",
            "user": make_raw_user(),
            "track": make_raw_track(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        assert!(matches!(item, NotificationItem::TrackRepost { .. }));
    }

    #[test]
    fn test_deserialize_comment_flattens_nested_track() {
        let json = serde_json::json!({
            "type": "comment",
            "created_at": "2026-04-12T02:00:00Z",
            "uuid": "uuid-4",
            "user": make_raw_user(),
            "comment": {
                "body": "Nice track!",
                "track": make_raw_track(),
            },
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        match item {
            NotificationItem::Comment { body, track, .. } => {
                assert_eq!(body, "Nice track!");
                assert_eq!(track.title, "Test Track");
            }
            _ => panic!("Expected Comment"),
        }
    }

    #[test]
    fn test_deserialize_mention_with_body() {
        let json = serde_json::json!({
            "type": "mention",
            "created_at": "2026-04-12T01:00:00Z",
            "uuid": "uuid-5",
            "user": make_raw_user(),
            "comment": {
                "body": "@you great stuff",
                "track": make_raw_track(),
            },
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        match item {
            NotificationItem::Mention { body, .. } => {
                assert_eq!(body, "@you great stuff");
            }
            _ => panic!("Expected Mention"),
        }
    }

    #[test]
    fn test_deserialize_playlist_like() {
        let json = serde_json::json!({
            "type": "playlist-like",
            "created_at": "2026-04-12T00:00:00Z",
            "uuid": "uuid-6",
            "user": make_raw_user(),
            "playlist": make_raw_playlist(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        match item {
            NotificationItem::PlaylistLike { playlist, .. } => {
                assert_eq!(playlist.title, "Test Playlist");
                assert_eq!(playlist.track_count, 12);
            }
            _ => panic!("Expected PlaylistLike"),
        }
    }

    #[test]
    fn test_deserialize_playlist_repost() {
        let json = serde_json::json!({
            "type": "playlist-repost",
            "created_at": "2026-04-11T23:00:00Z",
            "uuid": "uuid-7",
            "user": make_raw_user(),
            "playlist": make_raw_playlist(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        let item = convert_activity(raw).unwrap();
        assert!(matches!(item, NotificationItem::PlaylistRepost { .. }));
    }

    #[test]
    fn test_unknown_type_is_skipped() {
        let json = serde_json::json!({
            "type": "some-future-type",
            "created_at": "2026-04-12T00:00:00Z",
            "uuid": "uuid-unknown",
            "user": make_raw_user(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        assert!(convert_activity(raw).is_none());
    }

    #[test]
    fn test_track_like_without_track_is_skipped() {
        let json = serde_json::json!({
            "type": "track-like",
            "created_at": "2026-04-12T00:00:00Z",
            "uuid": "uuid-bad",
            "user": make_raw_user(),
        });
        let raw: RawActivity = serde_json::from_value(json).unwrap();
        assert!(convert_activity(raw).is_none());
    }

    #[test]
    fn test_has_unread_both_present_newer() {
        assert!(has_unread(Some(200), Some(100)));
    }

    #[test]
    fn test_has_unread_both_present_older() {
        assert!(!has_unread(Some(100), Some(200)));
    }

    #[test]
    fn test_has_unread_never_seen() {
        assert!(has_unread(Some(100), None));
    }

    #[test]
    fn test_has_unread_no_activities() {
        assert!(!has_unread(None, Some(100)));
        assert!(!has_unread(None, None));
    }

    #[test]
    fn test_extract_cursor_from_next_href() {
        let url = "https://api-v2.soundcloud.com/activities?offset=2026-04-02T07%3A03%3A49.975Z%2Cusers-tracks-likes%2C000&limit=10";
        let cursor = extract_cursor_from_next_href(url).unwrap();
        assert_eq!(cursor, "2026-04-02T07:03:49.975Z,users-tracks-likes,000");
    }

    #[test]
    fn test_extract_cursor_from_next_href_no_offset() {
        assert!(extract_cursor_from_next_href("https://example.com?limit=10").is_none());
    }

    #[test]
    fn test_convert_page_filters_unknown_types() {
        let raw = RawActivitiesPage {
            collection: vec![
                serde_json::from_value(serde_json::json!({
                    "type": "affiliation",
                    "created_at": "2026-04-12T02:00:00Z",
                    "uuid": "uuid-ok",
                    "user": make_raw_user(),
                }))
                .unwrap(),
                serde_json::from_value(serde_json::json!({
                    "type": "future-type",
                    "created_at": "2026-04-12T01:00:00Z",
                    "uuid": "uuid-bad",
                    "user": make_raw_user(),
                }))
                .unwrap(),
            ],
            next_href: Some("https://api-v2.soundcloud.com/activities?offset=cursor123&limit=10".to_string()),
        };
        let page = convert_page(raw);
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.next_cursor.as_deref(), Some("cursor123"));
    }

    const TEST_TTL: Duration = Duration::from_secs(60);

    #[test]
    fn test_cache_default_is_empty() {
        let cache = NotificationsCache::default();
        assert!(cache.get_first_page(TEST_TTL).is_none());
        assert!(cache.get_unread_probe(TEST_TTL).is_none());
    }

    #[test]
    fn test_cache_set_and_get_first_page() {
        let cache = NotificationsCache::default();
        let page = NotificationsPage { items: vec![], next_cursor: Some("c1".into()) };
        cache.set_first_page(page);
        let got = cache.get_first_page(TEST_TTL).unwrap();
        assert_eq!(got.next_cursor.as_deref(), Some("c1"));
    }

    #[test]
    fn test_cache_first_page_expires() {
        let cache = NotificationsCache::default();
        let page = NotificationsPage { items: vec![], next_cursor: None };
        cache.set_first_page(page);
        assert!(cache.get_first_page(Duration::ZERO).is_none());
    }

    #[test]
    fn test_cache_set_and_get_unread_probe() {
        let cache = NotificationsCache::default();
        cache.set_unread_probe(Some(12345));
        assert_eq!(cache.get_unread_probe(TEST_TTL), Some(Some(12345)));
    }

    #[test]
    fn test_cache_unread_probe_expires() {
        let cache = NotificationsCache::default();
        cache.set_unread_probe(Some(12345));
        assert!(cache.get_unread_probe(Duration::ZERO).is_none());
    }

    #[test]
    fn test_cache_clear_first_page() {
        let cache = NotificationsCache::default();
        let page = NotificationsPage { items: vec![], next_cursor: None };
        cache.set_first_page(page);
        cache.clear_first_page();
        assert!(cache.get_first_page(TEST_TTL).is_none());
    }

    #[test]
    fn test_cache_clear() {
        let cache = NotificationsCache::default();
        cache.set_unread_probe(Some(100));
        cache.clear();
        assert!(cache.get_unread_probe(TEST_TTL).is_none());
    }

    #[test]
    fn test_last_seen_state_default() {
        let state = LastSeenActivityState::default();
        assert!(state.get().is_none());
    }

    #[test]
    fn test_last_seen_state_set_and_get() {
        let state = LastSeenActivityState::default();
        state.set(1712800000);
        assert_eq!(state.get(), Some(1712800000));
    }

    #[test]
    fn test_last_seen_state_load_missing_file() {
        let path = std::path::Path::new("/tmp/nonexistent_seen_activities_test.json");
        let state = LastSeenActivityState::load(path);
        assert!(state.get().is_none());
    }

    #[test]
    fn test_last_seen_state_roundtrip() {
        let dir = std::env::temp_dir().join("test_seen_activities");
        let path = dir.join("seen_activities.json");
        let _ = std::fs::remove_file(&path);
        std::fs::create_dir_all(&dir).ok();

        let state = LastSeenActivityState::default();
        state.set(999);
        let json = state.to_json().unwrap();
        std::fs::write(&path, json).unwrap();

        let loaded = LastSeenActivityState::load(&path);
        assert_eq!(loaded.get(), Some(999));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_last_seen_state_clear_and_persist() {
        let dir = std::env::temp_dir().join("test_seen_activities_clear");
        let path = dir.join("seen_activities.json");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).ok();

        let state = LastSeenActivityState::default();
        state.set(999);
        state.clear_and_persist(&path).unwrap();
        assert!(state.get().is_none());

        let loaded = LastSeenActivityState::load(&path);
        assert!(loaded.get().is_none());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
