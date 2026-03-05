# API v2 Stream Resolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace web-scraping-based stream resolution with SoundCloud API v2 calls and dynamic client_id, matching yt-dlp's approach.

**Architecture:** New `client_id.rs` module scrapes client_id from SoundCloud's JS bundles with in-memory caching and auto-refresh on 401/403. Rewritten `stream.rs` uses `api-v2.soundcloud.com/resolve` to get track transcodings, then resolves CDN URLs. Transcoding selection updated to prioritize AAC > Opus > MP3, skip DRM.

**Tech Stack:** Rust, reqwest (already in Cargo.toml), regex (already in Cargo.toml), once_cell (already in Cargo.toml)

**Design doc:** `docs/plans/2026-03-04-api-v2-stream-resolution-design.md`

---

## MANDATORY: Use Serena MCP Tools

This project uses Serena MCP for all codebase interaction. You MUST use these tools:

**Reading/exploring code:**
- `mcp__plugin_serena_serena__get_symbols_overview` — Get high-level view of symbols in a file
- `mcp__plugin_serena_serena__find_symbol` — Find symbols by name path, optionally include body/info
- `mcp__plugin_serena_serena__find_referencing_symbols` — Find references to a symbol
- `mcp__plugin_serena_serena__search_for_pattern` — Regex search across codebase
- `mcp__plugin_serena_serena__list_dir` — List directory contents
- `mcp__plugin_serena_serena__find_file` — Find files by name/mask
- `mcp__plugin_serena_serena__read_file` — Read file contents (use sparingly, prefer symbolic tools)

**Editing code:**
- `mcp__plugin_serena_serena__replace_symbol_body` — Replace an entire symbol's body
- `mcp__plugin_serena_serena__insert_after_symbol` — Insert code after a symbol
- `mcp__plugin_serena_serena__insert_before_symbol` — Insert code before a symbol
- `mcp__plugin_serena_serena__replace_content` — Regex-based content replacement in files
- `mcp__plugin_serena_serena__rename_symbol` — Rename a symbol across the codebase
- `mcp__plugin_serena_serena__create_text_file` — Create new files

**DO NOT use basic Read/Grep/Glob/Edit tools for code interaction. Use Serena MCP equivalents.**

---

## Task 1: Create dynamic client_id module

**Files:**
- Create: `src-tauri/src/services/client_id.rs`
- Modify: `src-tauri/src/services/mod.rs` (add `pub mod client_id;`)

**Dependencies already in Cargo.toml:** `reqwest = "0.11"`, `regex = "1"`, `once_cell = "1"`, `log`

### Step 1: Write the tests first

Create `src-tauri/src/services/client_id.rs` with all unit tests and the module structure. The module needs:

- `get_client_id() -> Result<String, DownloadError>` — returns cached or freshly scraped
- `invalidate_client_id()` — clears the cache
- Internal: `scrape_client_id()` — fetches homepage, parses JS bundles
- Internal: `extract_client_id_from_script(script: &str) -> Option<String>` — regex extraction
- Internal: `extract_script_urls(html: &str) -> Vec<String>` — finds `<script src="...">` tags

