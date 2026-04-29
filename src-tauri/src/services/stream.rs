//! SoundCloud stream URL resolution via API v2.
//!
//! Resolves track transcodings from SoundCloud's API v2 into signed CDN URLs
//! that ffmpeg can download. Matches yt-dlp's approach.
//!
//! Strategy:
//! 1. Dynamically obtain client_id (via client_id module)
//! 2. Call API v2 resolve endpoint to get track data with transcodings
//! 3. Select the best transcoding (AAC > Opus > MP3, progressive > HLS)
//! 4. Resolve the transcoding URL with client_id → CDN URL

use std::collections::HashMap;
use std::sync::Mutex;

use once_cell::sync::Lazy;
use serde::Deserialize;

use crate::models::error::DownloadError;
use crate::services::client_id;
use crate::services::http::{resolve_sc_url, validate_sc_response, ApiResponseError, RequestBuilderExt, API_V2_BASE};

// ---------------------------------------------------------------------------
// Transcodings cache — populated when tracks are fetched for display,
// consumed by resolve_inner to skip the redundant /tracks/{id} fetch.
// ---------------------------------------------------------------------------

/// Maximum number of entries before the cache is cleared to reclaim memory.
const MAX_CACHE_ENTRIES: usize = 500;

static TRANSCODINGS_CACHE: Lazy<Mutex<HashMap<u64, Vec<Transcoding>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

/// Cache transcodings for a track so that playback resolution can skip the
/// track-data fetch. Called by playlist/search services after deserializing
/// the API response.
pub fn cache_transcodings(track_id: u64, transcodings: Vec<Transcoding>) {
    if transcodings.is_empty() {
        return;
    }
    let mut cache = TRANSCODINGS_CACHE.lock().expect("transcodings cache poisoned");
    if cache.len() >= MAX_CACHE_ENTRIES {
        cache.clear();
    }
    cache.insert(track_id, transcodings);
}

/// Take cached transcodings for a track (removes from cache to avoid staleness).
fn take_cached_transcodings(track_id: u64) -> Option<Vec<Transcoding>> {
    let mut cache = TRANSCODINGS_CACHE.lock().expect("transcodings cache poisoned");
    cache.remove(&track_id)
}

/// Format info from a SoundCloud transcoding entry.
#[derive(Debug, Clone, Deserialize)]
pub struct TranscodingFormat {
    pub protocol: String,
    pub mime_type: String,
}

/// A single transcoding option from SoundCloud's media API.
#[derive(Debug, Clone, Deserialize)]
pub struct Transcoding {
    pub url: String,
    pub preset: String,
    pub format: TranscodingFormat,
    pub quality: String,
    #[serde(default)]
    pub snipped: bool,
}

/// Resolved stream info ready for ffmpeg.
#[derive(Debug, Clone)]
pub struct StreamInfo {
    pub url: String,
    pub codec: StreamCodec,
}

/// CDN URL response from SoundCloud's media endpoint.
#[derive(Debug, Deserialize)]
struct StreamUrlResponse {
    url: String,
}

/// Media section from API v2 track data.
/// Reused by playlist/search services for transcodings caching.
#[derive(Debug, Clone, Deserialize)]
pub struct MediaInfo {
    #[serde(default)]
    pub transcodings: Vec<Transcoding>,
}

/// Track data from API v2 resolve endpoint.
#[derive(Debug, Deserialize)]
struct ApiV2TrackData {
    media: Option<MediaInfo>,
    /// "BLOCK" if geo-restricted
    policy: Option<String>,
}

/// Source codec type exposed to consumers (e.g. downloader).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamCodec {
    Mp3,
    Aac,
    Opus,
    Unknown,
}

impl From<Codec> for StreamCodec {
    fn from(c: Codec) -> Self {
        match c {
            Codec::Mp3 => StreamCodec::Mp3,
            Codec::Aac => StreamCodec::Aac,
            Codec::Opus => StreamCodec::Opus,
            Codec::Unknown => StreamCodec::Unknown,
        }
    }
}

/// Normalized codec type for transcoding selection.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Codec {
    Aac,
    Opus,
    Mp3,
    Unknown,
}

/// Normalized protocol type for transcoding selection.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Protocol {
    Http,
    Hls,
    HlsAes,
    Unknown,
}

