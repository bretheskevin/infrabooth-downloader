use once_cell::sync::Lazy;
use rquest_util::Emulation;

pub const SOUNDCLOUD_URL: &str = "https://soundcloud.com/";

/// Base URL for SoundCloud API v2.
pub const API_V2_BASE: &str = "https://api-v2.soundcloud.com";

/// SoundCloud web-app version sent as `app_version` query parameter.
/// Extracted from the SoundCloud web app bundle (look for `app_version` in network requests).
/// May need periodic updating if SoundCloud rejects older versions.
pub const SC_APP_VERSION: &str = "1775080930";
pub const CHROME_USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

pub const DEFAULT_PAGE_SIZE: usize = 20;
pub const DEFAULT_PAGE_SIZE_STR: &str = "20";

fn skip_tls_verify() -> bool {
    std::env::var("DANGER_SKIP_TLS_VERIFY")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
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
    let normalized = if !url.starts_with("http://") && !url.starts_with("https://") {
        format!("https://{}", url)
    } else {
        url.to_string()
    };
    let parsed = rquest::Url::parse(&normalized).map_err(|e| format!("Invalid URL: {}", e))?;
    if parsed.host_str() != Some("on.soundcloud.com") {
        return Ok(normalized);
    }

    let response = NO_REDIRECT_CLIENT
        .head(normalized.as_str())
        .send()
        .await
        .map_err(|e| format!("Failed to resolve short link: {}", e))?;

    let location = response
        .headers()
        .get("location")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    log::debug!("[http] Short link {} resolved to: {:?}", url, location);

    match location {
        Some(loc) => Ok(loc.split('?').next().unwrap_or(&loc).to_string()),
        None => Err("Short link did not redirect".to_string()),
    }
}

pub static HTTP_CLIENT: Lazy<rquest::Client> = Lazy::new(|| {
    use rquest::header::{HeaderMap, HeaderValue, ORIGIN, REFERER, USER_AGENT};

    let mut headers = HeaderMap::new();
    headers.insert(ORIGIN, HeaderValue::from_static("https://soundcloud.com"));
    headers.insert(REFERER, HeaderValue::from_static("https://soundcloud.com/"));
    headers.insert(USER_AGENT, HeaderValue::from_static(CHROME_USER_AGENT));

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

pub async fn resolve_sc_url<T: serde::de::DeserializeOwned>(
    url: &str,
    client_id: &str,
    oauth_token: Option<&str>,
) -> Result<T, ApiResponseError> {
    let resolve_url = format!(
        "{}/resolve?url={}&client_id={}",
        API_V2_BASE,
        urlencoding::encode(url),
        client_id,
    );

    let response = HTTP_CLIENT
        .get(&resolve_url)
        .with_oauth(oauth_token)
        .send()
        .await
        .map_err(|e| ApiResponseError::FetchFailed(e.to_string()))?;

    let status = response.status();
    if status != rquest::StatusCode::FOUND {
        validate_api_response(status)?;
    }

    let body = response
        .text()
        .await
        .map_err(|e| ApiResponseError::FetchFailed(e.to_string()))?;

    #[derive(serde::Deserialize)]
    struct ResolveRedirect {
        location: Option<String>,
    }

    if let Ok(redirect) = serde_json::from_str::<ResolveRedirect>(&body) {
        if let Some(location) = redirect.location {
            if !location.starts_with(API_V2_BASE) {
                return Err(ApiResponseError::InvalidResponse(
                    "Unexpected redirect domain".to_string(),
                ));
            }

            log::info!("[http] Following resolve redirect to: {}", location);

            let redirect_response = HTTP_CLIENT
                .get(&location)
                .with_oauth(oauth_token)
                .send()
                .await
                .map_err(|e| ApiResponseError::FetchFailed(e.to_string()))?;

            validate_api_response(redirect_response.status())?;

            return redirect_response
                .json()
                .await
                .map_err(|e| ApiResponseError::FetchFailed(e.to_string()));
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
            Some(dd) => self.header("x-datadome-clientid", dd),
            None => self,
        }
    }
}

pub fn build_sc_paginated_url(base_url: &str, client_id: &str) -> Result<rquest::Url, String> {
    rquest::Url::parse_with_params(
        base_url,
        &[
            ("client_id", client_id),
            ("limit", DEFAULT_PAGE_SIZE_STR),
            ("linked_partitioning", "1"),
            ("app_version", SC_APP_VERSION),
            ("app_locale", "en"),
        ],
    )
    .map_err(|e| format!("Failed to build URL: {}", e))
}

#[derive(serde::Deserialize)]
pub struct PaginatedResponse<T> {
    pub collection: Vec<T>,
    pub next_href: Option<String>,
}

pub async fn fetch_all_pages<Raw, T, F, M>(
    initial_url: String,
    token: Option<&str>,
    datadome: Option<&str>,
    label: &str,
    page_size: usize,
    map_item: M,
    on_batch: F,
) -> Result<Vec<T>, String>
where
    Raw: serde::de::DeserializeOwned,
    M: Fn(Raw) -> T,
    F: Fn(&[T]),
{
    let mut all_items = Vec::new();
    let initial_params: Vec<(String, String)> = rquest::Url::parse(&initial_url)
        .map(|u| u.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect())
        .unwrap_or_default();

    let mut next_url: Option<String> = Some(initial_url);

    while let Some(url) = next_url.take() {
        log::info!("[{}] Fetching page {}", label, (all_items.len() / page_size) + 1);

        let response = HTTP_CLIENT
            .get(&url)
            .with_oauth(token)
            .with_datadome(datadome)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch {}: {}", label, e))?;

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
            let items: Vec<T> = api_response.collection.into_iter().map(&map_item).collect();
            on_batch(&items);
            all_items.extend(items);
        }

        next_url = api_response.next_href.map(|href| {
            let mut parsed = rquest::Url::parse(&href).expect("SoundCloud returned invalid next_href URL");
            let existing_keys: std::collections::HashSet<String> =
                parsed.query_pairs().map(|(k, _)| k.into_owned()).collect();
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
    let info = response
        .json::<crate::models::error::RateLimitInfo>()
        .await
        .ok();
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
    response: rquest::Response,
    map_403: Option<fn() -> crate::models::error::DownloadError>,
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
        return Err(DownloadError::StreamResolutionFailed(format!(
            "HTTP {}: {}",
            status, body
        )));
    }

    Ok(response)
}
