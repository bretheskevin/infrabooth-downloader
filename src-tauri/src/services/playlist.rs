//! SoundCloud API client for fetching track and playlist metadata.
//!
//! This module fetches metadata using web hydration data to get complete track lists.
//! The OAuth API filters out some tracks (non-streamable), but web hydration includes all.
//!
//! Strategy:
//! 1. Fetch the SoundCloud web page
//! 2. Extract __sc_hydration JSON data
//! 3. Parse playlist info with all track IDs
//! 4. Batch-fetch full track details via API

use std::sync::Mutex;
use std::time::Duration;

use futures::future::join_all;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use thiserror::Error;
use tokio::time::sleep;

use crate::services::oauth::{get_app_token, get_client_secret};
use crate::services::storage::{current_timestamp, is_token_expired_or_expiring, load_tokens};

#[derive(Debug, Deserialize)]
struct ResolveResponse {
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

/// User information from SoundCloud API (public).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UserInfo {
    pub username: String,
}

/// Raw user information from SoundCloud API.
/// Used for deserializing the API response with avatar_url.
#[derive(Debug, Clone, Deserialize)]
struct RawUserInfo {
    pub username: String,
    pub avatar_url: Option<String>,
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
    pub user: RawUserInfo,
    pub artwork_url: Option<String>,
    /// Duration in milliseconds.
    pub duration: u64,
    /// Publisher metadata containing the actual artist name for label content.
    pub publisher_metadata: Option<PublisherMetadata>,
}

/// Track information from SoundCloud API.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

        // Use track artwork if available, otherwise fall back to user avatar
        let artwork = raw.artwork_url.or(raw.user.avatar_url);

        TrackInfo {
            id: raw.id,
            title: raw.title,
            user: UserInfo {
                username: artist_name,
            },
            artwork_url: artwork,
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
    pub user: RawUserInfo,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub tracks: Vec<RawTrackInfo>,
}

/// Hydration data structure from SoundCloud web page.
#[derive(Debug, Deserialize)]
struct HydrationItem {
    hydratable: String,
    data: Value,
}

/// Playlist data from hydration (tracks can be full objects or just IDs).
#[derive(Debug, Deserialize)]
struct HydrationPlaylist {
    id: u64,
    title: String,
    user: RawUserInfo,
    artwork_url: Option<String>,
    track_count: u32,
    tracks: Vec<Value>,
}

/// Playlist information from SoundCloud API.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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
            user: UserInfo {
                username: raw.user.username,
            },
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

