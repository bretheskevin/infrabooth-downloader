//! Secure token storage using OS keychain.
//!
//! This module provides encrypted token persistence using the operating system's
//! native credential storage (Keychain on macOS, Credential Manager on Windows,
//! Secret Service on Linux).

use keyring::Entry;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Service name for keychain entries.
const SERVICE_NAME: &str = "com.infrabooth.downloader";

/// Account name for the OAuth tokens entry.
const TOKENS_ACCOUNT: &str = "oauth_tokens";

/// Errors that can occur during storage operations.
#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Keychain error: {0}")]
    KeychainError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("No tokens stored")]
    NoTokensStored,
}

impl From<keyring::Error> for StorageError {
    fn from(err: keyring::Error) -> Self {
        StorageError::KeychainError(err.to_string())
    }
}

/// Stored OAuth tokens with metadata.
///
/// Contains all token data needed to authenticate API requests
/// and refresh tokens when they expire.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTokens {
    /// The OAuth access token for API calls.
    pub access_token: String,

    /// The OAuth refresh token (single-use).
    pub refresh_token: String,

    /// Unix timestamp when the access token expires.
    pub expires_at: u64,

    /// Cached username to avoid profile fetch on startup.
    pub username: String,
}

/// Stores OAuth tokens securely in the OS keychain.
///
/// Tokens are serialized to JSON and stored in the native credential store.
/// On macOS this uses Keychain Services, on Windows the Credential Manager,
/// and on Linux the Secret Service (D-Bus).
///
/// # Arguments
/// * `tokens` - The tokens to store
///
/// # Returns
/// * `Ok(())` - If tokens were stored successfully
/// * `Err(StorageError)` - If storage failed
pub fn store_tokens(tokens: &StoredTokens) -> Result<(), StorageError> {
    let entry = Entry::new(SERVICE_NAME, TOKENS_ACCOUNT)?;
    let json = serde_json::to_string(tokens)?;
    entry.set_password(&json)?;
    Ok(())
}

/// Loads OAuth tokens from the OS keychain.
///
/// # Returns
/// * `Ok(Some(StoredTokens))` - If tokens exist and were loaded
/// * `Ok(None)` - If no tokens are stored
/// * `Err(StorageError)` - If loading failed for another reason
pub fn load_tokens() -> Result<Option<StoredTokens>, StorageError> {
    let entry = Entry::new(SERVICE_NAME, TOKENS_ACCOUNT)?;
    match entry.get_password() {
        Ok(json) => {
            let tokens: StoredTokens = serde_json::from_str(&json)?;
            Ok(Some(tokens))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(StorageError::from(e)),
    }
}

/// Deletes stored OAuth tokens from the OS keychain.
///
/// This should be called during sign-out to ensure credentials
/// are completely removed.
///
/// # Returns
/// * `Ok(())` - If tokens were deleted or didn't exist
/// * `Err(StorageError)` - If deletion failed
pub fn delete_tokens() -> Result<(), StorageError> {
    let entry = Entry::new(SERVICE_NAME, TOKENS_ACCOUNT)?;
    match entry.delete_password() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted, that's fine
        Err(e) => Err(StorageError::from(e)),
    }
}

/// Calculates the expiry timestamp from an `expires_in` duration.
///
/// # Arguments
/// * `expires_in` - Token validity duration in seconds
///
/// # Returns
/// Unix timestamp when the token will expire
pub fn calculate_expires_at(expires_in: u64) -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("System time before Unix epoch")
        .as_secs()
        + expires_in
}

/// Gets the current Unix timestamp.
///
/// # Returns
/// Current time as Unix timestamp in seconds
pub fn current_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("System time before Unix epoch")
        .as_secs()
}

