use crate::models::error::AuthError;
use crate::services::client_id::get_client_id;
use crate::services::http::HTTP_CLIENT;
use serde::Deserialize;

/// User profile response from SoundCloud `/me` endpoint (API v2).
#[derive(Debug, Deserialize)]
pub struct UserProfile {
    pub username: String,
    pub avatar_url: Option<String>,
    /// SoundCloud subscription plan (e.g. "Pro Unlimited").
    /// The v2 API returns this as `consumer_plan` in some responses,
    /// but the `/me` endpoint uses `plan`. We accept both via alias.
    #[serde(alias = "consumer_plan")]
    pub plan: Option<String>,
}

/// Verify a cookie token by calling `/me` on API v2.
///
/// Uses both `client_id` (query param) and `Authorization: OAuth <token>` header,
/// matching the pattern used by SoundCloud's web client.
///
/// # Arguments
/// * `oauth_token` - The `oauth_token` cookie value extracted from a browser
///
/// # Returns
/// * `Ok(UserProfile)` - Verified profile data
/// * `Err(AuthError)` - If token is invalid or request fails
pub async fn verify_token(oauth_token: &str) -> Result<UserProfile, AuthError> {
    let client_id = get_client_id()
        .await
        .map_err(|e| AuthError::VerificationFailed(e.to_string()))?;

    let client = &*HTTP_CLIENT;
    let resp = client
        .get("https://api-v2.soundcloud.com/me")
        .query(&[("client_id", client_id.as_str())])
        .header("Authorization", format!("OAuth {}", oauth_token))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(AuthError::VerificationFailed(format!(
            "API returned {}",
            resp.status()
        )));
    }

    resp.json()
        .await
        .map_err(|e| AuthError::ProfileFetchFailed(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_profile_deserializes_with_all_fields() {
        let json = r#"{
            "username": "test_user",
            "avatar_url": "https://example.com/avatar.jpg",
            "plan": "Pro Unlimited"
        }"#;
        let profile: UserProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.username, "test_user");
        assert_eq!(
            profile.avatar_url,
            Some("https://example.com/avatar.jpg".to_string())
        );
        assert_eq!(profile.plan, Some("Pro Unlimited".to_string()));
    }

    #[test]
    fn test_user_profile_deserializes_with_consumer_plan_alias() {
        let json = r#"{
            "username": "test_user",
            "consumer_plan": "Go+"
        }"#;
        let profile: UserProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.username, "test_user");
        assert_eq!(profile.plan, Some("Go+".to_string()));
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
