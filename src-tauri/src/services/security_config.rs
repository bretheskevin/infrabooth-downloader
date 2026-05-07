/// Security configuration constants.
/// These settings define the security posture of the application.

/// Maximum session age in seconds before re-authentication is required.
/// 30 minutes = 1800 seconds
pub const MAX_SESSION_AGE_SECS: u64 = 1800;

/// Inactivity timeout in seconds before automatic logout.
/// 20 minutes = 1200 seconds
pub const INACTIVITY_TIMEOUT_SECS: u64 = 1200;

/// Minimum password/token length for validation (if manual entry is added).
pub const MIN_TOKEN_LENGTH: usize = 32;

/// Maximum allowed download URL length to prevent DoS through excessive URLs.
pub const MAX_URL_LENGTH: usize = 2048;

/// Rate limit: maximum auth attempts per minute.
pub const MAX_AUTH_ATTEMPTS_PER_MINUTE: u32 = 5;

/// Rate limit: minimum seconds between auth attempts.
pub const MIN_AUTH_ATTEMPT_INTERVAL_SECS: u64 = 12;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_timeout_is_reasonable() {
        assert!(MAX_SESSION_AGE_SECS > 300, "Session timeout should be at least 5 minutes");
        assert!(MAX_SESSION_AGE_SECS < 86400, "Session timeout should be less than 24 hours");
    }

    #[test]
    fn test_inactivity_timeout_less_than_session() {
        assert!(INACTIVITY_TIMEOUT_SECS < MAX_SESSION_AGE_SECS, "Inactivity timeout should be less than max session age");
    }

    #[test]
    fn test_token_length_reasonable() {
        assert!(MIN_TOKEN_LENGTH >= 32, "Token should be at least 32 chars (256 bits)");
    }
}
