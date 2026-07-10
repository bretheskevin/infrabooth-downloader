use once_cell::sync::Lazy;
use rquest_util::Emulation;

pub const SOUNDCLOUD_URL: &str = "https://soundcloud.com/";

/// Base URL for SoundCloud API v2.
pub const API_V2_BASE: &str = "https://api-v2.soundcloud.com";

/// SoundCloud web-app version sent as `app_version` query parameter.
/// Extracted from the SoundCloud web app bundle (look for `app_version` in network requests).
/// May need periodic updating if SoundCloud rejects older versions.
pub const SC_APP_VERSION: &str = "1783608776";
pub const CHROME_USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

pub const DEFAULT_PAGE_SIZE: usize = 20;
pub const DEFAULT_PAGE_SIZE_STR: &str = "20";

fn skip_tls_verify() -> bool {
    super::config::skip_tls_verify()
}

static NO_REDIRECT_CLIENT: Lazy<rquest::Client> = Lazy::new(|| {
    rquest::Client::builder()
        .redirect(rquest::redirect::Policy::none())
        .cert_verification(!skip_tls_verify())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .expect("Failed to create no-redirect HTTP client")
});

pub async fn expand_short_link(url: &str) -> Result<String, String> {
    let normalized = if !url.starts_with("http://") && !url.starts_with("https://") { format!("https://{}", url) } else { url.to_string() };
    let parsed = rquest::Url::parse(&normalized).map_err(|e| format!("Invalid URL: {}", e))?;
    if parsed.host_str() != Some("on.soundcloud.com") {
        return Ok(normalized);
    }

    let response = NO_REDIRECT_CLIENT.head(normalized.as_str()).send().await.map_err(|e| format!("Failed to resolve short link: {}", e))?;

    let location = response.headers().get("location").and_then(|v| v.to_str().ok()).map(|s| s.to_string());

    log::debug!("[http] Short link {} resolved to: {:?}", url, location);

    match location {
        Some(loc) => Ok(loc.split('?').next().unwrap_or(&loc).to_string()),
        None => Err("Short link did not redirect".to_string()),
    }
}

pub static HTTP_CLIENT: Lazy<rquest::Client> = Lazy::new(|| {
    use rquest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, ORIGIN, REFERER, USER_AGENT};

    let mut headers = HeaderMap::new();
    headers.insert(ORIGIN, HeaderValue::from_static("https://soundcloud.com"));
    headers.insert(REFERER, HeaderValue::from_static("https://soundcloud.com/"));
    headers.insert(USER_AGENT, HeaderValue::from_static(CHROME_USER_AGENT));
    headers.insert(ACCEPT, HeaderValue::from_static("application/json, text/javascript, */*; q=0.1"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("en-US,en;q=0.9"));
    headers.insert(HeaderName::from_static("sec-fetch-dest"), HeaderValue::from_static("empty"));
    headers.insert(HeaderName::from_static("sec-fetch-mode"), HeaderValue::from_static("cors"));
    headers.insert(HeaderName::from_static("sec-fetch-site"), HeaderValue::from_static("same-site"));

    rquest::Client::builder()
        .emulation(Emulation::Chrome136)
        .default_headers(headers)
        .cert_verification(!skip_tls_verify())
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client")
});

pub trait RequestBuilderExt {
    fn with_oauth(self, token: Option<&str>) -> Self;

    /// Attach DataDome bot-protection credentials: the `datadome` cookie and the
    /// `x-datadome-clientid` header (SoundCloud runs DataDome with `sessionByHeader: true`).
    ///
    /// Only call this on DataDome-*protected* endpoints. SoundCloud declares the protected
    /// set in `window.ddoptions.ajaxListenerPath` on its homepage — the authoritative list
    /// (all `strict: true`):
    ///
    /// - `/tracks`, `/tracks/*/comments`
    /// - `/users/*/conversations/*`
    /// - `/me`, `/me/followings/*`, `/me/track_reposts/*`, `/me/track_reposts/*/caption`, `/me/playlist_reposts/*`
    /// - `/users/*/tracks/*`, `/users/*/track_likes/*`, `/users/*/playlist_likes/*`, `/users/*/system_playlist_likes/*`, `/users/*/emails`
    /// - `/playlists`, `/playlists/*`
    /// - `/uploads/*/track-transcoding`, `/uploads/track-upload-policy`
    /// - `/graphql`
    ///
    /// Requests to any other path are not inspected by DataDome, so attaching these
    /// credentials there is inert — do not.
    fn with_datadome(self, datadome: Option<&str>) -> Self;
}