/// Extract codec from mime_type string.
///
/// Examples:
/// - "audio/mp4; codecs=\"mp4a.40.2\"" → Aac
/// - "audio/ogg; codecs=\"opus\"" → Opus
/// - "audio/mpeg" → Mp3
fn extract_codec(mime_type: &str) -> Codec {
    if mime_type.contains("mp4a") || (mime_type.contains("mp4") && !mime_type.contains("mpeg")) {
        Codec::Aac
    } else if mime_type.contains("opus") {
        Codec::Opus
    } else if mime_type.contains("mpeg") {
        Codec::Mp3
    } else {
        Codec::Unknown
    }
}

/// Normalize protocol from API format.protocol field and URL.
fn normalize_protocol(protocol: &str, url: &str) -> Protocol {
    if protocol.starts_with("ctr-") || protocol.starts_with("cbc-") {
        return Protocol::Unknown;
    }

    if protocol == "encrypted-hls" || url.contains("/encrypted-hls") {
        return Protocol::HlsAes;
    }

    if protocol == "progressive" {
        return Protocol::Http;
    }

    if protocol == "hls" || url.contains("/hls") {
        return Protocol::Hls;
    }

    Protocol::Unknown
}

/// Compute a priority score for a transcoding.
///
/// Higher score = better. `prefer_hls` controls protocol preference:
/// - `false` (downloads): progressive > HLS (matches yt-dlp's _DEFAULT_FORMATS)
/// - `true` (streaming): HLS > progressive (instant playback, only first segment needed)
///
/// HQ quality adds +100 to the score.
/// Snipped/preview tracks get -1000 penalty.
/// HLS Opus is excluded: our bundled ffmpeg cannot handle .opus segments in HLS playlists.
fn score_transcoding(t: &Transcoding, prefer_hls: bool) -> i32 {
    let protocol = normalize_protocol(&t.format.protocol, &t.url);
    let codec = extract_codec(&t.format.mime_type);
    let preset_base = t.preset.split('_').next().unwrap_or("");

    if protocol == Protocol::Unknown {
        return -10000;
    }
    if preset_base == "abr" {
        return -10000;
    }
    // Bundled ffmpeg rejects .opus as HLS segment extension → filter out
    if codec == Codec::Opus && matches!(protocol, Protocol::Hls | Protocol::HlsAes) {
        return -10000;
    }

    let codec_score = match codec {
        Codec::Aac => 4,
        Codec::Opus => 2,
        Codec::Mp3 => 0,
        Codec::Unknown => -1,
    };

    let protocol_score = if prefer_hls {
        match protocol {
            Protocol::Hls => 1,
            Protocol::Http => 0,
            Protocol::HlsAes => -1,
            Protocol::Unknown => -2,
        }
    } else {
        match protocol {
            Protocol::Http => 1,
            Protocol::Hls => 0,
            Protocol::HlsAes => -1,
            Protocol::Unknown => -2,
        }
    };

    let quality_bonus = if t.quality == "hq" {
        100
    } else {
        0
    };
    let snipped_penalty = if t.snipped {
        -1000
    } else {
        0
    };

    codec_score + protocol_score + quality_bonus + snipped_penalty
}

/// Select the best transcoding from available options (prefers progressive for downloads).
#[cfg(test)]
pub fn select_best_transcoding(transcodings: &[Transcoding]) -> Option<&Transcoding> {
    select_best(transcodings, false)
}

fn select_best(transcodings: &[Transcoding], prefer_hls: bool) -> Option<&Transcoding> {
    if transcodings.is_empty() {
        return None;
    }

    transcodings.iter().filter(|t| score_transcoding(t, prefer_hls) > -10000).max_by_key(|t| score_transcoding(t, prefer_hls))
}

// ---------------------------------------------------------------------------
// API v2 fetching (shared by both resolve_stream_url and resolve_playback_url)
// ---------------------------------------------------------------------------