/// Checks if a token is expired or expiring soon.
///
/// Uses a 5-minute buffer to proactively refresh tokens
/// before they actually expire.
///
/// # Arguments
/// * `expires_at` - The token's expiry timestamp
///
/// # Returns
/// `true` if the token is expired or will expire within 5 minutes
pub fn is_token_expired_or_expiring(expires_at: u64) -> bool {
    const REFRESH_BUFFER_SECONDS: u64 = 300; // 5 minutes
    let now = current_timestamp();
    expires_at <= now + REFRESH_BUFFER_SECONDS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stored_tokens_serializes_correctly() {
        let tokens = StoredTokens {
            access_token: "access_123".to_string(),
            refresh_token: "refresh_456".to_string(),
            expires_at: 1234567890,
            username: "testuser".to_string(),
        };

        let json = serde_json::to_string(&tokens).unwrap();
        assert!(json.contains("\"access_token\":\"access_123\""));
        assert!(json.contains("\"refresh_token\":\"refresh_456\""));
        assert!(json.contains("\"expires_at\":1234567890"));
        assert!(json.contains("\"username\":\"testuser\""));
    }

    #[test]
    fn test_stored_tokens_deserializes_correctly() {
        let json = r#"{
            "access_token": "access_123",
            "refresh_token": "refresh_456",
            "expires_at": 1234567890,
            "username": "testuser"
        }"#;

        let tokens: StoredTokens = serde_json::from_str(json).unwrap();
        assert_eq!(tokens.access_token, "access_123");
        assert_eq!(tokens.refresh_token, "refresh_456");
        assert_eq!(tokens.expires_at, 1234567890);
        assert_eq!(tokens.username, "testuser");
    }

    #[test]
    fn test_calculate_expires_at_adds_duration() {
        let now = current_timestamp();
        let expires_in = 3600; // 1 hour
        let expires_at = calculate_expires_at(expires_in);

        // Should be approximately now + 3600, allow 1 second tolerance
        assert!(expires_at >= now + expires_in - 1);
        assert!(expires_at <= now + expires_in + 1);
    }

    #[test]
    fn test_current_timestamp_is_reasonable() {
        let timestamp = current_timestamp();
        // Should be after 2020-01-01 00:00:00 UTC (1577836800)
        assert!(timestamp > 1577836800);
        // Should be before 2100-01-01 00:00:00 UTC (4102444800)
        assert!(timestamp < 4102444800);
    }

    #[test]
    fn test_is_token_expired_when_expired() {
        let now = current_timestamp();
        let expired_at = now - 100; // 100 seconds ago
        assert!(is_token_expired_or_expiring(expired_at));
    }

    #[test]
    fn test_is_token_expired_when_expiring_soon() {
        let now = current_timestamp();
        let expiring_at = now + 200; // 200 seconds from now (within 5 min buffer)
        assert!(is_token_expired_or_expiring(expiring_at));
    }

    #[test]
    fn test_is_token_not_expired_when_valid() {
        let now = current_timestamp();
        let valid_at = now + 3600; // 1 hour from now
        assert!(!is_token_expired_or_expiring(valid_at));
    }

    #[test]
    fn test_is_token_expired_at_buffer_boundary() {
        let now = current_timestamp();
        // Exactly at the 5-minute buffer boundary
        let at_boundary = now + 300;
        assert!(is_token_expired_or_expiring(at_boundary));

        // Just past the buffer
        let past_boundary = now + 301;
        assert!(!is_token_expired_or_expiring(past_boundary));
    }

    #[test]
    fn test_storage_error_from_keyring_error() {
        // Test that keyring errors convert to StorageError
        let keyring_err = keyring::Error::NoEntry;
        let storage_err: StorageError = keyring_err.into();
        assert!(matches!(storage_err, StorageError::KeychainError(_)));
    }

    #[test]
    fn test_storage_error_from_serde_error() {
        // Test that serde errors convert to StorageError
        let result: Result<StoredTokens, serde_json::Error> = serde_json::from_str("invalid json");
        let serde_err = result.unwrap_err();
        let storage_err: StorageError = serde_err.into();
        assert!(matches!(storage_err, StorageError::SerializationError(_)));
    }

    // Note: Integration tests for store_tokens/load_tokens/delete_tokens
    // require actual keychain access and are environment-dependent.
    // They should be run manually or in CI with appropriate permissions.
}
