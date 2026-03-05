use once_cell::sync::Lazy;
use serde::de::DeserializeOwned;

/// Shared HTTP client for connection pooling across all services.
///
/// A single `reqwest::Client` reuses TLS sessions and TCP connections
/// for repeated requests to the same hosts (SoundCloud API, CDN, etc.).
pub static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client")
});

pub async fn handle_json_response<T, E>(
    response: reqwest::Response,
    error_constructor: impl FnOnce(String) -> E,
) -> Result<T, E>
where
    T: DeserializeOwned,
    E: From<reqwest::Error>,
{
    if response.status().is_success() {
        Ok(response.json().await?)
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(error_constructor(format!("HTTP {}: {}", status, body)))
    }
}