/// Fetch track data from API v2 resolve endpoint.
async fn fetch_track_data_v2(track_url: &str, client_id: &str, oauth_token: Option<&str>) -> Result<ApiV2TrackData, DownloadError> {
    resolve_sc_url(track_url, client_id, oauth_token).await.map_err(|e| match e {
        ApiResponseError::RateLimited => DownloadError::RateLimited(None),
        ApiResponseError::NotFound => DownloadError::TrackUnavailable("Not found".to_string()),
        ApiResponseError::AuthRequired => DownloadError::StreamResolutionFailed("HTTP 401".to_string()),
        ApiResponseError::GeoBlocked => DownloadError::StreamResolutionFailed("HTTP 403".to_string()),
        ApiResponseError::FetchFailed(msg) => DownloadError::StreamResolutionFailed(msg),
        ApiResponseError::InvalidResponse(msg) => DownloadError::StreamResolutionFailed(format!("Invalid API response: {}", msg)),
    })
}

/// Fetch track data directly by numeric ID (skips the resolve redirect).
async fn fetch_track_data_by_id(track_id: u64, client_id: &str, oauth_token: Option<&str>) -> Result<ApiV2TrackData, DownloadError> {
    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!("{}/tracks/{}?client_id={}", API_V2_BASE, track_id, client_id);

    let response = client.get(&url).with_oauth(oauth_token).send().await.map_err(|e| DownloadError::StreamResolutionFailed(format!("Network error: {}", e)))?;

    let response = validate_sc_response(response, None).await?;

    response.json().await.map_err(|e| DownloadError::StreamResolutionFailed(format!("Invalid API response: {}", e)))
}

/// Fetch track data with fallback: try by ID first, then by permalink URL.
async fn fetch_track_data_with_fallback(
    track_id: Option<u64>, permalink_url: &str, cid: &str, oauth_token: Option<&str>,
) -> Result<ApiV2TrackData, DownloadError> {
    if let Some(id) = track_id {
        match fetch_track_data_by_id(id, cid, oauth_token).await {
            Ok(data) => return Ok(data),
            Err(e) => log::debug!("[stream] ID fetch failed, trying permalink: {}", e),
        }
    }

    fetch_track_data_v2(permalink_url, cid, oauth_token).await
}

/// Resolve a transcoding URL to an actual CDN stream URL.
async fn resolve_transcoding_url(transcoding: &Transcoding, client_id: &str, oauth_token: Option<&str>) -> Result<String, DownloadError> {
    let client = &*crate::services::http::HTTP_CLIENT;

    let separator = if transcoding.url.contains('?') {
        '&'
    } else {
        '?'
    };
    let url = format!("{}{}client_id={}", transcoding.url, separator, client_id);

    let response = client.get(&url).with_oauth(oauth_token).send().await.map_err(|e| DownloadError::StreamResolutionFailed(format!("Network error: {}", e)))?;

    fn geo_blocked_403() -> DownloadError {
        DownloadError::GeoBlocked("Stream access forbidden".to_string())
    }

    let response = validate_sc_response(response, Some(geo_blocked_403)).await?;

    let stream_response: StreamUrlResponse = response.json().await.map_err(|e| DownloadError::StreamResolutionFailed(format!("Invalid response: {}", e)))?;

    Ok(stream_response.url)
}

// ---------------------------------------------------------------------------
// Shared resolve core (eliminates duplication between download & playback)
// ---------------------------------------------------------------------------

/// Options for the shared resolve logic.
struct ResolveOptions<'a> {
    /// If set, try direct /tracks/{id} first (faster, no redirect).
    track_id: Option<u64>,
    track_url: &'a str,
    oauth_token: Option<&'a str>,
    /// `false` for downloads (progressive preferred), `true` for streaming (HLS preferred).
    prefer_hls: bool,
}

/// Resolved transcoding result from the shared core.
struct ResolvedTranscoding {
    cdn_url: String,
    codec: StreamCodec,
}

/// Returns true if the error is a 401/403 that should trigger a client_id refresh.
fn is_auth_retry_error(err: &DownloadError) -> bool {
    matches!(err, DownloadError::StreamResolutionFailed(msg) if msg.contains("401") || msg.contains("403"))
}

