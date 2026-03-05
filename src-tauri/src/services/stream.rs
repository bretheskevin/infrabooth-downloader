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

use serde::Deserialize;

use crate::models::error::DownloadError;
use crate::services::client_id;
use crate::services::http::{RequestBuilderExt, API_V2_BASE};

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
    pub is_hls: bool,
}

/// CDN URL response from SoundCloud's media endpoint.
#[derive(Debug, Deserialize)]
struct StreamUrlResponse {
    url: String,
}

/// Media section from API v2 track data.
#[derive(Debug, Deserialize)]
struct MediaInfo {
    transcodings: Vec<Transcoding>,
}

/// Track data from API v2 resolve endpoint.
#[derive(Debug, Deserialize)]
struct ApiV2TrackData {
    media: Option<MediaInfo>,
    /// "BLOCK" if geo-restricted
    policy: Option<String>,
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
/// Higher score = better. Matching yt-dlp's _DEFAULT_FORMATS order:
/// http_aac(12) > hls_aac(11) > http_opus(10) > hls_opus(9) > http_mp3(8) > hls_mp3(7)
///
/// HQ quality adds +100 to the score.
/// Snipped/preview tracks get -1000 penalty.
fn transcoding_score(t: &Transcoding) -> i32 {
    let protocol = normalize_protocol(&t.format.protocol, &t.url);
    let codec = extract_codec(&t.format.mime_type);
    let preset_base = t.preset.split('_').next().unwrap_or("");

    if protocol == Protocol::Unknown {
        return -10000;
    }
    if preset_base == "abr" {
        return -10000;
    }

    let codec_score = match codec {
        Codec::Aac => 4,
        Codec::Opus => 2,
        Codec::Mp3 => 0,
        Codec::Unknown => -1,
    };

    let protocol_score = match protocol {
        Protocol::Http => 1,
        Protocol::Hls => 0,
        Protocol::HlsAes => -1,
        Protocol::Unknown => -2,
    };

    let quality_bonus = if t.quality == "hq" { 100 } else { 0 };
    let snipped_penalty = if t.snipped { -1000 } else { 0 };

    codec_score + protocol_score + quality_bonus + snipped_penalty
}

/// Select the best transcoding from available options.
pub fn select_best_transcoding(transcodings: &[Transcoding]) -> Option<&Transcoding> {
    if transcodings.is_empty() {
        return None;
    }

    transcodings
        .iter()
        .filter(|t| transcoding_score(t) > -10000)
        .max_by_key(|t| transcoding_score(t))
}

/// Check common SoundCloud API error status codes.
///
/// Maps 429→RateLimited, 404→TrackUnavailable, 401→StreamResolutionFailed.
/// Returns `Ok(())` for success status codes.
/// Returns `None` for unhandled error codes (caller should handle 403 and generic failures).
fn check_common_status(status: reqwest::StatusCode) -> Option<DownloadError> {
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Some(DownloadError::RateLimited);
    }
    if status == reqwest::StatusCode::NOT_FOUND {
        return Some(DownloadError::TrackUnavailable("Not found".to_string()));
    }
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Some(DownloadError::StreamResolutionFailed(format!("HTTP {}", status)));
    }
    None
}

/// Fetch track data from API v2 resolve endpoint.
async fn fetch_track_data_v2(
    track_url: &str,
    client_id: &str,
    oauth_token: Option<&str>,
) -> Result<ApiV2TrackData, DownloadError> {
    let client = &*crate::services::http::HTTP_CLIENT;
    let url = format!(
        "{}/resolve?url={}&client_id={}",
        API_V2_BASE,
        urlencoding::encode(track_url),
        client_id
    );

    let response = client
        .get(&url)
        .with_oauth(oauth_token)
        .send()
        .await
        .map_err(|e| {
            DownloadError::StreamResolutionFailed(format!("Network error: {}", e))
        })?;

    let status = response.status();

    if let Some(err) = check_common_status(status) {
        return Err(err);
    }
    if status == reqwest::StatusCode::FORBIDDEN {
        return Err(DownloadError::StreamResolutionFailed(format!("HTTP {}", status)));
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(DownloadError::StreamResolutionFailed(format!(
            "HTTP {}: {}",
            status, body
        )));
    }

    response.json().await.map_err(|e| {
        DownloadError::StreamResolutionFailed(format!("Invalid API response: {}", e))
    })
}

/// Resolve a transcoding URL to an actual CDN stream URL.
async fn resolve_transcoding_url(
    transcoding: &Transcoding,
    client_id: &str,
    oauth_token: Option<&str>,
) -> Result<String, DownloadError> {
    let client = &*crate::services::http::HTTP_CLIENT;

    let separator = if transcoding.url.contains('?') {
        '&'
    } else {
        '?'
    };
    let url = format!(
        "{}{}client_id={}",
        transcoding.url, separator, client_id
    );

    let response = client
        .get(&url)
        .with_oauth(oauth_token)
        .send()
        .await
        .map_err(|e| {
            DownloadError::StreamResolutionFailed(format!("Network error: {}", e))
        })?;

    let status = response.status();

    if let Some(err) = check_common_status(status) {
        return Err(err);
    }
    if status == reqwest::StatusCode::FORBIDDEN {
        return Err(DownloadError::GeoBlocked(
            "Stream access forbidden".to_string(),
        ));
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(DownloadError::StreamResolutionFailed(format!(
            "HTTP {}: {}",
            status, body
        )));
    }

    let stream_response: StreamUrlResponse = response.json().await.map_err(|e| {
        DownloadError::StreamResolutionFailed(format!("Invalid response: {}", e))
    })?;

    Ok(stream_response.url)
}