/// Gets a valid app token, fetching a new one if needed.
async fn get_cached_app_token() -> Result<String, PlaylistError> {
    use crate::services::constants::TOKEN_REFRESH_BUFFER_SECS;
    // Check if we have a valid cached token
    {
        let cache = APP_TOKEN_CACHE.lock().unwrap();
        if let Some(ref cached) = *cache {
            if cached.expires_at > current_timestamp() + TOKEN_REFRESH_BUFFER_SECS {
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

/// Fetches the SoundCloud web page and extracts __sc_hydration JSON data.
///
/// **Note:** This function uses web scraping to extract JSON from SoundCloud's HTML.
/// This approach is inherently fragile and may break if SoundCloud changes their
/// page structure. If hydration extraction fails, callers should fall back to the
/// OAuth API via `fetch_playlist_info_via_api`.
async fn fetch_hydration_data(url: &str) -> Result<Vec<HydrationItem>, PlaylistError> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(PlaylistError::FetchFailed(format!(
            "HTTP {}",
            response.status()
        )));
    }

    let html = response.text().await?;

    // Extract __sc_hydration JSON from the page
    // Find the start marker and then parse the JSON array properly
    let start_marker = "__sc_hydration = ";
    let start_idx = html
        .find(start_marker)
        .ok_or(PlaylistError::InvalidResponse)?;

    let json_start = start_idx + start_marker.len();
    let remaining = &html[json_start..];

    // Find the matching closing bracket by counting brackets
    let mut depth = 0;
    let mut end_idx = 0;
    let mut in_string = false;
    let mut escape_next = false;

    for (i, ch) in remaining.char_indices() {
        if escape_next {
            escape_next = false;
            continue;
        }
        match ch {
            '\\' if in_string => escape_next = true,
            '"' => in_string = !in_string,
            '[' if !in_string => depth += 1,
            ']' if !in_string => {
                depth -= 1;
                if depth == 0 {
                    end_idx = i + 1;
                    break;
                }
            }
            _ => {}
        }
    }

    if end_idx == 0 {
        return Err(PlaylistError::InvalidResponse);
    }

    let json_str = &remaining[..end_idx];

    // Clean control characters that might break JSON parsing
    let original_len = json_str.len();
    let cleaned: String = json_str
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\r' || *c == '\t')
        .collect();

    if cleaned.len() != original_len {
        log::debug!(
            "[soundcloud] Filtered {} control characters from hydration JSON",
            original_len - cleaned.len()
        );
    }

    serde_json::from_str(&cleaned).map_err(|e| {
        log::error!("[soundcloud] Failed to parse hydration JSON: {}", e);
        PlaylistError::InvalidResponse
    })
}

/// Extracts playlist data from hydration items.
fn extract_playlist_from_hydration(
    items: &[HydrationItem],
) -> Result<HydrationPlaylist, PlaylistError> {
    for item in items {
        if item.hydratable == "playlist" {
            return serde_json::from_value(item.data.clone()).map_err(|e| {
                log::error!(
                    "[soundcloud] Failed to parse playlist from hydration: {}",
                    e
                );
                PlaylistError::InvalidResponse
            });
        }
    }
    Err(PlaylistError::InvalidResponse)
}

/// Extracts track IDs from hydration playlist data.
/// Tracks can be either full objects (with id field) or just numeric IDs.
fn extract_track_ids(tracks: &[Value]) -> Vec<u64> {
    tracks
        .iter()
        .filter_map(|t| {
            if let Some(id) = t.as_u64() {
                Some(id)
            } else if let Some(obj) = t.as_object() {
                obj.get("id").and_then(|v| v.as_u64())
            } else {
                None
            }
        })
        .collect()
}

/// Extracts full track info from hydration data if available.
fn extract_full_tracks_from_hydration(tracks: &[Value]) -> Vec<TrackInfo> {
    tracks
        .iter()
        .filter_map(|t| {
            if let Some(obj) = t.as_object() {
                // Check if this is a full track object (has title and user)
                if obj.contains_key("title") && obj.contains_key("user") {
                    if let Ok(raw) = serde_json::from_value::<RawTrackInfo>(t.clone()) {
                        return Some(TrackInfo::from(raw));
                    }
                }
            }
            None
        })
        .collect()
}

/// Fetches track details by IDs using the batch API endpoint.
/// SoundCloud allows fetching up to 50 tracks per request.
/// Includes rate limiting (100ms delay between batches) to avoid hitting API limits.
async fn fetch_tracks_by_ids(
    ids: &[u64],
    access_token: &str,
) -> Result<Vec<TrackInfo>, PlaylistError> {
    if ids.is_empty() {
        return Ok(vec![]);
    }

    let client = reqwest::Client::new();
    let mut all_tracks = Vec::new();
    let chunks: Vec<_> = ids.chunks(50).collect();
    let total_chunks = chunks.len();

    // Process in batches of 50 with rate limiting
    for (i, chunk) in chunks.into_iter().enumerate() {
        let ids_param: String = chunk
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");

        let url = format!("https://api.soundcloud.com/tracks?ids={}", ids_param);
        let response = client
            .get(&url)
            .header("Authorization", format!("OAuth {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            match response.json::<Vec<RawTrackInfo>>().await {
                Ok(raw_tracks) => {
                    all_tracks.extend(raw_tracks.into_iter().map(TrackInfo::from));
                }
                Err(e) => {
                    log::warn!(
                        "[soundcloud] Failed to parse batch response for {} tracks: {}",
                        chunk.len(),
                        e
                    );
                }
            }
        } else {
            log::warn!(
                "[soundcloud] Batch fetch failed for {} tracks: HTTP {}",
                chunk.len(),
                response.status()
            );
        }

        // Rate limiting: small delay between batches (except after the last one)
        if i < total_chunks - 1 {
            sleep(Duration::from_millis(100)).await;
        }
    }

    Ok(all_tracks)
}

/// Fetches a single track by ID (fallback for tracks not in batch response).
async fn fetch_track_by_id(id: u64, access_token: &str) -> Option<TrackInfo> {
    let client = reqwest::Client::new();
    let url = format!("https://api.soundcloud.com/tracks/{}", id);

    match client
        .get(&url)
        .header("Authorization", format!("OAuth {}", access_token))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => response
            .json::<RawTrackInfo>()
            .await
            .ok()
            .map(TrackInfo::from),
        _ => None,
    }
}

/// Fetches multiple tracks by ID in parallel (for tracks filtered by batch API).
async fn fetch_tracks_by_ids_parallel(ids: &[u64], access_token: &str) -> Vec<TrackInfo> {
    let futures: Vec<_> = ids
        .iter()
        .map(|id| fetch_track_by_id(*id, access_token))
        .collect();

    join_all(futures).await.into_iter().flatten().collect()
}

/// Validates that a URL is a SoundCloud URL.
fn is_valid_soundcloud_url(url: &str) -> bool {
    url.starts_with("https://soundcloud.com/")
        || url.starts_with("http://soundcloud.com/")
        || url.starts_with("https://www.soundcloud.com/")
        || url.starts_with("http://www.soundcloud.com/")
}

/// Fetches playlist info using the OAuth API (fallback for private playlists).
/// This is used when web hydration fails (e.g., for private content).
async fn fetch_playlist_info_via_api(url: &str) -> Result<PlaylistInfo, PlaylistError> {
    let token = get_access_token().await?;
    log::info!(
        "[soundcloud] Fetching playlist via OAuth API for URL: {}",
        url
    );
    let raw: RawPlaylistInfo = resolve_url(url, &token).await?;
    Ok(PlaylistInfo::from(raw))
}

pub async fn fetch_playlist_info(url: &str) -> Result<PlaylistInfo, PlaylistError> {
    // Validate URL before making any requests
    if !is_valid_soundcloud_url(url) {
        return Err(PlaylistError::FetchFailed(
            "Invalid SoundCloud URL".to_string(),
        ));
    }

    log::info!(
        "[soundcloud] Fetching playlist via web hydration for URL: {}",
        url
    );

    // Step 1: Try to fetch hydration data from web page
    // If this fails (e.g., private playlist), fall back to OAuth API
    let hydration = match fetch_hydration_data(url).await {
        Ok(h) => h,
        Err(e) => {
            log::warn!(
                "[soundcloud] Web hydration failed: {}, falling back to OAuth API",
                e
            );
            return fetch_playlist_info_via_api(url).await;
        }
    };

    let playlist_data = match extract_playlist_from_hydration(&hydration) {
        Ok(p) => p,
        Err(e) => {
            log::warn!(
                "[soundcloud] Failed to extract playlist from hydration: {}, falling back to OAuth API",
                e
            );
            return fetch_playlist_info_via_api(url).await;
        }
    };

    log::info!(
        "[soundcloud] Found playlist '{}' with {} tracks in hydration",
        playlist_data.title,
        playlist_data.track_count
    );

    // Step 2: Extract track IDs and any full track data from hydration
    let all_track_ids = extract_track_ids(&playlist_data.tracks);
    let hydration_tracks = extract_full_tracks_from_hydration(&playlist_data.tracks);

    log::info!(
        "[soundcloud] Hydration contains {} full tracks, {} total IDs",
        hydration_tracks.len(),
        all_track_ids.len()
    );

    // Step 3: Determine which track IDs need to be fetched
    let hydration_track_ids: std::collections::HashSet<u64> =
        hydration_tracks.iter().map(|t| t.id).collect();
    let missing_ids: Vec<u64> = all_track_ids
        .iter()
        .filter(|id| !hydration_track_ids.contains(id))
        .copied()
        .collect();

    // Step 4: Get access token and fetch missing tracks
    let token = get_access_token().await?;
    let mut fetched_tracks = fetch_tracks_by_ids(&missing_ids, &token).await?;

    log::info!(
        "[soundcloud] Batch API returned {} of {} missing tracks",
        fetched_tracks.len(),
        missing_ids.len()
    );

    // Step 5: For any still-missing tracks, fetch in parallel
    let fetched_ids: std::collections::HashSet<u64> = fetched_tracks.iter().map(|t| t.id).collect();
    let still_missing: Vec<u64> = missing_ids
        .iter()
        .filter(|id| !fetched_ids.contains(id))
        .copied()
        .collect();

    if !still_missing.is_empty() {
        log::info!(
            "[soundcloud] Fetching {} tracks in parallel (filtered by batch API)",
            still_missing.len()
        );
        let parallel_tracks = fetch_tracks_by_ids_parallel(&still_missing, &token).await;
        log::info!(
            "[soundcloud] Parallel fetch returned {} tracks",
            parallel_tracks.len()
        );
        fetched_tracks.extend(parallel_tracks);

        // Log any tracks that couldn't be fetched
        let final_fetched_ids: std::collections::HashSet<u64> =
            fetched_tracks.iter().map(|t| t.id).collect();
        for id in &still_missing {
            if !final_fetched_ids.contains(id) {
                log::warn!("[soundcloud] Could not fetch track {}", id);
            }
        }
    }

    // Step 6: Combine all tracks and sort by original order
    let mut all_tracks: Vec<TrackInfo> = hydration_tracks;
    all_tracks.extend(fetched_tracks);

    // Create a map for quick lookup
    let track_map: std::collections::HashMap<u64, TrackInfo> =
        all_tracks.into_iter().map(|t| (t.id, t)).collect();

    // Reconstruct in original order
    let ordered_tracks: Vec<TrackInfo> = all_track_ids
        .iter()
        .filter_map(|id| track_map.get(id).cloned())
        .collect();

    log::info!(
        "[soundcloud] Final playlist has {} of {} tracks",
        ordered_tracks.len(),
        playlist_data.track_count
    );

    Ok(PlaylistInfo {
        id: playlist_data.id,
        title: playlist_data.title,
        user: UserInfo {
            username: playlist_data.user.username,
        },
        artwork_url: playlist_data.artwork_url,
        track_count: playlist_data.track_count,
        tracks: ordered_tracks,
    })
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
    fn test_track_artwork_falls_back_to_user_avatar() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist", "avatar_url": "https://i1.sndcdn.com/avatars-xxx.jpg"},
            "artwork_url": null,
            "duration": 180000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(
            track.artwork_url,
            Some("https://i1.sndcdn.com/avatars-xxx.jpg".to_string())
        );
    }

    #[test]
    fn test_track_artwork_prefers_track_artwork_over_avatar() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist", "avatar_url": "https://i1.sndcdn.com/avatars-xxx.jpg"},
            "artwork_url": "https://i1.sndcdn.com/artworks-yyy.jpg",
            "duration": 180000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert_eq!(
            track.artwork_url,
            Some("https://i1.sndcdn.com/artworks-yyy.jpg".to_string())
        );
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

    // URL validation tests
    #[test]
    fn test_is_valid_soundcloud_url_https() {
        assert!(is_valid_soundcloud_url(
            "https://soundcloud.com/artist/track"
        ));
    }

    #[test]
    fn test_is_valid_soundcloud_url_http() {
        assert!(is_valid_soundcloud_url(
            "http://soundcloud.com/artist/track"
        ));
    }

    #[test]
    fn test_is_valid_soundcloud_url_www() {
        assert!(is_valid_soundcloud_url(
            "https://www.soundcloud.com/artist/track"
        ));
    }

    #[test]
    fn test_is_valid_soundcloud_url_rejects_other_domains() {
        assert!(!is_valid_soundcloud_url("https://example.com/track"));
        assert!(!is_valid_soundcloud_url("https://spotify.com/track"));
        assert!(!is_valid_soundcloud_url("not-a-url"));
    }

    // Hydration extraction tests
    #[test]
    fn test_extract_track_ids_from_full_objects() {
        let tracks: Vec<Value> = vec![
            serde_json::json!({"id": 123, "title": "Track 1"}),
            serde_json::json!({"id": 456, "title": "Track 2"}),
        ];
        let ids = extract_track_ids(&tracks);
        assert_eq!(ids, vec![123, 456]);
    }

    #[test]
    fn test_extract_track_ids_from_numeric_ids() {
        let tracks: Vec<Value> = vec![serde_json::json!(123), serde_json::json!(456)];
        let ids = extract_track_ids(&tracks);
        assert_eq!(ids, vec![123, 456]);
    }

    #[test]
    fn test_extract_track_ids_mixed() {
        let tracks: Vec<Value> = vec![
            serde_json::json!({"id": 123, "title": "Track 1"}),
            serde_json::json!(456),
            serde_json::json!({"id": 789}),
        ];
        let ids = extract_track_ids(&tracks);
        assert_eq!(ids, vec![123, 456, 789]);
    }

    #[test]
    fn test_extract_track_ids_empty() {
        let tracks: Vec<Value> = vec![];
        let ids = extract_track_ids(&tracks);
        assert!(ids.is_empty());
    }

    #[test]
    fn test_extract_full_tracks_from_hydration_with_complete_data() {
        let tracks: Vec<Value> = vec![serde_json::json!({
            "id": 123,
            "title": "Track 1",
            "user": {"username": "artist1"},
            "artwork_url": null,
            "duration": 180000
        })];
        let full_tracks = extract_full_tracks_from_hydration(&tracks);
        assert_eq!(full_tracks.len(), 1);
        assert_eq!(full_tracks[0].id, 123);
        assert_eq!(full_tracks[0].title, "Track 1");
    }

    #[test]
    fn test_extract_full_tracks_from_hydration_skips_incomplete() {
        let tracks: Vec<Value> = vec![
            serde_json::json!({"id": 123}), // Missing title and user
            serde_json::json!(456),         // Just an ID
            serde_json::json!({
                "id": 789,
                "title": "Track 3",
                "user": {"username": "artist3"},
                "artwork_url": null,
                "duration": 180000
            }),
        ];
        let full_tracks = extract_full_tracks_from_hydration(&tracks);
        assert_eq!(full_tracks.len(), 1);
        assert_eq!(full_tracks[0].id, 789);
    }

    #[test]
    fn test_extract_playlist_from_hydration_found() {
        let items = vec![
            HydrationItem {
                hydratable: "other".to_string(),
                data: serde_json::json!({}),
            },
            HydrationItem {
                hydratable: "playlist".to_string(),
                data: serde_json::json!({
                    "id": 999,
                    "title": "Test Playlist",
                    "user": {"username": "owner"},
                    "artwork_url": null,
                    "track_count": 2,
                    "tracks": [123, 456]
                }),
            },
        ];
        let playlist = extract_playlist_from_hydration(&items).unwrap();
        assert_eq!(playlist.id, 999);
        assert_eq!(playlist.title, "Test Playlist");
        assert_eq!(playlist.track_count, 2);
    }

    #[test]
    fn test_extract_playlist_from_hydration_not_found() {
        let items = vec![HydrationItem {
            hydratable: "other".to_string(),
            data: serde_json::json!({}),
        }];
        let result = extract_playlist_from_hydration(&items);
        assert!(result.is_err());
    }
}