#[derive(Debug)]
pub enum ApiResponseError {
    AuthRequired,
    RateLimited,
    NotFound,
    GeoBlocked,
    FetchFailed(String),
    InvalidResponse(String),
}

impl std::fmt::Display for ApiResponseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AuthRequired => write!(f, "Authentication required"),
            Self::RateLimited => write!(f, "Rate limited by SoundCloud"),
            Self::NotFound => write!(f, "Not found"),
            Self::GeoBlocked => write!(f, "Access forbidden"),
            Self::FetchFailed(msg) => write!(f, "{}", msg),
            Self::InvalidResponse(msg) => write!(f, "Invalid response: {}", msg),
        }
    }
}

impl std::error::Error for ApiResponseError {}

pub fn validate_api_response(status: rquest::StatusCode) -> Result<(), ApiResponseError> {
    use rquest::StatusCode;
    match status {
        StatusCode::TOO_MANY_REQUESTS => Err(ApiResponseError::RateLimited),
        StatusCode::UNAUTHORIZED => Err(ApiResponseError::AuthRequired),
        StatusCode::FORBIDDEN => Err(ApiResponseError::GeoBlocked),
        StatusCode::NOT_FOUND => Err(ApiResponseError::NotFound),
        s if !s.is_success() => Err(ApiResponseError::FetchFailed(format!("HTTP {}", s))),
        _ => Ok(()),
    }
}

/// Append `&secret_token=…` to a URL that already has query parameters.
///
/// No-op when `secret_token` is `None`. Callers must ensure the URL already
/// contains at least one query parameter (e.g. `client_id`).
pub fn append_secret_token(url: &mut String, secret_token: Option<&str>) {
    if let Some(token) = secret_token {
        url.push_str(&format!("&secret_token={}", token));
    }
}

pub fn is_trusted_domain(raw_url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(raw_url) else {
        return false;
    };

    if parsed.scheme() != "https" {
        return false;
    }

    let Some(host) = parsed.host_str() else {
        return false;
    };

    const TRUSTED_DOMAINS: &[&str] = &["api-v2.soundcloud.com", "api.soundcloud.com"];

    if TRUSTED_DOMAINS.contains(&host) {
        return true;
    }

    host == "sndcdn.com" || host.ends_with(".sndcdn.com")
}

pub async fn resolve_sc_url<T: serde::de::DeserializeOwned>(url: &str, client_id: &str, oauth_token: Option<&str>) -> Result<T, ApiResponseError> {
    let resolve_url = format!("{}/resolve?url={}&client_id={}", API_V2_BASE, urlencoding::encode(url), client_id,);

    let response = HTTP_CLIENT.get(&resolve_url).with_oauth(oauth_token).send().await.map_err(|e| ApiResponseError::FetchFailed(e.to_string()))?;

    let status = response.status();
    if status != rquest::StatusCode::FOUND {
        validate_api_response(status)?;
    }

    let body = response.text().await.map_err(|e| ApiResponseError::FetchFailed(e.to_string()))?;

    #[derive(serde::Deserialize)]
    struct ResolveRedirect {
        location: Option<String>,
    }

    if let Ok(redirect) = serde_json::from_str::<ResolveRedirect>(&body) {
        if let Some(location) = redirect.location {
            if !location.starts_with(API_V2_BASE) {
                return Err(ApiResponseError::InvalidResponse("Unexpected redirect domain".to_string()));
            }

            log::info!("[http] Following resolve redirect to: {}", location);

            let redirect_response =
                HTTP_CLIENT.get(&location).with_oauth(oauth_token).send().await.map_err(|e| ApiResponseError::FetchFailed(e.to_string()))?;

            validate_api_response(redirect_response.status())?;

            return redirect_response.json().await.map_err(|e| ApiResponseError::FetchFailed(e.to_string()));
        }
    }

    serde_json::from_str(&body).map_err(|e| ApiResponseError::InvalidResponse(e.to_string()))
}