```rust
//! Dynamic SoundCloud client_id extraction and caching.
//!
//! Scrapes client_id from SoundCloud's homepage JS bundles, matching yt-dlp's
//! approach. The client_id is cached in memory and auto-refreshed on 401/403.

use std::sync::Mutex;

use once_cell::sync::Lazy;
use regex::Regex;

use crate::models::error::DownloadError;

static CLIENT_ID_CACHE: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

const SOUNDCLOUD_URL: &str = "https://soundcloud.com/";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36";

/// Extract `<script src="...">` URLs from HTML.
fn extract_script_urls(html: &str) -> Vec<String> {
    let re = Regex::new(r#"<script[^>]+src="([^"]+)""#).unwrap();
    re.captures_iter(html)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .collect()
}

/// Extract client_id from a JavaScript source string.
/// Looks for: `client_id:"<32 alphanumeric chars>"` or `client_id: "<32 chars>"`
fn extract_client_id_from_script(script: &str) -> Option<String> {
    let re = Regex::new(r#"client_id\s*:\s*"([0-9a-zA-Z]{32})""#).unwrap();
    re.captures(script).map(|cap| cap[1].to_string())
}

/// Scrape a fresh client_id from SoundCloud's homepage JS bundles.
async fn scrape_client_id() -> Result<String, DownloadError> {
    let client = reqwest::Client::new();

    let html = client
        .get(SOUNDCLOUD_URL)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| DownloadError::StreamResolutionFailed(format!("Failed to fetch SoundCloud homepage: {}", e)))?
        .text()
        .await
        .map_err(|e| DownloadError::StreamResolutionFailed(format!("Failed to read homepage: {}", e)))?;

    let mut script_urls = extract_script_urls(&html);
    // Iterate in reverse order — client_id is usually in later bundles (yt-dlp approach)
    script_urls.reverse();

    for url in &script_urls {
        let script = match client
            .get(url)
            .header("User-Agent", USER_AGENT)
            .send()
            .await
        {
            Ok(resp) => match resp.text().await {
                Ok(text) => text,
                Err(_) => continue,
            },
            Err(_) => continue,
        };

        if let Some(client_id) = extract_client_id_from_script(&script) {
            log::info!("[client_id] Extracted client_id from JS bundle");
            return Ok(client_id);
        }
    }

    Err(DownloadError::StreamResolutionFailed(
        "Unable to extract client_id from SoundCloud JS bundles".to_string(),
    ))
}

/// Get the current client_id, scraping from SoundCloud if not cached.
pub async fn get_client_id() -> Result<String, DownloadError> {
    // Check cache first
    {
        let cache = CLIENT_ID_CACHE.lock().unwrap();
        if let Some(ref id) = *cache {
            return Ok(id.clone());
        }
    }

    // Scrape fresh
    let id = scrape_client_id().await?;

    // Cache it
    {
        let mut cache = CLIENT_ID_CACHE.lock().unwrap();
        *cache = Some(id.clone());
    }

    Ok(id)
}

/// Invalidate the cached client_id, forcing the next call to re-scrape.
pub fn invalidate_client_id() {
    let mut cache = CLIENT_ID_CACHE.lock().unwrap();
    *cache = None;
    log::info!("[client_id] Cache invalidated");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_script_urls_finds_scripts() {
        let html = r#"
            <html>
            <script src="https://a-v2.sndcdn.com/assets/0-abc123.js"></script>
            <script src="https://a-v2.sndcdn.com/assets/1-def456.js"></script>
            </html>
        "#;
        let urls = extract_script_urls(html);
        assert_eq!(urls.len(), 2);
        assert_eq!(urls[0], "https://a-v2.sndcdn.com/assets/0-abc123.js");
        assert_eq!(urls[1], "https://a-v2.sndcdn.com/assets/1-def456.js");
    }

    #[test]
    fn test_extract_script_urls_empty_html() {
        let urls = extract_script_urls("<html></html>");
        assert!(urls.is_empty());
    }

    #[test]
    fn test_extract_script_urls_ignores_inline_scripts() {
        let html = r#"<script>var x = 1;</script>"#;
        let urls = extract_script_urls(html);
        assert!(urls.is_empty());
    }

    #[test]
    fn test_extract_client_id_from_script_standard_format() {
        let script = r#"var config = {client_id:"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"};"#;
        let id = extract_client_id_from_script(script);
        assert_eq!(id, Some("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6".to_string()));
    }

    #[test]
    fn test_extract_client_id_from_script_with_spaces() {
        let script = r#"client_id : "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6""#;
        let id = extract_client_id_from_script(script);
        assert_eq!(id, Some("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6".to_string()));
    }

    #[test]
    fn test_extract_client_id_from_script_no_match() {
        let script = r#"var x = "hello world";"#;
        let id = extract_client_id_from_script(script);
        assert!(id.is_none());
    }

    #[test]
    fn test_extract_client_id_from_script_wrong_length() {
        // Only 16 chars — should not match (need exactly 32)
        let script = r#"client_id:"a1b2c3d4e5f6g7h8""#;
        let id = extract_client_id_from_script(script);
        assert!(id.is_none());
    }

    #[test]
    fn test_extract_client_id_from_script_special_chars_rejected() {
        // Contains special chars — should not match
        let script = r#"client_id:"a1b2c3d4e5f6g7h8!@#$%^&*()_+ab""#;
        let id = extract_client_id_from_script(script);
        assert!(id.is_none());
    }

    #[test]
    fn test_invalidate_client_id_clears_cache() {
        // Set cache
        {
            let mut cache = CLIENT_ID_CACHE.lock().unwrap();
            *cache = Some("test_id_12345678901234567890ab".to_string());
        }
        // Invalidate
        invalidate_client_id();
        // Verify cleared
        let cache = CLIENT_ID_CACHE.lock().unwrap();
        assert!(cache.is_none());
    }
}
```

