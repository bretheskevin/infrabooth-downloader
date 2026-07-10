//! Dynamic SoundCloud client_id extraction and caching.
//!
//! Scrapes client_id from SoundCloud's homepage JS bundles, matching yt-dlp's
//! approach. The client_id is cached in memory and auto-refreshed on 401/403.

use std::sync::Mutex;

use once_cell::sync::Lazy;
use regex::Regex;

use crate::models::error::DownloadError;
use crate::services::http::SOUNDCLOUD_URL;

static CLIENT_ID_CACHE: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
static SCRIPT_URL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"<script[^>]+src="([^"]+)""#).unwrap());
static CLIENT_ID_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r#"client_id\s*:\s*"([0-9a-zA-Z]{32})""#).unwrap());

/// Extract `<script src="...">` URLs from HTML.
fn extract_script_urls(html: &str) -> Vec<String> {
    SCRIPT_URL_RE.captures_iter(html).filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string())).collect()
}

/// Extract client_id from a JavaScript source string.
/// Looks for: `client_id:"<32 alphanumeric chars>"` or `client_id: "<32 chars>"`
fn extract_client_id_from_script(script: &str) -> Option<String> {
    CLIENT_ID_RE.captures(script).map(|cap| cap[1].to_string())
}

/// Scrape a fresh client_id from SoundCloud's homepage JS bundles.
async fn scrape_client_id() -> Result<String, DownloadError> {
    let client = &*crate::services::http::HTTP_CLIENT;

    let html = client
        .get(SOUNDCLOUD_URL)
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
        let script = match client.get(url).send().await {
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

    Err(DownloadError::StreamResolutionFailed("Unable to extract client_id from SoundCloud JS bundles".to_string()))
}

/// Get the current client_id, scraping from SoundCloud if not cached.
pub async fn get_client_id() -> Result<String, DownloadError> {
    // Check cache first
    {
        let cache = CLIENT_ID_CACHE.lock().expect("client_id cache mutex poisoned");
        if let Some(ref id) = *cache {
            return Ok(id.clone());
        }
    }

    // Scrape fresh
    let id = scrape_client_id().await?;

    // Cache it
    {
        let mut cache = CLIENT_ID_CACHE.lock().expect("client_id cache mutex poisoned");
        *cache = Some(id.clone());
    }

    Ok(id)
}

/// Invalidate the cached client_id, forcing the next call to re-scrape.
pub fn invalidate_client_id() {
    let mut cache = CLIENT_ID_CACHE.lock().expect("client_id cache mutex poisoned");
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
