use tauri::{AppHandle, Emitter};
use url::Url;

/// Protocol scheme for OAuth callbacks
const SCHEME: &str = "sc-downloader";
/// Host for OAuth callback endpoint (URL parses sc-downloader://auth/callback as host=auth, path=/callback)
const AUTH_HOST: &str = "auth";
/// Path for OAuth callback endpoint
const CALLBACK_PATH: &str = "/callback";
/// Event name emitted to frontend
const AUTH_CALLBACK_EVENT: &str = "auth-callback";

/// Handles incoming deep link URLs.
/// Parses the URL and emits an event to the frontend if it's a valid auth callback.
///
/// # Arguments
/// * `app` - The Tauri app handle for emitting events
/// * `urls` - Vector of URL strings received from the deep link plugin
pub fn handle_deep_link(app: &AppHandle, urls: Vec<String>) {
    for url_str in urls {
        if let Some(code) = extract_auth_code(&url_str) {
            let _ = app.emit(AUTH_CALLBACK_EVENT, code);
        }
    }
}

/// Extracts the authorization code from a deep link URL if valid.
///
/// URL format: sc-downloader://auth/callback?code=xxx
/// - scheme: sc-downloader
/// - host: auth
/// - path: /callback
/// - query: code=xxx
///
/// # Arguments
/// * `url_str` - The URL string to parse
///
/// # Returns
/// * `Some(String)` - The authorization code if URL is a valid auth callback
/// * `None` - If URL is invalid or not an auth callback
fn extract_auth_code(url_str: &str) -> Option<String> {
    let url = Url::parse(url_str).ok()?;

    // Validate scheme
    if url.scheme() != SCHEME {
        return None;
    }

    // Validate host (auth in sc-downloader://auth/callback)
    if url.host_str() != Some(AUTH_HOST) {
        return None;
    }

    // Validate path
    if url.path() != CALLBACK_PATH {
        return None;
    }

    // Extract code parameter
    url.query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_auth_code_valid_url() {
        let url = "sc-downloader://auth/callback?code=abc123";
        let result = extract_auth_code(url);
        assert_eq!(result, Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_auth_code_with_extra_params() {
        let url = "sc-downloader://auth/callback?code=xyz789&state=foo";
        let result = extract_auth_code(url);
        assert_eq!(result, Some("xyz789".to_string()));
    }

    #[test]
    fn test_extract_auth_code_wrong_scheme() {
        let url = "https://auth/callback?code=abc123";
        let result = extract_auth_code(url);
        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_auth_code_wrong_host() {
        let url = "sc-downloader://other/callback?code=abc123";
        let result = extract_auth_code(url);
        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_auth_code_wrong_path() {
        let url = "sc-downloader://auth/other?code=abc123";
        let result = extract_auth_code(url);
        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_auth_code_missing_code() {
        let url = "sc-downloader://auth/callback?state=foo";
        let result = extract_auth_code(url);
        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_auth_code_invalid_url() {
        let url = "not a valid url";
        let result = extract_auth_code(url);
        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_auth_code_empty_code() {
        let url = "sc-downloader://auth/callback?code=";
        let result = extract_auth_code(url);
        assert_eq!(result, Some("".to_string()));
    }
}