/// Resolve a SoundCloud track URL to a CDN stream URL.
///
/// This is the main public API. It:
/// 1. Gets a dynamic client_id
/// 2. Calls API v2 resolve to get track data with transcodings
/// 3. Selects the best transcoding
/// 4. Resolves it to a CDN URL
///
/// On 401/403, invalidates client_id and retries once.
pub async fn resolve_stream_url(
    track_url: &str,
    oauth_token: Option<&str>,
) -> Result<StreamInfo, DownloadError> {
    log::info!(
        "[stream] resolve_stream_url called, oauth_token={}",
        if oauth_token.is_some() { "present" } else { "none" }
    );

    for is_first_attempt in [true, false] {
        let cid = client_id::get_client_id().await?;

        let data = match fetch_track_data_v2(track_url, &cid, oauth_token).await {
            Ok(data) => data,
            Err(DownloadError::StreamResolutionFailed(msg))
                if is_first_attempt
                    && oauth_token.is_none()
                    && (msg.contains("401") || msg.contains("403")) =>
            {
                log::warn!("[stream] Got auth error, refreshing client_id and retrying");
                client_id::invalidate_client_id();
                continue;
            }
            Err(e) => return Err(e),
        };

        // Check geo-restriction
        if data.policy.as_deref() == Some("BLOCK") {
            return Err(DownloadError::GeoBlocked(
                "Track unavailable in your region".to_string(),
            ));
        }

        let transcodings = data
            .media
            .map(|m| m.transcodings)
            .unwrap_or_default();

        if transcodings.is_empty() {
            return Err(DownloadError::StreamResolutionFailed(
                "No transcodings available".into(),
            ));
        }

        log::info!(
            "[stream] Found {} transcodings for track",
            transcodings.len()
        );

        let transcoding = select_best_transcoding(&transcodings).ok_or_else(|| {
            DownloadError::StreamResolutionFailed("No suitable transcoding found".into())
        })?;

        let protocol = normalize_protocol(&transcoding.format.protocol, &transcoding.url);

        log::info!(
            "[stream] Selected transcoding: protocol={}, mime={}, quality={}, preset={}",
            transcoding.format.protocol,
            transcoding.format.mime_type,
            transcoding.quality,
            transcoding.preset
        );

        let is_hls = matches!(protocol, Protocol::Hls | Protocol::HlsAes);

        let cdn_url = match resolve_transcoding_url(transcoding, &cid, oauth_token).await {
            Ok(url) => url,
            Err(DownloadError::StreamResolutionFailed(msg))
                if is_first_attempt
                    && oauth_token.is_none()
                    && (msg.contains("401") || msg.contains("403")) =>
            {
                log::warn!("[stream] Got auth error on transcoding resolve, refreshing client_id");
                client_id::invalidate_client_id();
                continue;
            }
            Err(e) => return Err(e),
        };

        log::info!(
            "[stream] Resolved CDN URL ({}...)",
            &cdn_url[..cdn_url.len().min(80)]
        );

        return Ok(StreamInfo {
            url: cdn_url,
            is_hls,
        });
    }

    Err(DownloadError::StreamResolutionFailed(
        "Failed after client_id refresh".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_transcoding(
        protocol: &str,
        mime: &str,
        quality: &str,
        preset: &str,
        snipped: bool,
    ) -> Transcoding {
        Transcoding {
            url: format!(
                "https://api-v2.soundcloud.com/media/test/stream/{}",
                protocol
            ),
            preset: preset.to_string(),
            format: TranscodingFormat {
                protocol: protocol.to_string(),
                mime_type: mime.to_string(),
            },
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
        assert_eq!(
            normalize_protocol("progressive", "https://api.soundcloud.com/media/test"),
            Protocol::Http
        );
    }

    #[test]
    fn test_normalize_protocol_hls() {
        assert_eq!(
            normalize_protocol("hls", "https://api.soundcloud.com/media/test"),
            Protocol::Hls
        );
    }

    #[test]
    fn test_normalize_protocol_encrypted_hls() {
        assert_eq!(
            normalize_protocol("encrypted-hls", "https://api.soundcloud.com/media/test"),
            Protocol::HlsAes
        );
    }

    #[test]
    fn test_normalize_protocol_hls_in_url() {
        assert_eq!(
            normalize_protocol("unknown", "https://api.soundcloud.com/media/test/hls/stream"),
            Protocol::Hls
        );
    }

    #[test]
    fn test_normalize_protocol_drm_ctr() {
        assert_eq!(
            normalize_protocol("ctr-aes-128", "https://api.soundcloud.com/media/test"),
            Protocol::Unknown
        );
    }

    #[test]
    fn test_normalize_protocol_drm_cbc() {
        assert_eq!(
            normalize_protocol("cbc-aes-128", "https://api.soundcloud.com/media/test"),
            Protocol::Unknown
        );
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
}
