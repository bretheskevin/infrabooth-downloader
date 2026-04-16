use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::services::http::{validate_api_response, ApiResponseError, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT};

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

#[derive(Debug, thiserror::Error)]
pub enum MessagesError {
    #[error("Authentication required")]
    AuthRequired,
    #[error("Rate limited by SoundCloud")]
    RateLimited,
    #[error("Failed to fetch: {0}")]
    FetchFailed(String),
    #[error("Network error: {0}")]
    NetworkError(#[from] rquest::Error),
    #[error("Invalid response")]
    InvalidResponse,
}

impl From<ApiResponseError> for MessagesError {
    fn from(e: ApiResponseError) -> Self {
        match e {
            ApiResponseError::AuthRequired => MessagesError::AuthRequired,
            ApiResponseError::RateLimited => MessagesError::RateLimited,
            _ => MessagesError::FetchFailed(e.to_string()),
        }
    }
}

// ---------------------------------------------------------------------------
// Frontend-facing types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MessageUser {
    pub id: u64,
    pub username: String,
    pub avatar_url: Option<String>,
    pub permalink_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MessageTrackEmbed {
    pub id: u64,
    pub title: String,
    pub artist: String,
    pub artist_id: u64,
    pub artwork_url: Option<String>,
    pub waveform_url: Option<String>,
    pub duration_ms: u64,
    pub permalink_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MessagePlaylistEmbed {
    pub id: u64,
    pub title: String,
    pub artist: String,
    pub artist_id: u64,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub permalink_url: String,
    pub secret_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "kind")]
pub enum MessageEmbed {
    Track(MessageTrackEmbed),
    Playlist(MessagePlaylistEmbed),
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ConversationSummary {
    pub id: String,
    pub other_user: MessageUser,
    pub last_message_content: String,
    pub last_message_sender_id: u64,
    pub last_message_at: String,
    pub read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ConversationMessage {
    pub content: String,
    pub sender_id: u64,
    pub sent_at: String,
    pub track_embed: Option<MessageTrackEmbed>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ConversationsPage {
    pub items: Vec<ConversationSummary>,
    pub current_user_id: u64,
    pub next_offset: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MessagesPage {
    pub items: Vec<ConversationMessage>,
    pub other_user: MessageUser,
    pub current_user_id: u64,
    pub next_offset: Option<u32>,
}

// ---------------------------------------------------------------------------
// Raw API types (deserialization)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RawSender {
    id: u64,
    username: String,
    avatar_url: Option<String>,
    permalink_url: String,
}

#[derive(Debug, Deserialize)]
struct RawLastMessage {
    content: String,
    sender: RawSender,
    sent_at: String,
}

#[derive(Debug, Deserialize)]
struct RawConversation {
    id: String,
    last_message: RawLastMessage,
    read: bool,
    users: Vec<RawSender>,
}

#[derive(Debug, Deserialize)]
struct RawMessage {
    content: String,
    sender: RawSender,
    sent_at: String,
}

#[derive(Debug, Deserialize)]
struct RawPaginatedResponse<T> {
    collection: Vec<T>,
    next_href: Option<String>,
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

fn raw_sender_to_user(s: &RawSender) -> MessageUser {
    MessageUser { id: s.id, username: s.username.clone(), avatar_url: s.avatar_url.clone(), permalink_url: s.permalink_url.clone() }
}

fn extract_offset_from_next_href(next_href: &str) -> Option<u32> {
    rquest::Url::parse(next_href)
        .ok()?
        .query_pairs()
        .find(|(k, _)| k == "offset")
        .and_then(|(_, v)| v.parse().ok())
}

fn convert_conversations(raw: RawPaginatedResponse<RawConversation>, current_user_id: u64) -> ConversationsPage {
    let items = raw
        .collection
        .into_iter()
        .filter_map(|conv| {
            let other_user = conv.users.iter().find(|u| u.id != current_user_id).map(raw_sender_to_user)?;

            Some(ConversationSummary {
                id: conv.id,
                other_user,
                last_message_content: conv.last_message.content,
                last_message_sender_id: conv.last_message.sender.id,
                last_message_at: conv.last_message.sent_at,
                read: conv.read,
            })
        })
        .collect();

    let next_offset = raw.next_href.as_deref().and_then(extract_offset_from_next_href);

    ConversationsPage { items, current_user_id, next_offset }
}

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

async fn resolve_embed(url: &str, client_id: &str, oauth_token: &str) -> Option<MessageEmbed> {
    use crate::services::http::{expand_short_link, resolve_sc_url};
    use crate::services::playlist::{RawTrackInfo, RawUserInfo};

    let expanded = if url.contains("on.soundcloud.com") {
        expand_short_link(url).await.ok()?
    } else {
        url.to_string()
    };

    let value: serde_json::Value = resolve_sc_url(&expanded, client_id, Some(oauth_token)).await.ok()?;
    let kind = value.get("kind")?.as_str()?;

    match kind {
        "track" => {
            let track: RawTrackInfo = serde_json::from_value(value).ok()?;
            Some(MessageEmbed::Track(MessageTrackEmbed {
                id: track.id,
                title: track.title,
                artist: track.user.username,
                artist_id: track.user.id,
                artwork_url: track.artwork_url,
                waveform_url: track.waveform_url,
                duration_ms: track.duration,
                permalink_url: track.permalink_url,
            }))
        }
        "playlist" => {
            #[derive(serde::Deserialize)]
            struct RawPlaylistTrack {
                artwork_url: Option<String>,
            }
            #[derive(serde::Deserialize)]
            struct RawPlaylist {
                id: u64,
                title: String,
                user: RawUserInfo,
                artwork_url: Option<String>,
                #[serde(default)]
                track_count: u32,
                #[serde(default)]
                permalink_url: String,
                secret_token: Option<String>,
                #[serde(default)]
                tracks: Vec<RawPlaylistTrack>,
            }
            let playlist: RawPlaylist = serde_json::from_value(value).ok()?;
            let artwork = playlist
                .artwork_url
                .or_else(|| playlist.tracks.iter().find_map(|t| t.artwork_url.clone()));
            Some(MessageEmbed::Playlist(MessagePlaylistEmbed {
                id: playlist.id,
                title: playlist.title,
                artist: playlist.user.username,
                artist_id: playlist.user.id,
                artwork_url: artwork,
                track_count: playlist.track_count,
                permalink_url: playlist.permalink_url,
                secret_token: playlist.secret_token,
            }))
        }
        _ => None,
    }
}

fn convert_messages(raw: RawPaginatedResponse<RawMessage>, other_user_id: u64, current_user_id: u64) -> MessagesPage {
    let other_user = raw
        .collection
        .iter()
        .find(|m| m.sender.id == other_user_id)
        .map(|m| raw_sender_to_user(&m.sender))
        .unwrap_or(MessageUser { id: other_user_id, username: String::new(), avatar_url: None, permalink_url: String::new() });

    let items = raw
        .collection
        .into_iter()
        .map(|msg| ConversationMessage { content: msg.content, sender_id: msg.sender.id, sent_at: msg.sent_at, track_embed: None })
        .collect();

    let next_offset = raw.next_href.as_deref().and_then(extract_offset_from_next_href);

    MessagesPage { items, other_user, current_user_id, next_offset }
}

pub async fn resolve_embed_cached(cache: &MessagesCache, url: &str, client_id: &str, oauth_token: &str) -> Option<MessageEmbed> {
    if let Some(cached) = cache.get_embed(url) {
        return Some(cached);
    }
    let embed = resolve_embed(url, client_id, oauth_token).await?;
    cache.set_embed(url.to_string(), embed.clone());
    Some(embed)
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

pub const CONVERSATIONS_TTL: Duration = Duration::from_secs(120);
const UNREAD_TTL: Duration = Duration::from_secs(120);
const MAX_EMBED_CACHE_SIZE: usize = 500;

struct CachedConversations {
    page: ConversationsPage,
    fetched_at: Instant,
}

struct CachedUnread {
    has_unread: bool,
    fetched_at: Instant,
}

#[derive(Default)]
struct MessagesCacheInner {
    first_conversations_page: Option<CachedConversations>,
    unread: Option<CachedUnread>,
    embed_cache: HashMap<String, MessageEmbed>,
}

#[derive(Default)]
pub struct MessagesCache {
    inner: Mutex<Option<MessagesCacheInner>>,
}

impl MessagesCache {
    fn lock(&self) -> std::sync::MutexGuard<'_, Option<MessagesCacheInner>> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn get_first_conversations_page(&self, ttl: Duration) -> Option<ConversationsPage> {
        let guard = self.lock();
        let cached = guard.as_ref()?.first_conversations_page.as_ref()?;
        if cached.fetched_at.elapsed() > ttl {
            return None;
        }
        Some(cached.page.clone())
    }

    pub fn set_first_conversations_page(&self, page: ConversationsPage) {
        let mut guard = self.lock();
        let inner = guard.get_or_insert_with(Default::default);
        inner.first_conversations_page = Some(CachedConversations { page, fetched_at: Instant::now() });
    }

    pub fn get_unread(&self) -> Option<bool> {
        let guard = self.lock();
        let cached = guard.as_ref()?.unread.as_ref()?;
        if cached.fetched_at.elapsed() > UNREAD_TTL {
            return None;
        }
        Some(cached.has_unread)
    }

    pub fn set_unread(&self, has_unread: bool) {
        let mut guard = self.lock();
        let inner = guard.get_or_insert_with(Default::default);
        inner.unread = Some(CachedUnread { has_unread, fetched_at: Instant::now() });
    }

    pub fn get_embed(&self, url: &str) -> Option<MessageEmbed> {
        let guard = self.lock();
        guard.as_ref()?.embed_cache.get(url).cloned()
    }

    pub fn set_embed(&self, url: String, embed: MessageEmbed) {
        let mut guard = self.lock();
        let inner = guard.get_or_insert_with(Default::default);
        if inner.embed_cache.len() >= MAX_EMBED_CACHE_SIZE {
            inner.embed_cache.clear();
        }
        inner.embed_cache.insert(url, embed);
    }

    pub fn clear(&self) {
        *self.lock() = None;
    }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

pub async fn fetch_conversations_page(
    oauth_token: &str, client_id: &str, user_id: u64, offset: Option<u32>, limit: u32,
) -> Result<ConversationsPage, MessagesError> {
    let url = format!(
        "{}/users/{}/conversations?limit={}&offset={}&linked_partitioning=1&client_id={}",
        API_V2_BASE,
        user_id,
        limit,
        offset.unwrap_or(0),
        client_id,
    );

    let response = HTTP_CLIENT.get(&url).with_oauth(Some(oauth_token)).send().await?;
    validate_api_response(response.status())?;

    let raw: RawPaginatedResponse<RawConversation> = response.json().await.map_err(|_| MessagesError::InvalidResponse)?;

    Ok(convert_conversations(raw, user_id))
}

pub async fn fetch_conversation_messages(
    oauth_token: &str, client_id: &str, user_id: u64, other_user_id: u64, offset: Option<u32>, limit: u32,
) -> Result<MessagesPage, MessagesError> {
    let url = format!(
        "{}/users/{}/conversations/{}/messages?limit={}&offset={}&linked_partitioning=1&client_id={}",
        API_V2_BASE,
        user_id,
        other_user_id,
        limit,
        offset.unwrap_or(0),
        client_id,
    );

    let response = HTTP_CLIENT.get(&url).with_oauth(Some(oauth_token)).send().await?;
    validate_api_response(response.status())?;

    let raw: RawPaginatedResponse<RawMessage> = response.json().await.map_err(|_| MessagesError::InvalidResponse)?;

    Ok(convert_messages(raw, other_user_id, user_id))
}

pub async fn send_message(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, user_id: u64, other_user_id: u64, content: &str,
) -> Result<(), MessagesError> {
    let url = format!(
        "{}/users/{}/conversations/{}?client_id={}",
        API_V2_BASE, user_id, other_user_id, client_id,
    );

    let body = serde_json::json!({ "contents": content });

    let response = HTTP_CLIENT
        .post(&url)
        .with_oauth(Some(oauth_token))
        .with_datadome(datadome)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await?;

    validate_api_response(response.status())?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_raw_sender(id: u64, username: &str) -> serde_json::Value {
        serde_json::json!({
            "id": id,
            "username": username,
            "avatar_url": "https://i1.sndcdn.com/avatars-test-large.jpg",
            "permalink_url": format!("https://soundcloud.com/{}", username.to_lowercase()),
        })
    }

    #[test]
    fn test_deserialize_conversation() {
        let json = serde_json::json!({
            "id": "999:100",
            "last_message": {
                "content": "Hello",
                "conversation_id": "100:999",
                "sender": make_raw_sender(100, "Me"),
                "sender_urn": "soundcloud:users:100",
                "sender_type": "user",
                "sent_at": "2026-04-16T05:15:20.000Z",
            },
            "read": true,
            "started_at": "2026-04-16T05:15:20.000Z",
            "summary": "...",
            "users": [
                make_raw_sender(999, "OtherUser"),
                make_raw_sender(100, "Me"),
            ],
        });

        let raw: RawConversation = serde_json::from_value(json).unwrap();
        let page = convert_conversations(RawPaginatedResponse { collection: vec![raw], next_href: None }, 100);
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.items[0].other_user.username, "OtherUser");
        assert_eq!(page.items[0].other_user.id, 999);
        assert_eq!(page.items[0].last_message_content, "Hello");
        assert!(page.items[0].read);
        assert!(page.next_offset.is_none());
    }

    #[test]
    fn test_deserialize_conversation_with_pagination() {
        let page = convert_conversations(
            RawPaginatedResponse::<RawConversation> {
                collection: vec![],
                next_href: Some("https://api-v2.soundcloud.com/users/100/conversations?offset=10&limit=10".to_string()),
            },
            100,
        );
        assert_eq!(page.next_offset, Some(10));
    }

    #[test]
    fn test_deserialize_message() {
        let json = serde_json::json!({
            "content": "Check this out",
            "conversation_id": "100:999",
            "sender": make_raw_sender(999, "OtherUser"),
            "sender_urn": "soundcloud:users:999",
            "sender_type": "user",
            "sent_at": "2026-04-16T05:15:20.000Z",
        });
        let raw: RawMessage = serde_json::from_value(json).unwrap();
        assert_eq!(raw.content, "Check this out");
        assert_eq!(raw.sender.id, 999);
    }

    #[test]
    fn test_extract_offset_from_next_href() {
        let url = "https://api-v2.soundcloud.com/users/100/conversations?offset=20&limit=10";
        assert_eq!(extract_offset_from_next_href(url), Some(20));
    }

    #[test]
    fn test_extract_offset_no_offset_param() {
        let url = "https://api-v2.soundcloud.com/users/100/conversations?limit=10";
        assert!(extract_offset_from_next_href(url).is_none());
    }

    const TEST_TTL: Duration = Duration::from_secs(60);

    #[test]
    fn test_cache_default_is_empty() {
        let cache = MessagesCache::default();
        assert!(cache.get_first_conversations_page(TEST_TTL).is_none());
        assert!(cache.get_unread().is_none());
    }

    #[test]
    fn test_cache_set_and_get_conversations() {
        let cache = MessagesCache::default();
        let page = ConversationsPage { items: vec![], current_user_id: 100, next_offset: Some(10) };
        cache.set_first_conversations_page(page);
        let got = cache.get_first_conversations_page(TEST_TTL).unwrap();
        assert_eq!(got.next_offset, Some(10));
    }

    #[test]
    fn test_cache_conversations_expire() {
        let cache = MessagesCache::default();
        let page = ConversationsPage { items: vec![], current_user_id: 100, next_offset: None };
        cache.set_first_conversations_page(page);
        assert!(cache.get_first_conversations_page(Duration::ZERO).is_none());
    }

    #[test]
    fn test_cache_unread() {
        let cache = MessagesCache::default();
        cache.set_unread(true);
        assert_eq!(cache.get_unread(), Some(true));
    }

    #[test]
    fn test_cache_clear() {
        let cache = MessagesCache::default();
        cache.set_unread(true);
        cache.clear();
        assert!(cache.get_unread().is_none());
    }
}