/// Core resolve logic: fetch track data → select transcoding → resolve CDN URL.
/// Retries once on 401/403 by invalidating client_id (only when no oauth_token).
async fn resolve_inner(opts: ResolveOptions<'_>) -> Result<ResolvedTranscoding, DownloadError> {
    // Fast path: if transcodings were cached (from playlist/search fetch), skip
    // the track-data HTTP call entirely — go straight to transcoding resolution.
    // `mut` so we can `.take()` on first attempt, leaving None for retry.
    let mut cached = opts.track_id.and_then(take_cached_transcodings);

    for is_first_attempt in [true, false] {
        let cid = client_id::get_client_id().await?;

        let transcodings = cached.take().unwrap_or_default();
        if !transcodings.is_empty() {
            log::info!("[stream] Using cached transcodings for track (skipping fetch)");
        }

        let transcodings = if transcodings.is_empty() {
            let track_id_for_fetch = if is_first_attempt {
                opts.track_id
            } else {
                None
            };
            let data = match fetch_track_data_with_fallback(track_id_for_fetch, opts.track_url, &cid, opts.oauth_token).await {
                Ok(data) => data,
                Err(e) if is_first_attempt && opts.oauth_token.is_none() && is_auth_retry_error(&e) => {
                    log::warn!("[stream] Got auth error, refreshing client_id and retrying");
                    client_id::invalidate_client_id();
                    continue;
                }
                Err(e) => return Err(e),
            };

            if data.policy.as_deref() == Some("BLOCK") {
                return Err(DownloadError::GeoBlocked("Track unavailable in your region".to_string()));
            }

            data.media.map(|m| m.transcodings).unwrap_or_default()
        } else {
            transcodings
        };

        if transcodings.is_empty() {
            return Err(DownloadError::StreamResolutionFailed("No transcodings available".into()));
        }

        log::info!("[stream] Found {} transcodings for track", transcodings.len());

        let transcoding =
            select_best(&transcodings, opts.prefer_hls).ok_or_else(|| DownloadError::StreamResolutionFailed("No suitable transcoding found".into()))?;

        log::info!(
            "[stream] Selected transcoding: protocol={}, mime={}, quality={}, preset={}",
            transcoding.format.protocol,
            transcoding.format.mime_type,
            transcoding.quality,
            transcoding.preset
        );

        let cdn_url = match resolve_transcoding_url(transcoding, &cid, opts.oauth_token).await {
            Ok(url) => url,
            Err(e) if is_first_attempt && opts.oauth_token.is_none() && is_auth_retry_error(&e) => {
                log::warn!("[stream] Got auth error on transcoding resolve, refreshing client_id");
                client_id::invalidate_client_id();
                continue;
            }
            Err(e) => return Err(e),
        };

        log::info!("[stream] Resolved CDN URL ({}...)", &cdn_url[..cdn_url.len().min(80)]);

        let codec: StreamCodec = extract_codec(&transcoding.format.mime_type).into();

        return Ok(ResolvedTranscoding { cdn_url, codec });
    }

    Err(DownloadError::StreamResolutionFailed("Failed after client_id refresh".to_string()))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Resolve a SoundCloud track URL to a CDN stream URL for downloading.
///
/// Selects the best progressive transcoding, resolves it to a CDN URL,
/// and returns full stream info including codec for encoding decisions.
/// On 401/403, invalidates client_id and retries once.
pub async fn resolve_stream_url(track_url: &str, oauth_token: Option<&str>) -> Result<StreamInfo, DownloadError> {
    log::info!(
        "[stream] resolve_stream_url called, oauth_token={}",
        if oauth_token.is_some() {
            "present"
        } else {
            "none"
        }
    );

    let resolved = resolve_inner(ResolveOptions { track_id: None, track_url, oauth_token, prefer_hls: false }).await?;

    Ok(StreamInfo { url: resolved.cdn_url, codec: resolved.codec })
}

/// Resolve a SoundCloud track to an HLS playback URL via transcodings.
///
/// Tries direct /tracks/{id} first (faster), then falls back to URL resolve.
/// Selects the best HLS transcoding for browser streaming.
pub async fn resolve_playback_url(track_id: u64, track_url: &str, oauth_token: Option<&str>) -> Result<String, DownloadError> {
    log::info!(
        "[stream] resolve_playback_url called for track_id={}, oauth={}",
        track_id,
        if oauth_token.is_some() {
            "present"
        } else {
            "none"
        }
    );

    let resolved = resolve_inner(ResolveOptions { track_id: Some(track_id), track_url, oauth_token, prefer_hls: true }).await?;

    Ok(resolved.cdn_url)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_transcoding(protocol: &str, mime: &str, quality: &str, preset: &str, snipped: bool) -> Transcoding {
        Transcoding {
            url: format!("https://api-v2.soundcloud.com/media/test/stream/{}", protocol),
            preset: preset.to_string(),
            format: TranscodingFormat { protocol: protocol.to_string(), mime_type: mime.to_string() },
            quality: quality.to_string(),
            snipped,
        }
    }

    // --- Codec extraction tests ---

    #[test]
    fn test_extract_codec_aac() {
        assert_eq!(extract_codec("audio/mp4; codecs=\"mp4a.40.2\""), Codec::Aac);
    }

    #[test]
    fn test_extract_codec_opus() {
        assert_eq!(extract_codec("audio/ogg; codecs=\"opus\""), Codec::Opus);
    }

    #[test]
    fn test_extract_codec_mp3() {
        assert_eq!(extract_codec("audio/mpeg"), Codec::Mp3);
    }

    #[test]
    fn test_extract_codec_unknown() {
        assert_eq!(extract_codec("audio/wav"), Codec::Unknown);
    }

    // --- Protocol normalization tests ---

    #[test]
    fn test_normalize_protocol_progressive() {
        assert_eq!(normalize_protocol("progressive", "https://api.soundcloud.com/media/test"), Protocol::Http);
    }

    #[test]
    fn test_normalize_protocol_hls() {
        assert_eq!(normalize_protocol("hls", "https://api.soundcloud.com/media/test"), Protocol::Hls);
    }

    #[test]
    fn test_normalize_protocol_encrypted_hls() {
        assert_eq!(normalize_protocol("encrypted-hls", "https://api.soundcloud.com/media/test"), Protocol::HlsAes);
    }

    #[test]
    fn test_normalize_protocol_hls_in_url() {
        assert_eq!(normalize_protocol("unknown", "https://api.soundcloud.com/media/test/hls/stream"), Protocol::Hls);
    }

    #[test]
    fn test_normalize_protocol_drm_ctr() {
        assert_eq!(normalize_protocol("ctr-aes-128", "https://api.soundcloud.com/media/test"), Protocol::Unknown);
    }

    #[test]
    fn test_normalize_protocol_drm_cbc() {
        assert_eq!(normalize_protocol("cbc-aes-128", "https://api.soundcloud.com/media/test"), Protocol::Unknown);
    }

    // --- Transcoding selection tests ---

    #[test]
    fn test_select_prefers_aac_over_mp3() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("progressive", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert!(best.format.mime_type.contains("mp4"));
    }

    #[test]
    fn test_select_prefers_progressive_over_hls() {
        let transcodings = vec![
            make_transcoding("hls", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
            make_transcoding("progressive", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert_eq!(best.format.protocol, "progressive");
    }

    #[test]
    fn test_select_prefers_hq_quality() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("hls", "audio/mp4; codecs=\"mp4a.40.2\"", "hq", "aac_hq", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert_eq!(best.quality, "hq");
    }

    #[test]
    fn test_select_filters_snipped() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", true),
            make_transcoding("hls", "audio/mpeg", "sq", "mp3_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert_eq!(best.preset, "mp3_0");
    }

    #[test]
    fn test_select_skips_drm() {
        let transcodings = vec![
            make_transcoding("ctr-aes-128", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
            make_transcoding("hls", "audio/mpeg", "sq", "mp3_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert_eq!(best.preset, "mp3_0");
    }

    #[test]
    fn test_select_skips_abr_preset() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "abr", false),
            make_transcoding("hls", "audio/mpeg", "sq", "mp3_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert_eq!(best.preset, "mp3_0");
    }

    #[test]
    fn test_select_empty_returns_none() {
        let transcodings: Vec<Transcoding> = vec![];
        assert!(select_best_transcoding(&transcodings).is_none());
    }

    #[test]
    fn test_select_all_drm_returns_none() {
        let transcodings = vec![
            make_transcoding("ctr-aes-128", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
            make_transcoding("cbc-aes-128", "audio/mpeg", "sq", "mp3_0", false),
        ];
        assert!(select_best_transcoding(&transcodings).is_none());
    }

    #[test]
    fn test_select_opus_over_mp3() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("progressive", "audio/ogg; codecs=\"opus\"", "sq", "opus_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert!(best.format.mime_type.contains("opus"));
    }

    #[test]
    fn test_select_full_ytdlp_priority_order() {
        // All 6 default formats — should pick http_aac
        let transcodings = vec![
            make_transcoding("hls", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("hls", "audio/ogg; codecs=\"opus\"", "sq", "opus_0", false),
            make_transcoding("progressive", "audio/ogg; codecs=\"opus\"", "sq", "opus_0", false),
            make_transcoding("hls", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
            make_transcoding("progressive", "audio/mp4; codecs=\"mp4a.40.2\"", "sq", "aac_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        assert_eq!(best.format.protocol, "progressive");
        assert!(best.format.mime_type.contains("mp4"));
    }

    #[test]
    fn test_select_skips_hls_opus() {
        // Reproduces the bug: HLS Opus was preferred over progressive MP3
        // but our ffmpeg can't handle .opus segments in HLS playlists
        let transcodings = vec![
            make_transcoding("hls", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0", false),
            make_transcoding("hls", "audio/ogg; codecs=\"opus\"", "sq", "opus_0", false),
        ];
        let best = select_best_transcoding(&transcodings).unwrap();
        // Should pick progressive MP3, not HLS Opus
        assert_eq!(best.format.protocol, "progressive");
        assert!(best.format.mime_type.contains("mpeg"));
    }

    #[test]
    fn test_select_hls_opus_only_returns_none() {
        // If only HLS Opus is available, no suitable transcoding
        let transcodings = vec![make_transcoding("hls", "audio/ogg; codecs=\"opus\"", "sq", "opus_0", false)];
        assert!(select_best_transcoding(&transcodings).is_none());
    }

    // --- API v2 deserialization tests ---

    #[test]
    fn test_api_v2_track_data_deserializes() {
        let json = r#"{
            "media": {
                "transcodings": [
                    {
                        "url": "https://api-v2.soundcloud.com/media/test",
                        "preset": "mp3_0_0",
                        "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
                        "quality": "sq",
                        "snipped": false
                    }
                ]
            },
            "policy": "ALLOW"
        }"#;
        let data: ApiV2TrackData = serde_json::from_str(json).unwrap();
        assert_eq!(data.policy, Some("ALLOW".to_string()));
        assert_eq!(data.media.unwrap().transcodings.len(), 1);
    }

    #[test]
    fn test_api_v2_track_data_blocked_policy() {
        let json = r#"{
            "media": {"transcodings": []},
            "policy": "BLOCK"
        }"#;
        let data: ApiV2TrackData = serde_json::from_str(json).unwrap();
        assert_eq!(data.policy.as_deref(), Some("BLOCK"));
    }

    #[test]
    fn test_api_v2_track_data_no_policy() {
        let json = r#"{
            "media": {"transcodings": []}
        }"#;
        let data: ApiV2TrackData = serde_json::from_str(json).unwrap();
        assert!(data.policy.is_none());
    }

    #[test]
    fn test_api_v2_track_data_no_media() {
        let json = r#"{}"#;
        let data: ApiV2TrackData = serde_json::from_str(json).unwrap();
        assert!(data.media.is_none());
    }

    // --- StreamCodec conversion tests ---

    #[test]
    fn test_stream_codec_from_codec() {
        assert_eq!(StreamCodec::from(Codec::Aac), StreamCodec::Aac);
        assert_eq!(StreamCodec::from(Codec::Opus), StreamCodec::Opus);
        assert_eq!(StreamCodec::from(Codec::Mp3), StreamCodec::Mp3);
        assert_eq!(StreamCodec::from(Codec::Unknown), StreamCodec::Unknown);
    }

    // --- Auth retry helper tests ---

    #[test]
    fn test_is_auth_retry_error_401() {
        assert!(is_auth_retry_error(&DownloadError::StreamResolutionFailed("HTTP 401 Unauthorized".into())));
    }

    #[test]
    fn test_is_auth_retry_error_403() {
        assert!(is_auth_retry_error(&DownloadError::StreamResolutionFailed("HTTP 403 Forbidden".into())));
    }

    #[test]
    fn test_is_auth_retry_error_other() {
        assert!(!is_auth_retry_error(&DownloadError::StreamResolutionFailed("HTTP 500".into())));
        assert!(!is_auth_retry_error(&DownloadError::GeoBlocked("test".into())));
    }
}
