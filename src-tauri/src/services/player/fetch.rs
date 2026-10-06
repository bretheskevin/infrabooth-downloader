use std::time::Duration;

use super::messages::NetworkErrorKind;
use super::ports::CancelScope;
use super::url_prefix;
use crate::services::http::HTTP_CLIENT;

// hls.js counted retries (fragLoadingMaxRetry: 6, manifestLoadingMaxRetry: 4); these count attempts.
pub const SEGMENT_MAX_ATTEMPTS: u32 = 7;
pub const PLAYLIST_MAX_ATTEMPTS: u32 = 5;
pub const PRELOAD_MAX_ATTEMPTS: u32 = 1;
const RETRY_DELAY: Duration = Duration::from_millis(1000);
const MAX_RETRY_DELAY: Duration = Duration::from_millis(8000);

fn retry_delay(failed_attempt: u32) -> Duration {
    RETRY_DELAY.saturating_mul(1 << failed_attempt.saturating_sub(1).min(16)).min(MAX_RETRY_DELAY)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FetchFailure {
    Expired(u16),
    Http(u16),
    Network(String),
    Invalid(String),
    Cancelled,
}

impl FetchFailure {
    pub fn is_retryable(&self) -> bool {
        match self {
            FetchFailure::Network(_) => true,
            FetchFailure::Http(status) => *status >= 500 || *status == 408 || *status == 429,
            _ => false,
        }
    }

    pub fn network_kind(&self) -> Option<NetworkErrorKind> {
        match self {
            FetchFailure::Expired(_) => Some(NetworkErrorKind::Expired),
            FetchFailure::Cancelled => None,
            _ => Some(NetworkErrorKind::Fatal),
        }
    }

    pub fn detail(&self) -> String {
        match self {
            FetchFailure::Expired(status) => format!("HTTP {status} (URL expired)"),
            FetchFailure::Http(status) => format!("HTTP {status}"),
            FetchFailure::Network(message) | FetchFailure::Invalid(message) => message.clone(),
            FetchFailure::Cancelled => "cancelled".into(),
        }
    }
}

pub fn classify_status(status: u16) -> Option<FetchFailure> {
    match status {
        200..=299 => None,
        403 | 410 => Some(FetchFailure::Expired(status)),
        other => Some(FetchFailure::Http(other)),
    }
}

pub fn parse_content_range_total(value: &str) -> Option<u64> {
    value.rsplit('/').next()?.trim().parse().ok()
}

// rquest's Display appends the full request URL, which carries the CDN signature.
fn network_failure(error: rquest::Error) -> FetchFailure {
    FetchFailure::Network(error.without_url().to_string())
}

pub struct FetchedBody {
    pub status: u16,
    pub bytes: Vec<u8>,
    pub total_len: Option<u64>,
}

pub async fn fetch_once(url: &str, range: Option<(u64, u64)>) -> Result<FetchedBody, FetchFailure> {
    let mut request = HTTP_CLIENT.get(url);
    if let Some((start, end)) = range {
        request = request.header("Range", format!("bytes={start}-{end}"));
    }
    let response = request.send().await.map_err(network_failure)?;
    let status = response.status().as_u16();
    if let Some(failure) = classify_status(status) {
        return Err(failure);
    }
    let range_total = response.headers().get("content-range").and_then(|v| v.to_str().ok()).and_then(parse_content_range_total);
    let content_length = response.content_length();
    let bytes = response.bytes().await.map_err(network_failure)?.to_vec();
    let total_len = range_total.or(if status == 200 { content_length.or(Some(bytes.len() as u64)) } else { None });
    Ok(FetchedBody { status, bytes, total_len })
}

pub struct RetryPolicy<'a> {
    pub max_attempts: u32,
    pub cancel: &'a CancelScope,
    pub on_retryable_failure: &'a (dyn Fn(String) + Send + Sync),
}

pub async fn fetch_with_retry(url: &str, range: Option<(u64, u64)>, policy: &RetryPolicy<'_>) -> Result<FetchedBody, FetchFailure> {
    let mut attempt = 0;
    loop {
        attempt += 1;
        if policy.cancel.is_cancelled() {
            return Err(FetchFailure::Cancelled);
        }
        let failure = match fetch_once(url, range).await {
            Ok(body) => return Ok(body),
            Err(failure) => failure,
        };
        log::warn!("[player::fetch] Attempt {}/{} failed for {} (range={:?}): {}", attempt, policy.max_attempts, url_prefix(url), range, failure.detail());
        if !failure.is_retryable() || attempt >= policy.max_attempts {
            return Err(failure);
        }
        (policy.on_retryable_failure)(failure.detail());
        tokio::time::sleep(retry_delay(attempt)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_status_codes() {
        assert_eq!(classify_status(200), None);
        assert_eq!(classify_status(206), None);
        assert_eq!(classify_status(403), Some(FetchFailure::Expired(403)));
        assert_eq!(classify_status(410), Some(FetchFailure::Expired(410)));
        assert_eq!(classify_status(404), Some(FetchFailure::Http(404)));
        assert_eq!(classify_status(503), Some(FetchFailure::Http(503)));
    }

    #[test]
    fn retryable_failures() {
        assert!(FetchFailure::Network("reset".into()).is_retryable());
        assert!(FetchFailure::Http(502).is_retryable());
        assert!(FetchFailure::Http(429).is_retryable());
        assert!(FetchFailure::Http(408).is_retryable());
        assert!(!FetchFailure::Http(404).is_retryable());
        assert!(!FetchFailure::Expired(403).is_retryable());
        assert!(!FetchFailure::Invalid("x".into()).is_retryable());
        assert!(!FetchFailure::Cancelled.is_retryable());
    }

    #[test]
    fn maps_to_network_error_kind() {
        assert_eq!(FetchFailure::Expired(410).network_kind(), Some(NetworkErrorKind::Expired));
        assert_eq!(FetchFailure::Http(500).network_kind(), Some(NetworkErrorKind::Fatal));
        assert_eq!(FetchFailure::Cancelled.network_kind(), None);
    }

    #[test]
    fn retry_delay_backs_off_exponentially_like_hls_js() {
        let delays: Vec<u64> = (1..SEGMENT_MAX_ATTEMPTS).map(|attempt| retry_delay(attempt).as_millis() as u64).collect();
        assert_eq!(delays, vec![1000, 2000, 4000, 8000, 8000, 8000]);
        assert_eq!(retry_delay(u32::MAX), MAX_RETRY_DELAY);
    }

    #[test]
    fn parses_content_range_total() {
        assert_eq!(parse_content_range_total("bytes 0-262143/5242880"), Some(5_242_880));
        assert_eq!(parse_content_range_total("bytes 0-10/*"), None);
        assert_eq!(parse_content_range_total("garbage"), None);
    }
}