### Step 2: Register the module

In `src-tauri/src/services/mod.rs`, add `pub mod client_id;` after the existing module declarations (e.g. after `pub mod cancellation;`).

### Step 3: Run tests

Run: `cd src-tauri && cargo test client_id -- --nocapture`
Expected: All 8 tests pass.

### Step 4: Commit

```bash
git add src-tauri/src/services/client_id.rs src-tauri/src/services/mod.rs
git commit -m "feat: add dynamic client_id extraction module (yt-dlp approach)"
```

---

## Task 2: Rewrite stream.rs — API v2 data structures and resolve

**Files:**
- Modify: `src-tauri/src/services/stream.rs` (full rewrite)

This task replaces the hydration-based approach with API v2. The key changes:
1. Remove all HTML parsing code (`fetch_track_stream_data`, `HydrationItem`, `HydrationTrack`, etc.)
2. Remove `WEB_CLIENT_ID` constant
3. Add API v2 data structures
4. Add `fetch_track_data_v2()` using `api-v2.soundcloud.com/resolve`
5. Add retry-with-refresh wrapper

### Step 1: Write the new stream.rs

Replace the entire file content. Here is the complete new implementation:

```rust
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

const API_V2_BASE: &str = "https://api-v2.soundcloud.com";

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
    Http,      // progressive
    Hls,
    HlsAes,   // encrypted HLS
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
///
/// Matches yt-dlp's normalization:
/// - "progressive" → Http
/// - "hls" → Hls
/// - "encrypted-hls" or URL contains "/encrypted-hls" → HlsAes
/// - If URL contains "/hls" and protocol isn't already "hls" → Hls
fn normalize_protocol(protocol: &str, url: &str) -> Protocol {
    // DRM protocols — these will be filtered out
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

    // Skip DRM and broken formats
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
///
/// Priority (matching yt-dlp _DEFAULT_FORMATS):
/// 1. AAC progressive (http_aac)
/// 2. AAC HLS (hls_aac)
/// 3. Opus progressive (http_opus)
/// 4. Opus HLS (hls_opus)
/// 5. MP3 progressive (http_mp3)
/// 6. MP3 HLS (hls_mp3)
///
/// HQ quality is always preferred. DRM and snipped tracks are deprioritized.
pub fn select_best_transcoding(transcodings: &[Transcoding]) -> Option<&Transcoding> {
    if transcodings.is_empty() {
        return None;
    }

    transcodings
        .iter()
        .filter(|t| transcoding_score(t) > -10000)
        .max_by_key(|t| transcoding_score(t))
}

/// Fetch track data from API v2 resolve endpoint.
async fn fetch_track_data_v2(
    track_url: &str,
    client_id: &str,
) -> Result<ApiV2TrackData, DownloadError> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/resolve?url={}&client_id={}",
        API_V2_BASE,
        urlencoding::encode(track_url),
        client_id
    );

    let response = client.get(&url).send().await.map_err(|e| {
        DownloadError::StreamResolutionFailed(format!("Network error: {}", e))
    })?;

    let status = response.status();

    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(DownloadError::RateLimited);
    }
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(DownloadError::TrackUnavailable(
            "Track not found".to_string(),
        ));
    }
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(DownloadError::StreamResolutionFailed(format!(
            "HTTP {}",
            status
        )));
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
) -> Result<String, DownloadError> {
    let client = reqwest::Client::new();

    let separator = if transcoding.url.contains('?') {
        '&'
    } else {
        '?'
    };
    let url = format!(
        "{}{}client_id={}",
        transcoding.url, separator, client_id
    );

    let response = client.get(&url).send().await.map_err(|e| {
        DownloadError::StreamResolutionFailed(format!("Network error: {}", e))
    })?;

    let status = response.status();

    if status == reqwest::StatusCode::FORBIDDEN {
        return Err(DownloadError::GeoBlocked(
            "Stream access forbidden".to_string(),
        ));
    }
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err(DownloadError::StreamResolutionFailed(format!(
            "HTTP {}",
            status
        )));
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(DownloadError::RateLimited);
    }
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(DownloadError::TrackUnavailable(
            "Stream not found".to_string(),
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
pub async fn resolve_stream_url(track_url: &str) -> Result<StreamInfo, DownloadError> {
    for is_first_attempt in [true, false] {
        let cid = client_id::get_client_id().await?;

        let data = match fetch_track_data_v2(track_url, &cid).await {
            Ok(data) => data,
            Err(DownloadError::StreamResolutionFailed(msg))
                if is_first_attempt && (msg.contains("401") || msg.contains("403")) =>
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

        let cdn_url = match resolve_transcoding_url(transcoding, &cid).await {
            Ok(url) => url,
            Err(DownloadError::StreamResolutionFailed(msg))
                if is_first_attempt && (msg.contains("401") || msg.contains("403")) =>
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
```

