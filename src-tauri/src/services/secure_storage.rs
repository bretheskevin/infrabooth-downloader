/// Secure token storage using system Keyring (macOS Keychain, Windows Credential Manager, Linux Secret Service).
/// Stores OAuth tokens securely instead of in plain memory.
use keyring::Entry;
use log::{debug, warn};
use std::sync::Arc;
use tokio::sync::Mutex;

const SERVICE_NAME: &str = "com.infrabooth.downloader";
const OAUTH_TOKEN_KEY: &str = "oauth_token";

/// Result type for secure storage operations.
pub type Result<T> = std::result::Result<T, SecureStorageError>;

#[derive(Debug, thiserror::Error)]
pub enum SecureStorageError {
    #[error("Keyring error: {0}")]
    KeyringError(String),
    #[error("Token not found in keyring")]
    TokenNotFound,
    #[error("Invalid token format")]
    InvalidFormat,
}

impl From<keyring::Error> for SecureStorageError {
    fn from(err: keyring::Error) -> Self {
        SecureStorageError::KeyringError(err.to_string())
    }
}

/// Securely stores and retrieves OAuth tokens from system keyring.
pub struct SecureTokenStore {
    /// Cached token in memory (for performance, cleared on sign out)
    cached_token: Arc<Mutex<Option<String>>>,
}

impl Default for SecureTokenStore {
    fn default() -> Self {
        Self::new()
    }
}

impl SecureTokenStore {
    /// Create a new secure token store.
    pub fn new() -> Self {
        SecureTokenStore { cached_token: Arc::new(Mutex::new(None)) }
    }

    /// Store OAuth token securely in system keyring.
    pub async fn store_token(&self, token: &str) -> Result<()> {
        // Store in keyring
        let entry = Entry::new(SERVICE_NAME, OAUTH_TOKEN_KEY).map_err(|e| SecureStorageError::KeyringError(e.to_string()))?;
        entry.set_password(token).map_err(|e| SecureStorageError::KeyringError(e.to_string()))?;
        debug!("Token stored in system keyring");

        // Update cache
        let mut cached = self.cached_token.lock().await;
        *cached = Some(token.to_string());

        Ok(())
    }

    /// Retrieve OAuth token from cache or keyring.
    pub async fn retrieve_token(&self) -> Result<String> {
        // Try cache first (fast path)
        {
            let cached = self.cached_token.lock().await;
            if let Some(token) = &*cached {
                return Ok(token.clone());
            }
        }

        // Fall back to keyring
        let entry = Entry::new(SERVICE_NAME, OAUTH_TOKEN_KEY).map_err(|e| SecureStorageError::KeyringError(e.to_string()))?;
        let token = entry.get_password().map_err(|e| SecureStorageError::KeyringError(e.to_string()))?;
        debug!("Token retrieved from system keyring");

        // Update cache
        let mut cached = self.cached_token.lock().await;
        *cached = Some(token.clone());

        Ok(token)
    }

    /// Clear token from keyring and cache.
    pub async fn clear_token(&self) -> Result<()> {
        // Remove from keyring
        let entry = Entry::new(SERVICE_NAME, OAUTH_TOKEN_KEY).map_err(|e| SecureStorageError::KeyringError(e.to_string()))?;
        match entry.delete_password() {
            Ok(_) => {
                debug!("Token deleted from system keyring");
            }
            Err(e) => {
                warn!("Failed to delete token from keyring: {}", e);
            }
        }

        // Clear cache
        let mut cached = self.cached_token.lock().await;
        *cached = None;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_store_and_retrieve() {
        let store = SecureTokenStore::new();
        let token = "test_token_12345";

        store.store_token(token).await.unwrap();
        let retrieved = store.retrieve_token().await.unwrap();

        assert_eq!(retrieved, token);
    }

    #[tokio::test]
    async fn test_clear_token() {
        let store = SecureTokenStore::new();
        store.store_token("test_token").await.unwrap();

        store.clear_token().await.unwrap();

        let result = store.retrieve_token().await;
        assert!(result.is_err());
    }
}
