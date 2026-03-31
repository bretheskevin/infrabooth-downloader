use once_cell::sync::Lazy;

/// Base URL for SoundCloud API v2.
pub const API_V2_BASE: &str = "https://api-v2.soundcloud.com";

/// SoundCloud web-app version sent as `app_version` query parameter.
/// Extracted from the SoundCloud web app bundle (look for `app_version` in network requests).
/// May need periodic updating if SoundCloud rejects older versions.
pub const SC_APP_VERSION: &str = "1774492604";

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

pub fn validate_api_response(status: reqwest::StatusCode) -> Result<(), ApiResponseError> {
    use reqwest::StatusCode;
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
    if status != reqwest::StatusCode::FOUND {
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
