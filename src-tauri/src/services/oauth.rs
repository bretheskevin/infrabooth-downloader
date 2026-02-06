use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::models::AuthError;

/// OAuth configuration constants
pub const CLIENT_ID: &str = "4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv";
pub const REDIRECT_URI: &str = "sc-downloader://auth/callback";
pub const AUTH_URL: &str = "https://api.soundcloud.com/connect";
pub const TOKEN_URL: &str = "https://api.soundcloud.com/oauth2/token";

/// Token response from SoundCloud OAuth token endpoint.
#[derive(Debug, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
    pub token_type: String,
}

/// Generates PKCE code verifier and challenge pair.
///
/// The verifier is a random 64-character alphanumeric string.
/// The challenge is the SHA-256 hash of the verifier, base64url-encoded.
///
/// # Returns
/// A tuple of (code_verifier, code_challenge)
pub fn generate_pkce() -> (String, String) {
    let verifier: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(64)
        .map(char::from)
        .collect();

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

    (verifier, challenge)
}

/// Builds the authorization URL for SoundCloud OAuth.
///
/// # Arguments
/// * `code_challenge` - The PKCE code challenge (SHA-256 hash of verifier)
///
/// # Returns
/// The complete authorization URL to open in the browser
pub fn build_auth_url(code_challenge: &str) -> String {
    format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&code_challenge={}&code_challenge_method=S256",
        AUTH_URL, CLIENT_ID, REDIRECT_URI, code_challenge
    )
}

/// Exchanges an authorization code for access and refresh tokens.
///
/// # Arguments
/// * `code` - The authorization code received from the OAuth callback
/// * `code_verifier` - The PKCE code verifier (original random string)
/// * `client_secret` - The SoundCloud client secret
///
/// # Returns
/// * `Ok(TokenResponse)` - The tokens if exchange succeeds
/// * `Err(AuthError)` - Error details if exchange fails
pub async fn exchange_code(
    code: &str,
    code_verifier: &str,
    client_secret: &str,
) -> Result<TokenResponse, AuthError> {
    let client = reqwest::Client::new();
    let response = client
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "authorization_code"),
            ("client_id", CLIENT_ID),
            ("client_secret", client_secret),
            ("redirect_uri", REDIRECT_URI),
            ("code", code),
            ("code_verifier", code_verifier),
        ])
        .send()
        .await?;

    if response.status().is_success() {
        Ok(response.json().await?)
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(AuthError::TokenExchangeFailed(format!(
            "HTTP {}: {}",
            status, body
        )))
    }
}

/// Retrieves the client secret from environment variable.
///
/// # Returns
/// * `Ok(String)` - The client secret
/// * `Err(AuthError)` - If SOUNDCLOUD_CLIENT_SECRET is not set
pub fn get_client_secret() -> Result<String, AuthError> {
    std::env::var("SOUNDCLOUD_CLIENT_SECRET").map_err(|_| AuthError::MissingClientSecret)
}

#[cfg(test)]
mod tests {
    use super::*;

    // PKCE tests
    #[test]
    fn test_generate_pkce_verifier_length() {
        let (verifier, _) = generate_pkce();
        assert_eq!(verifier.len(), 64);
    }

    #[test]
    fn test_generate_pkce_verifier_is_alphanumeric() {
        let (verifier, _) = generate_pkce();
        assert!(verifier.chars().all(|c| c.is_alphanumeric()));
    }

    #[test]
    fn test_generate_pkce_challenge_is_base64url() {
        let (_, challenge) = generate_pkce();
        // base64url uses A-Z, a-z, 0-9, -, _ (no padding)
        assert!(challenge.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_'));
    }

    #[test]
    fn test_generate_pkce_challenge_is_sha256_length() {
        let (_, challenge) = generate_pkce();
        // SHA-256 = 32 bytes, base64url encoded = 43 chars (without padding)
        assert_eq!(challenge.len(), 43);
    }

    #[test]
    fn test_generate_pkce_produces_unique_values() {
        let (verifier1, challenge1) = generate_pkce();
        let (verifier2, challenge2) = generate_pkce();
        assert_ne!(verifier1, verifier2);
        assert_ne!(challenge1, challenge2);
    }

    #[test]
    fn test_generate_pkce_verifier_hashes_to_challenge() {
        let (verifier, challenge) = generate_pkce();

        // Verify that hashing the verifier produces the challenge
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let computed_challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

        assert_eq!(challenge, computed_challenge);
    }

    #[test]
    fn test_build_auth_url_contains_client_id() {
        let url = build_auth_url("test_challenge");
        assert!(url.contains(&format!("client_id={}", CLIENT_ID)));
    }

    #[test]
    fn test_build_auth_url_contains_redirect_uri() {
        let url = build_auth_url("test_challenge");
        assert!(url.contains(&format!("redirect_uri={}", REDIRECT_URI)));
    }

    #[test]
    fn test_build_auth_url_contains_response_type_code() {
        let url = build_auth_url("test_challenge");
        assert!(url.contains("response_type=code"));
    }

    #[test]
    fn test_build_auth_url_contains_code_challenge() {
        let challenge = "abc123_challenge";
        let url = build_auth_url(challenge);
        assert!(url.contains(&format!("code_challenge={}", challenge)));
    }

    #[test]
    fn test_build_auth_url_contains_s256_method() {
        let url = build_auth_url("test_challenge");
        assert!(url.contains("code_challenge_method=S256"));
    }

    #[test]
    fn test_build_auth_url_starts_with_soundcloud_connect() {
        let url = build_auth_url("test_challenge");
        assert!(url.starts_with(AUTH_URL));
    }

    // Client secret tests
    #[test]
    fn test_get_client_secret_returns_value_when_set() {
        std::env::set_var("SOUNDCLOUD_CLIENT_SECRET", "test_secret_123");
        let result = get_client_secret();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test_secret_123");
        std::env::remove_var("SOUNDCLOUD_CLIENT_SECRET");
    }

    #[test]
    fn test_get_client_secret_returns_error_when_not_set() {
        std::env::remove_var("SOUNDCLOUD_CLIENT_SECRET");
        let result = get_client_secret();
        assert!(result.is_err());
    }
}
