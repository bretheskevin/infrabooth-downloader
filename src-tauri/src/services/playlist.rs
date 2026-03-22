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

use std::time::Duration;

use futures::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use thiserror::Error;
use tokio::time::sleep;

use crate::services::client_id;
use crate::services::http::{validate_api_response, RequestBuilderExt, API_V2_BASE};
use crate::services::stream;

#[derive(Debug, Deserialize)]
struct ResolveResponse {
    location: Option<String>,
}

/// Errors that can occur during playlist operations.
#[derive(Debug, Error)]
pub enum PlaylistError {
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

    #[error("Rate limited by SoundCloud")]
    RateLimited,
}

impl From<crate::services::http::ApiResponseError> for PlaylistError {
    fn from(e: crate::services::http::ApiResponseError) -> Self {
        use crate::services::http::ApiResponseError;
        match e {
            ApiResponseError::AuthRequired => Self::AuthRequired,
            ApiResponseError::RateLimited => Self::RateLimited,
            ApiResponseError::NotFound => Self::TrackNotFound,
            ApiResponseError::GeoBlocked => Self::GeoBlocked,
            ApiResponseError::FetchFailed(msg) => Self::FetchFailed(msg),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UserInfo {
    pub username: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct RawUserInfo {
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
pub(crate) struct RawTrackInfo {
    pub id: u64,
    pub title: String,
    pub user: RawUserInfo,
    pub artwork_url: Option<String>,
    pub duration: u64,
    pub publisher_metadata: Option<PublisherMetadata>,
    #[serde(default)]
    pub permalink_url: String,
    pub media: Option<stream::MediaInfo>,
    #[serde(default)]
    pub downloadable: bool,
    pub download_url: Option<String>,
    pub waveform_url: Option<String>,
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
    pub permalink_url: String,
    /// URL to fetch waveform data (JSON with samples array).
    pub waveform_url: Option<String>,
    /// Whether the track has free download enabled.
    pub downloadable: bool,
    /// URL to download the original file (requires OAuth token).
    pub download_url: Option<String>,
}

impl From<RawTrackInfo> for TrackInfo {
    fn from(raw: RawTrackInfo) -> Self {
        // Cache transcodings for instant playback resolution
        if let Some(media) = &raw.media {
            if !media.transcodings.is_empty() {
                stream::cache_transcodings(raw.id, media.transcodings.clone());
            }
        }

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
                avatar_url: None,
            },
            artwork_url: artwork,
            duration: raw.duration,
            permalink_url: raw.permalink_url,
            waveform_url: raw.waveform_url,
            downloadable: raw.downloadable,
            download_url: build_download_url(raw.downloadable, raw.download_url, raw.id),
        }
    }
}

/// Build the download URL for a track if it has free download enabled.
/// If the track is downloadable but no URL was provided, constructs the standard API endpoint.
pub fn build_download_url(downloadable: bool, download_url: Option<String>, track_id: u64) -> Option<String> {
    if downloadable {
        download_url.or_else(|| {
            Some(format!("https://api-v2.soundcloud.com/tracks/{}/download", track_id))
        })
    } else {
        None
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

#[derive(Debug, Deserialize)]
struct RawSystemPlaylistInfo {
    title: String,
    artwork_url: Option<String>,
    calculated_artwork_url: Option<String>,
    tracks: Vec<Value>,
    user: Option<RawUserInfo>,
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
                avatar_url: raw.user.avatar_url,
            },
            artwork_url: raw.artwork_url,
            track_count: raw.track_count,
            tracks: raw.tracks.into_iter().map(TrackInfo::from).collect(),
        }
    }
}

pub fn build_playlist_url(id: u64, client_id: &str, secret_token: Option<&str>) -> String {
    let mut url = format!(
        "{}/playlists/{}?representation=full&client_id={}",
        API_V2_BASE, id, client_id
    );
    if let Some(token) = secret_token {
        url.push_str(&format!("&secret_token={}", token));
    }
    url
}

async fn resolve_url<T: serde::de::DeserializeOwned>(
    url: &str,
    cid: &str,
    oauth_token: Option<&str>,
) -> Result<T, PlaylistError> {
    let client = &*crate::services::http::HTTP_CLIENT;
    let resolve_url = format!(
        "{}/resolve?url={}&client_id={}",
        API_V2_BASE,
        urlencoding::encode(url),
        cid,
    );

    let request = client.get(&resolve_url).with_oauth(oauth_token);

    let response = request.send().await?;

    let status = response.status();
    if status != reqwest::StatusCode::FOUND {
        validate_api_response(status)?;
    }

    let body = response.text().await?;

    if let Ok(redirect) = serde_json::from_str::<ResolveResponse>(&body) {
        if let Some(location) = redirect.location {
            log::info!("[soundcloud] Following redirect to: {}", location);

            let redirect_response = client
                .get(&location)
                .with_oauth(oauth_token)
                .send()
                .await?;

            validate_api_response(redirect_response.status())?;

            return redirect_response
                .json()
                .await
                .map_err(|_| PlaylistError::InvalidResponse);
        }
    }

    serde_json::from_str(&body).map_err(|_| PlaylistError::InvalidResponse)
}

/// Extracts a JSON array from HTML content starting at the given marker.
///
/// Uses bracket-matching to find the complete JSON array, properly handling
/// strings and escape sequences. Returns the extracted JSON string or `None`
/// if the marker is not found or no valid array is detected.
fn extract_json_array_from_html(html: &str, marker: &str) -> Option<String> {
    let start_idx = html.find(marker)?;
    let remaining = &html[start_idx + marker.len()..];

    let mut depth = 0;
    let mut in_string = false;
    let mut escape_next = false;
    let mut end_idx = 0;

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

    if end_idx > 0 {
        Some(remaining[..end_idx].to_string())
    } else {
        None
    }
}

/// Fetches the SoundCloud web page and extracts __sc_hydration JSON data.
///
/// **Note:** This function uses web scraping to extract JSON from SoundCloud's HTML.
/// This approach is inherently fragile and may break if SoundCloud changes their
/// page structure. If hydration extraction fails, callers should fall back to the
/// OAuth API via `fetch_playlist_info_via_api`.
async fn fetch_hydration_data(url: &str) -> Result<Vec<HydrationItem>, PlaylistError> {
    let client = &*crate::services::http::HTTP_CLIENT;
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

    let json_str =
        extract_json_array_from_html(&html, "__sc_hydration = ").ok_or(PlaylistError::InvalidResponse)?;

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

/// Extracts full tracks from hydration data and reports them via callback.
/// Returns the extracted tracks and a set of their IDs for deduplication.
fn extract_and_report_full_tracks<F>(
    tracks: &[Value],
    on_batch: &F,
) -> (Vec<TrackInfo>, std::collections::HashSet<u64>)
where
    F: Fn(&[TrackInfo]),
{
    let full_tracks = extract_full_tracks_from_hydration(tracks);

    if !full_tracks.is_empty() {
        on_batch(&full_tracks);
    }

    let full_track_ids: std::collections::HashSet<u64> =
        full_tracks.iter().map(|t| t.id).collect();

    (full_tracks, full_track_ids)
}

/// Fetches missing tracks in batches using batch API with parallel fallback.
/// Returns all successfully fetched tracks.
async fn fetch_missing_tracks_batched<F>(
    missing_ids: Vec<u64>,
    cid: &str,
    oauth_token: Option<&str>,
    on_batch: &F,
) -> Result<Vec<TrackInfo>, PlaylistError>
where
    F: Fn(&[TrackInfo]),
{
    if missing_ids.is_empty() {
        return Ok(vec![]);
    }

    let mut fetched_tracks = fetch_tracks_by_ids(&missing_ids, cid, oauth_token, on_batch).await?;

    log::info!(
        "[soundcloud] Batch API returned {} of {} missing tracks",
        fetched_tracks.len(),
        missing_ids.len()
    );

    let fetched_ids: std::collections::HashSet<u64> =
        fetched_tracks.iter().map(|t| t.id).collect();
    let still_missing: Vec<u64> = missing_ids
        .iter()
        .filter(|id| !fetched_ids.contains(id))
        .copied()
        .collect();

    if !still_missing.is_empty() {
        log::info!(
            "[soundcloud] Fetching {} tracks in parallel",
            still_missing.len()
        );
        let parallel_tracks =
            fetch_tracks_by_ids_parallel(&still_missing, cid, oauth_token).await;
        log::info!(
            "[soundcloud] Parallel fetch returned {} tracks",
            parallel_tracks.len()
        );
        if !parallel_tracks.is_empty() {
            on_batch(&parallel_tracks);
        }
        fetched_tracks.extend(parallel_tracks);

        let final_fetched_ids: std::collections::HashSet<u64> =
            fetched_tracks.iter().map(|t| t.id).collect();
        for id in &still_missing {
            if !final_fetched_ids.contains(id) {
                log::warn!("[soundcloud] Could not fetch track {}", id);
            }
        }
    }

    Ok(fetched_tracks)
}

/// Resolves a mixed list of track data (full objects + ID stubs) into ordered TrackInfo.
/// Extracts full tracks from the data, batch-fetches missing ones, and sorts by original order.
/// Calls `on_batch` with each batch of resolved tracks for progressive loading.
async fn resolve_tracks_from_mixed<F>(
    tracks: &[Value],
    cid: &str,
    oauth_token: Option<&str>,
    on_batch: F,
) -> Result<Vec<TrackInfo>, PlaylistError>
where
    F: Fn(&[TrackInfo]),
{
    let all_track_ids = extract_track_ids(tracks);

    let (full_tracks, full_track_ids) = extract_and_report_full_tracks(tracks, &on_batch);

    log::info!(
        "[soundcloud] {} full tracks available, {} total IDs",
        full_tracks.len(),
        all_track_ids.len()
    );

    let missing_ids: Vec<u64> = all_track_ids
        .iter()
        .filter(|id| !full_track_ids.contains(id))
        .copied()
        .collect();

    let fetched_tracks =
        fetch_missing_tracks_batched(missing_ids, cid, oauth_token, &on_batch).await?;

    let mut all_tracks: Vec<TrackInfo> = full_tracks;
    all_tracks.extend(fetched_tracks);

    let track_map: std::collections::HashMap<u64, TrackInfo> =
        all_tracks.into_iter().map(|t| (t.id, t)).collect();

    let ordered_tracks: Vec<TrackInfo> = all_track_ids
        .iter()
        .filter_map(|id| track_map.get(id).cloned())
        .collect();

    Ok(ordered_tracks)
}

/// Fetches track details by IDs using the API v2 batch endpoint.
/// SoundCloud allows fetching up to 50 tracks per request.
/// Includes rate limiting (100ms delay between batches) to avoid hitting API limits.
async fn fetch_tracks_by_ids<F>(
    ids: &[u64],
    cid: &str,
    oauth_token: Option<&str>,
    on_batch: &F,
) -> Result<Vec<TrackInfo>, PlaylistError>
where
    F: Fn(&[TrackInfo]),
{
    if ids.is_empty() {
        return Ok(vec![]);
    }

    let client = &*crate::services::http::HTTP_CLIENT;
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

        let url = format!(
            "{}/tracks?ids={}&client_id={}",
            API_V2_BASE, ids_param, cid
        );

        let response = client.get(&url).with_oauth(oauth_token).send().await?;

        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(PlaylistError::RateLimited);
        }

        if response.status().is_success() {
            match response.json::<Vec<RawTrackInfo>>().await {
                Ok(raw_tracks) => {
                    let batch: Vec<TrackInfo> =
                        raw_tracks.into_iter().map(TrackInfo::from).collect();
                    on_batch(&batch);
                    all_tracks.extend(batch);
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
async fn fetch_track_by_id(id: u64, cid: &str, oauth_token: Option<&str>) -> Option<TrackInfo> {
    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!(
        "{}/tracks/{}?client_id={}",
        API_V2_BASE, id, cid
    );

    match client.get(&url).with_oauth(oauth_token).send().await {
        Ok(response) if response.status().is_success() => response
            .json::<RawTrackInfo>()
            .await
            .ok()
            .map(TrackInfo::from),
        _ => None,
    }
}

/// Fetches multiple tracks by ID in parallel (for tracks filtered by batch API).
async fn fetch_tracks_by_ids_parallel(
    ids: &[u64],
    cid: &str,
    oauth_token: Option<&str>,
) -> Vec<TrackInfo> {
    let futures: Vec<_> = ids
        .iter()
        .map(|id| fetch_track_by_id(*id, cid, oauth_token))
        .collect();

    join_all(futures).await.into_iter().flatten().collect()
}

/// Get a SoundCloud client_id, mapping errors to `PlaylistError`.
async fn get_cid() -> Result<String, PlaylistError> {
    client_id::get_client_id()
        .await
        .map_err(|e| PlaylistError::FetchFailed(e.to_string()))
}

/// Validates that a URL is a SoundCloud URL.
fn is_valid_soundcloud_url(url: &str) -> bool {
    url.starts_with("https://soundcloud.com/")
        || url.starts_with("https://www.soundcloud.com/")
        || url.starts_with("https://on.soundcloud.com/")
}

fn extract_system_playlist_slug(url: &str) -> Option<&str> {
    let path = url.split("soundcloud.com/").nth(1)?;
    let path = path.split('?').next().unwrap_or(path);
    let path = path.split('#').next().unwrap_or(path);
    path.strip_prefix("discover/sets/").filter(|s| !s.is_empty())
}

async fn fetch_system_playlist(
    slug: &str,
    oauth_token: Option<&str>,
) -> Result<PlaylistInfo, PlaylistError> {
    let cid = get_cid().await?;
    let url = format!("https://soundcloud.com/discover/sets/{}", slug);

    log::info!("[soundcloud] Resolving system playlist for URL: {}", url);

    let raw: RawSystemPlaylistInfo = resolve_url(&url, &cid, oauth_token).await?;

    let artwork = raw.artwork_url.or(raw.calculated_artwork_url);
    let track_count = raw.tracks.len() as u32;
    let user = raw
        .user
        .map(|u| UserInfo {
            username: u.username,
            avatar_url: u.avatar_url,
        })
        .unwrap_or(UserInfo {
            username: "SoundCloud".to_string(),
            avatar_url: None,
        });

    log::info!(
        "[soundcloud] System playlist '{}' has {} tracks",
        raw.title,
        track_count
    );

    let ordered_tracks =
        resolve_tracks_from_mixed(&raw.tracks, &cid, oauth_token, |_| {}).await?;

    log::info!(
        "[soundcloud] Final system playlist has {} of {} tracks",
        ordered_tracks.len(),
        track_count
    );

    Ok(PlaylistInfo {
        id: 0,
        title: raw.title,
        user,
        artwork_url: artwork,
        track_count,
        tracks: ordered_tracks,
    })
}

/// Fetches playlist info using the API v2 (fallback for private playlists).
/// This is used when web hydration fails (e.g., for private content).
async fn fetch_playlist_info_via_api(
    url: &str,
    oauth_token: Option<&str>,
) -> Result<PlaylistInfo, PlaylistError> {
    let cid = get_cid().await?;
    log::info!(
        "[soundcloud] Fetching playlist via API v2 for URL: {}",
        url
    );
    let raw: RawPlaylistInfo = resolve_url(url, &cid, oauth_token).await?;
    Ok(PlaylistInfo::from(raw))
}

pub async fn fetch_playlist_info(
    url: &str,
    oauth_token: Option<&str>,
) -> Result<PlaylistInfo, PlaylistError> {
    if !is_valid_soundcloud_url(url) {
        return Err(PlaylistError::FetchFailed(
            "Invalid SoundCloud URL".to_string(),
        ));
    }

    if let Some(slug) = extract_system_playlist_slug(url) {
        return fetch_system_playlist(slug, oauth_token).await;
    }

    log::info!(
        "[soundcloud] Fetching playlist via web hydration for URL: {}",
        url
    );

    let hydration = match fetch_hydration_data(url).await {
        Ok(h) => h,
        Err(e) => {
            log::warn!(
                "[soundcloud] Web hydration failed: {}, falling back to API v2",
                e
            );
            return fetch_playlist_info_via_api(url, oauth_token).await;
        }
    };

    let playlist_data = match extract_playlist_from_hydration(&hydration) {
        Ok(p) => p,
        Err(e) => {
            log::warn!(
                "[soundcloud] Failed to extract playlist from hydration: {}, falling back to API v2",
                e
            );
            return fetch_playlist_info_via_api(url, oauth_token).await;
        }
    };

    log::info!(
        "[soundcloud] Found playlist '{}' with {} tracks in hydration",
        playlist_data.title,
        playlist_data.track_count
    );

    let cid = get_cid().await?;
    let ordered_tracks = resolve_tracks_from_mixed(&playlist_data.tracks, &cid, oauth_token, |_| {}).await?;

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
            avatar_url: playlist_data.user.avatar_url,
        },
        artwork_url: playlist_data.artwork_url,
        track_count: playlist_data.track_count,
        tracks: ordered_tracks,
    })
}

pub async fn fetch_track_info(
    url: &str,
    oauth_token: Option<&str>,
) -> Result<TrackInfo, PlaylistError> {
    let cid = get_cid().await?;
    log::info!("[soundcloud] Fetching track info for URL: {}", url);
    let raw: RawTrackInfo = resolve_url(url, &cid, oauth_token).await?;
    Ok(TrackInfo::from(raw))
}

/// Fetches all tracks from a playlist by its numeric ID.
/// Used by the library detail view to load tracklists without URL resolution.
/// Handles mixed track data (full objects + ID stubs) from the API.
/// Calls `on_batch` with each batch of resolved tracks for progressive loading.
pub async fn fetch_playlist_by_id<F>(
    id: u64,
    secret_token: Option<&str>,
    oauth_token: Option<&str>,
    on_batch: F,
) -> Result<Vec<TrackInfo>, PlaylistError>
where
    F: Fn(&[TrackInfo]),
{
    let cid = get_cid().await?;

    let url = build_playlist_url(id, &cid, secret_token);

    log::info!("[soundcloud] Fetching playlist by ID: {}", id);

    let response = crate::services::http::HTTP_CLIENT
        .get(&url)
        .with_oauth(oauth_token)
        .send()
        .await?;

    validate_api_response(response.status())?;

    let playlist: HydrationPlaylist = response
        .json()
        .await
        .map_err(|e| {
            log::error!("[soundcloud] Failed to parse playlist response: {}", e);
            PlaylistError::InvalidResponse
        })?;

    log::info!(
        "[soundcloud] Playlist '{}' has {} tracks",
        playlist.title,
        playlist.track_count
    );

    let ordered_tracks = resolve_tracks_from_mixed(&playlist.tracks, &cid, oauth_token, on_batch).await?;

    log::info!(
        "[soundcloud] Returning {} of {} tracks",
        ordered_tracks.len(),
        playlist.track_count
    );

    Ok(ordered_tracks)
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
            avatar_url: None,
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
                avatar_url: None,
            },
            artwork_url: Some("https://example.com/art.jpg".to_string()),
            duration: 180000,
            permalink_url: "https://soundcloud.com/test_artist/test-track".to_string(),
            waveform_url: None,
            downloadable: false,
            download_url: None,
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
                avatar_url: None,
            },
            artwork_url: Some("https://example.com/playlist.jpg".to_string()),
            track_count: 1,
            tracks: vec![TrackInfo {
                id: 1,
                title: "Track 1".to_string(),
                user: UserInfo {
                    username: "artist".to_string(),
                    avatar_url: None,
                },
                artwork_url: None,
                duration: 180000,
                permalink_url: "https://soundcloud.com/artist/track-1".to_string(),
                waveform_url: None,
                downloadable: false,
                download_url: None,
            }],
        };
        let json = serde_json::to_string(&playlist).unwrap();
        assert!(json.contains("\"id\":999"));
        assert!(json.contains("\"title\":\"My Playlist\""));
        assert!(json.contains("\"track_count\":1"));
    }

    // PlaylistError tests
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
    fn test_is_valid_soundcloud_url() {
        assert!(is_valid_soundcloud_url("https://soundcloud.com/artist/track"));
        assert!(is_valid_soundcloud_url("https://www.soundcloud.com/artist/track"));
        assert!(is_valid_soundcloud_url("https://on.soundcloud.com/abc123XYZ"));
    }

    #[test]
    fn test_is_valid_soundcloud_url_rejects_other_domains() {
        assert!(!is_valid_soundcloud_url("https://example.com/track"));
        assert!(!is_valid_soundcloud_url("https://spotify.com/track"));
        assert!(!is_valid_soundcloud_url("http://soundcloud.com/artist/track"));
        assert!(!is_valid_soundcloud_url("not-a-url"));
    }

    #[test]
    fn test_extract_system_playlist_slug() {
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/discover/sets/your-moods:526801914:1"),
            Some("your-moods:526801914:1")
        );
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/discover/sets/charts-top:all-music:us"),
            Some("charts-top:all-music:us")
        );
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/user/sets/my-playlist"),
            None
        );
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/discover"),
            None
        );
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/discover/sets/"),
            None
        );
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/discover/sets/your-moods:526801914:1?si=abc123"),
            Some("your-moods:526801914:1")
        );
        assert_eq!(
            extract_system_playlist_slug("https://soundcloud.com/discover/sets/charts-top:all-music:us#section"),
            Some("charts-top:all-music:us")
        );
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

    #[test]
    fn test_fetch_playlist_by_id_extract_track_ids_from_api_response() {
        // Test that extract_track_ids handles mixed full objects and ID stubs
        let tracks = vec![
            serde_json::json!({"id": 100, "title": "Track 1", "user": {"username": "artist"}}),
            serde_json::json!(200),
            serde_json::json!({"id": 300, "title": "Track 3", "user": {"username": "artist"}}),
        ];
        let ids = extract_track_ids(&tracks);
        assert_eq!(ids, vec![100, 200, 300]);
    }

    #[test]
    fn test_fetch_playlist_by_id_extract_full_tracks() {
        let tracks = vec![
            serde_json::json!({
                "id": 100, "title": "Track 1",
                "user": {"username": "artist", "avatar_url": null},
                "artwork_url": null, "duration": 180000,
                "publisher_metadata": null
            }),
            serde_json::json!(200),
        ];
        let full = extract_full_tracks_from_hydration(&tracks);
        assert_eq!(full.len(), 1);
        assert_eq!(full[0].id, 100);
        assert_eq!(full[0].title, "Track 1");
    }

    #[test]
    fn test_raw_track_info_deserializes_downloadable_true() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist"},
            "artwork_url": null,
            "duration": 180000,
            "downloadable": true,
            "download_url": "https://api-v2.soundcloud.com/tracks/123456/download"
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert!(track.downloadable);
        assert_eq!(
            track.download_url,
            Some("https://api-v2.soundcloud.com/tracks/123456/download".to_string())
        );
    }

    #[test]
    fn test_raw_track_info_deserializes_downloadable_missing() {
        let json = r#"{
            "id": 123456,
            "title": "Test Track",
            "user": {"username": "test_artist"},
            "artwork_url": null,
            "duration": 180000
        }"#;
        let raw: RawTrackInfo = serde_json::from_str(json).unwrap();
        let track = TrackInfo::from(raw);
        assert!(!track.downloadable);
        assert!(track.download_url.is_none());
    }
}
