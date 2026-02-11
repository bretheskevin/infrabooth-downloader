use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use url::Url;

use crate::models::AuthError;

/// OAuth configuration constants
pub const CLIENT_ID: &str = "4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv";
pub const REDIRECT_URI: &str = "ib-downloader://auth/callback";
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
pub fn build_auth_url(code_challenge: &str, redirect_uri: &str) -> String {
    let mut url = Url::parse(AUTH_URL).expect("AUTH_URL is a valid URL");
    url.query_pairs_mut()
        .append_pair("client_id", CLIENT_ID)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("code_challenge", code_challenge)
        .append_pair("code_challenge_method", "S256")
        // Request all available scopes including premium streaming access
        .append_pair("scope", "*");
    url.to_string()
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
    redirect_uri: &str,
) -> Result<TokenResponse, AuthError> {
    let client = reqwest::Client::new();
    let response = client
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "authorization_code"),
            ("client_id", CLIENT_ID),
            ("client_secret", client_secret),
            ("redirect_uri", redirect_uri),
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

/// Returns the client secret embedded at compile time from .env.
///
/// # Returns
/// * `Ok(&str)` - The client secret
/// * `Err(AuthError)` - If SOUNDCLOUD_CLIENT_SECRET was not set at compile time
pub fn get_client_secret() -> Result<&'static str, AuthError> {
    let secret = option_env!("SOUNDCLOUD_CLIENT_SECRET").ok_or(AuthError::MissingClientSecret)?;
    if secret.is_empty() || secret == "your_client_secret_here" {
        return Err(AuthError::MissingClientSecret);
    }
    Ok(secret)
}

/// User profile response from SoundCloud /me endpoint.
#[derive(Debug, Deserialize)]
pub struct UserProfile {
    pub username: String,
    pub avatar_url: Option<String>,
    pub plan: Option<String>,
}

/// Refreshes OAuth tokens using a refresh token.
///
/// Note: SoundCloud refresh tokens are single-use. After a successful refresh,
/// the old refresh token is invalid and must be replaced with the new one.
///
/// # Arguments
/// * `refresh_token` - The current refresh token
/// * `client_secret` - The SoundCloud client secret
///
/// # Returns
/// * `Ok(TokenResponse)` - New tokens if refresh succeeds
/// * `Err(AuthError)` - Error if refresh fails (e.g., invalid token)
pub async fn refresh_tokens(
    refresh_token: &str,
    client_secret: &str,
) -> Result<TokenResponse, AuthError> {
    let client = reqwest::Client::new();
    let response = client
        .post(TOKEN_URL)
        .form(&[
            ("grant_type", "refresh_token"),
            ("client_id", CLIENT_ID),
            ("client_secret", client_secret),
            ("refresh_token", refresh_token),
        ])
        .send()
        .await?;

    if response.status().is_success() {
        Ok(response.json().await?)
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(AuthError::RefreshFailed(format!("HTTP {}: {}", status, body)))
    }
}

/// Fetches the authenticated user's profile from SoundCloud.
///
/// # Arguments
/// * `access_token` - The OAuth access token
///
/// # Returns
/// * `Ok(UserProfile)` - The user's profile data
/// * `Err(AuthError)` - Error if fetch fails
pub async fn fetch_user_profile(access_token: &str) -> Result<UserProfile, AuthError> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.soundcloud.com/me")
        .header("Authorization", format!("OAuth {}", access_token))
        .send()
        .await?;

    if response.status().is_success() {
        Ok(response.json().await?)
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(AuthError::ProfileFetchFailed(format!(
            "HTTP {}: {}",
            status, body
        )))
    }
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
        let url = build_auth_url("test_challenge", REDIRECT_URI);
        assert!(url.contains(&format!("client_id={}", CLIENT_ID)));
    }

    #[test]
    fn test_build_auth_url_contains_redirect_uri() {
        let url_str = build_auth_url("test_challenge", REDIRECT_URI);
        let url = Url::parse(&url_str).unwrap();
        let redirect_uri: String = url
            .query_pairs()
            .find(|(k, _)| k == "redirect_uri")
            .map(|(_, v)| v.to_string())
            .unwrap();
        assert_eq!(redirect_uri, REDIRECT_URI);
    }

    #[test]
    fn test_build_auth_url_contains_response_type_code() {
        let url = build_auth_url("test_challenge", REDIRECT_URI);
        assert!(url.contains("response_type=code"));
    }

    #[test]
    fn test_build_auth_url_contains_code_challenge() {
        let challenge = "abc123_challenge";
        let url = build_auth_url(challenge, REDIRECT_URI);
        assert!(url.contains(&format!("code_challenge={}", challenge)));
    }

    #[test]
    fn test_build_auth_url_contains_s256_method() {
        let url = build_auth_url("test_challenge", REDIRECT_URI);
        assert!(url.contains("code_challenge_method=S256"));
    }

    #[test]
    fn test_build_auth_url_starts_with_soundcloud_connect() {
        let url = build_auth_url("test_challenge", REDIRECT_URI);
        assert!(url.starts_with(AUTH_URL));
    }

    // Client secret tests
    #[test]
    fn test_get_client_secret_returns_value_when_embedded() {
        // The .env file should provide SOUNDCLOUD_CLIENT_SECRET at compile time
        let result = get_client_secret();
        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }

    // UserProfile tests
    #[test]
    fn test_user_profile_deserializes_with_all_fields() {
        let json = r#"{
            "username": "test_user",
            "avatar_url": "https://example.com/avatar.jpg",
            "plan": "Pro Unlimited"
        }"#;
        let profile: UserProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.username, "test_user");
        assert_eq!(profile.avatar_url, Some("https://example.com/avatar.jpg".to_string()));
        assert_eq!(profile.plan, Some("Pro Unlimited".to_string()));
    }

    #[test]
    fn test_user_profile_deserializes_with_optional_fields_missing() {
        let json = r#"{"username": "minimal_user"}"#;
        let profile: UserProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.username, "minimal_user");
        assert!(profile.avatar_url.is_none());
        assert!(profile.plan.is_none());
    }

    #[test]
    fn test_user_profile_deserializes_with_null_optional_fields() {
        let json = r#"{
            "username": "null_user",
            "avatar_url": null,
            "plan": null
        }"#;
        let profile: UserProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.username, "null_user");
        assert!(profile.avatar_url.is_none());
        assert!(profile.plan.is_none());
    }
}