### Step 2: Verify the `urlencoding` dependency

Check if `urlencoding` is in Cargo.toml. If not, add it:

Run: `cd src-tauri && grep urlencoding Cargo.toml`

If missing, add `urlencoding = "2"` to `[dependencies]` in `src-tauri/Cargo.toml`.

### Step 3: Run tests

Run: `cd src-tauri && cargo test stream -- --nocapture`
Expected: All unit tests pass (deserialization, codec extraction, protocol normalization, transcoding selection).

### Step 4: Run type check

Run: `cd src-tauri && cargo check`
Expected: No errors. The `StreamInfo` return type is unchanged, so `downloader.rs` should compile without changes.

### Step 5: Commit

```bash
git add src-tauri/src/services/stream.rs
git commit -m "feat: rewrite stream resolution to use API v2 (yt-dlp approach)

Replace HTML scraping + hardcoded client_id with:
- API v2 resolve endpoint for track data
- Dynamic client_id with auto-refresh on 401/403
- Updated transcoding priority: AAC > Opus > MP3
- DRM stream detection and filtering
- Geo-restriction detection via policy field"
```

---

## Task 3: Add urlencoding dependency (if needed)

**Files:**
- Modify: `src-tauri/Cargo.toml`

### Step 1: Check if urlencoding exists

Run: `cd src-tauri && grep urlencoding Cargo.toml`

If it exists, skip this task entirely.

### Step 2: Add dependency

Add `urlencoding = "2"` to `[dependencies]` section of `src-tauri/Cargo.toml`.

### Step 3: Verify build

Run: `cd src-tauri && cargo check`
Expected: Compiles successfully.

### Step 4: Commit

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: add urlencoding dependency for API v2 URL encoding"
```

---

## Task 4: Integration test — full cargo check + all tests

**Files:** None (verification only)

### Step 1: Run full type check

Run: `cd src-tauri && cargo check`
Expected: No errors.

### Step 2: Run all Rust tests

Run: `cd src-tauri && cargo test -- --nocapture`
Expected: All tests pass, including existing downloader tests and new stream/client_id tests.

### Step 3: Run frontend type check

Run: `npm run typecheck`
Expected: No errors (no frontend changes were made).

### Step 4: Commit (if any fixups were needed)

Only if steps 1-3 required fixes. Otherwise skip.

---

## Task 5: Manual smoke test

**No code changes.** This is a manual verification step.

### Step 1: Start the app

Run: `npm run tauri dev`

### Step 2: Test with the same track that was failing

Paste: `https://soundcloud.com/ak420-anarkotek/profanation`

Expected behavior:
- Track info loads (via existing playlist.rs — unchanged)
- Download starts (stream resolved via new API v2 path)
- No "Access forbidden" / GEO_BLOCKED error
- FFmpeg downloads and converts to MP3

### Step 3: Check logs for new flow

Look for these log lines:
- `[client_id] Extracted client_id from JS bundle` — first download only
- `[stream] Found N transcodings for track`
- `[stream] Selected transcoding: protocol=..., mime=..., quality=..., preset=...`
- `[stream] Resolved CDN URL (...)`
- `[downloader] Download complete: ...`

### Step 4: Test with a playlist

Test with any SoundCloud playlist URL to verify queue processing still works.

---

## Dependency Graph

```
Task 1 (client_id module)
    ↓
Task 2 (stream.rs rewrite) ← Task 3 (urlencoding dep, if needed)
    ↓
Task 4 (integration verification)
    ↓
Task 5 (manual smoke test)
```

Tasks 1 and 3 can run in parallel. Task 2 depends on both. Tasks 4 and 5 are sequential verification.
