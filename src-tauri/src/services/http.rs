use once_cell::sync::Lazy;

/// Base URL for SoundCloud API v2.
pub const API_V2_BASE: &str = "https://api-v2.soundcloud.com";

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
