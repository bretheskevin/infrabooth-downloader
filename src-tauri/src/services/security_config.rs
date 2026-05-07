/// Security configuration constants.
/// These settings define the security posture of the application.

/// Minimum token length for validation.
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
    fn test_token_length_reasonable() {
        assert!(MIN_TOKEN_LENGTH >= 32, "Token should be at least 32 chars (256 bits)");
    }
}
