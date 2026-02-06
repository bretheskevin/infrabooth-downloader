use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::services::oauth::{build_auth_url, exchange_code, fetch_user_profile, generate_pkce, get_client_secret};

/// Holds the PKCE code verifier during the OAuth flow.
/// The verifier is stored temporarily between `start_oauth` and `complete_oauth`.
pub struct OAuthState {
    pub verifier: Mutex<Option<String>>,
}

impl Default for OAuthState {
    fn default() -> Self {
        Self {
            verifier: Mutex::new(None),
        }
    }
}

/// Auth state payload emitted to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatePayload {
    pub is_signed_in: bool,
    pub username: Option<String>,
}

/// Event name for auth state changes.
pub const AUTH_STATE_CHANGED_EVENT: &str = "auth-state-changed";

/// Starts the OAuth flow by generating PKCE parameters and returning the auth URL.
///
/// The PKCE code verifier is stored in the app state for later use during token exchange.
///
/// # Returns
/// * `Ok(String)` - The authorization URL to open in the browser
/// * `Err(String)` - Error message if generation fails
#[tauri::command]
pub async fn start_oauth(state: State<'_, OAuthState>) -> Result<String, String> {
    let (verifier, challenge) = generate_pkce();

    // Store the verifier for later use in complete_oauth
    *state.verifier.lock().map_err(|e| e.to_string())? = Some(verifier);

    Ok(build_auth_url(&challenge))
}

/// Completes the OAuth flow by exchanging the authorization code for tokens.
///
/// Retrieves the stored PKCE verifier, exchanges the code for tokens,
/// and emits an auth state change event to the frontend.
///
/// # Arguments
/// * `code` - The authorization code received from the OAuth callback
///
/// # Returns
/// * `Ok(())` - If token exchange succeeds
/// * `Err(String)` - Error message if exchange fails
#[tauri::command]
pub async fn complete_oauth(
    code: String,
    state: State<'_, OAuthState>,
    app: AppHandle,
) -> Result<(), String> {
    // Retrieve and clear the stored verifier
    let verifier = state
        .verifier
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or("No OAuth flow in progress")?;

    // Get client secret from environment
    let client_secret = get_client_secret().map_err(|e| e.to_string())?;

    // Exchange code for tokens
    let tokens = exchange_code(&code, &verifier, &client_secret)
        .await
        .map_err(|e| e.to_string())?;

    // Fetch user profile to get username
    let profile = fetch_user_profile(&tokens.access_token)
        .await
        .map_err(|e| e.to_string())?;

    // Emit success event to frontend with username
    // Note: Token storage will be implemented in Story 2.5
    app.emit(
        AUTH_STATE_CHANGED_EVENT,
        AuthStatePayload {
            is_signed_in: true,
            username: Some(profile.username),
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_oauth_state_default_is_none() {
        let state = OAuthState::default();
        let verifier = state.verifier.lock().unwrap();
        assert!(verifier.is_none());
    }

    #[test]
    fn test_oauth_state_can_store_verifier() {
        let state = OAuthState::default();
        {
            let mut verifier = state.verifier.lock().unwrap();
            *verifier = Some("test_verifier".to_string());
        }
        let verifier = state.verifier.lock().unwrap();
        assert_eq!(verifier.as_deref(), Some("test_verifier"));
    }

    #[test]
    fn test_oauth_state_take_clears_verifier() {
        let state = OAuthState::default();
        {
            let mut verifier = state.verifier.lock().unwrap();
            *verifier = Some("test_verifier".to_string());
        }
        {
            let mut verifier = state.verifier.lock().unwrap();
            let taken = verifier.take();
            assert_eq!(taken, Some("test_verifier".to_string()));
        }
        let verifier = state.verifier.lock().unwrap();
        assert!(verifier.is_none());
    }

    #[test]
    fn test_auth_state_payload_serializes() {
        let payload = AuthStatePayload {
            is_signed_in: true,
            username: Some("testuser".to_string()),
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"username\":\"testuser\""));
    }

    #[test]
    fn test_auth_state_payload_serializes_without_username() {
        let payload = AuthStatePayload {
            is_signed_in: true,
            username: None,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"username\":null"));
    }
}
