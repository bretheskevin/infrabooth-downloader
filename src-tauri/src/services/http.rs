use once_cell::sync::Lazy;

/// Base URL for SoundCloud API v2.
pub const API_V2_BASE: &str = "https://api-v2.soundcloud.com";

pub static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    use reqwest::header::{HeaderMap, HeaderValue, ORIGIN, REFERER, USER_AGENT};

    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ),
    );
    headers.insert(ORIGIN, HeaderValue::from_static("https://soundcloud.com"));
    headers.insert(REFERER, HeaderValue::from_static("https://soundcloud.com/"));

    reqwest::Client::builder()
        .default_headers(headers)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client")
});

pub trait RequestBuilderExt {
    fn with_oauth(self, token: Option<&str>) -> Self;
}

impl RequestBuilderExt for reqwest::RequestBuilder {
    fn with_oauth(self, token: Option<&str>) -> Self {
        match token {
            Some(t) => self.header("Authorization", format!("OAuth {}", t)),
            None => self,
        }
    }
}

pub async fn parse_rate_limit_response(response: reqwest::Response) -> crate::models::error::DownloadError {
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
    response: reqwest::Response,
    map_403: Option<fn() -> crate::models::error::DownloadError>,
) -> Result<reqwest::Response, crate::models::error::DownloadError> {
    use crate::models::error::DownloadError;

    let status = response.status();

    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(parse_rate_limit_response(response).await);
    }
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(DownloadError::TrackUnavailable("Not found".to_string()));
    }
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err(DownloadError::StreamResolutionFailed(format!("HTTP {}", status)));
    }
    if status == reqwest::StatusCode::FORBIDDEN {
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