impl RequestBuilderExt for rquest::RequestBuilder {
    fn with_oauth(self, token: Option<&str>) -> Self {
        match token {
            Some(t) => self.header("Authorization", format!("OAuth {}", t)),
            None => self,
        }
    }

    fn with_datadome(self, datadome: Option<&str>) -> Self {
        match datadome {
            Some(dd) => self.header("x-datadome-clientid", dd).header(rquest::header::COOKIE, format!("datadome={}", dd)),
            None => self,
        }
    }
}

pub fn build_sc_paginated_url(base_url: &str, client_id: &str) -> Result<rquest::Url, String> {
    rquest::Url::parse_with_params(
        base_url,
        &[("client_id", client_id), ("limit", DEFAULT_PAGE_SIZE_STR), ("linked_partitioning", "1"), ("app_version", SC_APP_VERSION), ("app_locale", "en")],
    )
    .map_err(|e| format!("Failed to build URL: {}", e))
}

#[derive(serde::Deserialize)]
pub struct PaginatedResponse<T> {
    pub collection: Vec<T>,
    pub next_href: Option<String>,
}

pub async fn fetch_all_pages<Raw, T, F, M>(
    initial_url: String, token: Option<&str>, datadome: Option<&str>, label: &str, page_size: usize, map_item: M, on_batch: F,
) -> Result<Vec<T>, String>
where
    Raw: serde::de::DeserializeOwned,
    M: Fn(Raw) -> Option<T>,
    F: Fn(&[T]),
{
    let mut all_items = Vec::new();
    let initial_params: Vec<(String, String)> =
        rquest::Url::parse(&initial_url).map(|u| u.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect()).unwrap_or_default();

    let mut next_url: Option<String> = Some(initial_url);

    while let Some(url) = next_url.take() {
        log::info!("[{}] Fetching page {}", label, (all_items.len() / page_size) + 1);

        let response = HTTP_CLIENT.get(&url).with_oauth(token).with_datadome(datadome).send().await.map_err(|e| format!("Failed to fetch {}: {}", label, e))?;

        match validate_api_response(response.status()) {
            Err(ApiResponseError::AuthRequired) if !all_items.is_empty() => {
                log::info!("[{}] Auth required for next page, returning {} items collected so far", label, all_items.len());
                break;
            }
            Err(e) => return Err(e.to_string()),
            Ok(()) => {}
        }

        let body = response.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;

        let api_response: PaginatedResponse<Raw> = serde_json::from_str(&body).map_err(|e| {
            let preview = body.get(..200).unwrap_or(&body);
            log::error!("[{}] Parse error: {} — body preview: {}", label, e, preview);
            format!("Failed to parse {}: {}", label, e)
        })?;

        log::info!("[{}] Fetched {} items, has_more={}", label, api_response.collection.len(), api_response.next_href.is_some());

        if !api_response.collection.is_empty() {
            let items: Vec<T> = api_response.collection.into_iter().filter_map(&map_item).collect();
            on_batch(&items);
            all_items.extend(items);
        }

        next_url = api_response.next_href.map(|href| {
            let mut parsed = rquest::Url::parse(&href).expect("SoundCloud returned invalid next_href URL");
            let existing_keys: std::collections::HashSet<String> = parsed.query_pairs().map(|(k, _)| k.into_owned()).collect();
            {
                let mut pairs = parsed.query_pairs_mut();
                for (k, v) in &initial_params {
                    if !existing_keys.contains(k.as_str()) {
                        pairs.append_pair(k, v);
                    }
                }
            }
            parsed.to_string()
        });
    }

    log::info!("[{}] Completed: {} total items", label, all_items.len());

    Ok(all_items)
}

pub async fn parse_rate_limit_response(response: rquest::Response) -> crate::models::error::DownloadError {
    let info = response.json::<crate::models::error::RateLimitInfo>().await.ok();
    crate::models::error::DownloadError::RateLimited(info)
}

/// Validate a SoundCloud API response, mapping error statuses to DownloadError.
///
/// Handles 429 (rate limit), 404 (not found), 401 (unauthorized),
/// 403 (forbidden/geo-blocked), and other non-success statuses.
///
/// `map_403` controls how 403 is interpreted:
/// - `None`: treated as StreamResolutionFailed (default for track data fetches)
/// - `Some(f)`: custom mapping (e.g. GeoBlocked for transcoding URL resolution)
pub async fn validate_sc_response(
    response: rquest::Response, map_403: Option<fn() -> crate::models::error::DownloadError>,
) -> Result<rquest::Response, crate::models::error::DownloadError> {
    use crate::models::error::DownloadError;

    let status = response.status();

    if status == rquest::StatusCode::TOO_MANY_REQUESTS {
        return Err(parse_rate_limit_response(response).await);
    }
    if status == rquest::StatusCode::NOT_FOUND {
        return Err(DownloadError::TrackUnavailable("Not found".to_string()));
    }
    if status == rquest::StatusCode::UNAUTHORIZED {
        return Err(DownloadError::StreamResolutionFailed(format!("HTTP {}", status)));
    }
    if status == rquest::StatusCode::FORBIDDEN {
        return Err(match map_403 {
            Some(f) => f(),
            None => DownloadError::StreamResolutionFailed(format!("HTTP {}", status)),
        });
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(DownloadError::StreamResolutionFailed(format!("HTTP {}: {}", status, body)));
    }

    Ok(response)
}

pub fn extract_datadome_from_response(response: &rquest::Response) -> Option<String> {
    let result =
        response.headers().get_all("x-set-cookie").iter().chain(response.headers().get_all("set-cookie").iter()).filter_map(|v| v.to_str().ok()).find_map(
            |cookie_str| cookie_str.strip_prefix("datadome=").and_then(|rest| rest.split(';').next()).filter(|v| !v.is_empty()).map(|v| v.to_string()),
        );
    if result.is_some() {
        log::debug!("[http] Extracted updated datadome cookie from response");
    }
    result
}

macro_rules! try_none {
    ($expr:expr) => {
        match $expr {
            Ok(v) => v,
            Err(e) => return (None, Err(e.into())),
        }
    };
}
pub(crate) use try_none;

pub const ANTIBOT_BLOCKED: &str = "ANTIBOT_BLOCKED";

pub fn sanitize_error_body(body: String) -> String {
    if body.contains("captcha-delivery.com") || body.contains("captcha/?initialCid") {
        ANTIBOT_BLOCKED.to_string()
    } else {
        body
    }
}

pub async fn check_api_success<E>(
    response: rquest::Response, entity_id: u64, action: &str, tag: &str, make_error: impl FnOnce(u16, String) -> E,
) -> (Option<String>, Result<(), E>) {
    let new_datadome = extract_datadome_from_response(&response);
    if response.status().is_success() {
        log::info!("[{}] Successfully {} {}", tag, action, entity_id);
        (new_datadome, Ok(()))
    } else {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        log::error!("[{}] Failed to {} {}: HTTP {} - {}", tag, action, entity_id, status, body);
        (new_datadome, Err(make_error(status, sanitize_error_body(body))))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trusted_api_v2() {
        assert!(is_trusted_domain("https://api-v2.soundcloud.com/media/123"));
    }

    #[test]
    fn test_trusted_api_v1() {
        assert!(is_trusted_domain("https://api.soundcloud.com/tracks/123/download"));
    }

    #[test]
    fn test_trusted_cdn_subdomain() {
        assert!(is_trusted_domain("https://cf-hls-media.sndcdn.com/media/abc"));
    }

    #[test]
    fn test_trusted_cdn_bare() {
        assert!(is_trusted_domain("https://sndcdn.com/something"));
    }

    #[test]
    fn test_untrusted_domain() {
        assert!(!is_trusted_domain("https://evil.com/steal-token"));
    }

    #[test]
    fn test_untrusted_http_scheme() {
        assert!(!is_trusted_domain("http://api-v2.soundcloud.com/media/123"));
    }

    #[test]
    fn test_untrusted_subdomain_spoof() {
        assert!(!is_trusted_domain("https://api-v2.soundcloud.com.evil.com/media"));
    }

    #[test]
    fn test_untrusted_suffix_spoof() {
        assert!(!is_trusted_domain("https://notsndcdn.com/media"));
    }

    #[test]
    fn test_invalid_url() {
        assert!(!is_trusted_domain("not-a-url"));
    }
}
