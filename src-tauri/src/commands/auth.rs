use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::services::oauth::{
    build_auth_url, exchange_code, fetch_user_profile, generate_pkce, get_client_secret,
    refresh_tokens,
};
use crate::services::storage::{
    calculate_expires_at, delete_tokens, is_token_expired_or_expiring, load_tokens, store_tokens,
    StoredTokens,
};

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

    // Calculate expiry timestamp and store tokens
    let expires_at = calculate_expires_at(tokens.expires_in);
    let stored = StoredTokens {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at,
        username: profile.username.clone(),
    };
    store_tokens(&stored).map_err(|e| e.to_string())?;

    // Emit success event to frontend with username
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

/// Event name emitted when re-authentication is required.
pub const AUTH_REAUTH_NEEDED_EVENT: &str = "auth-reauth-needed";

/// Checks authentication state on app startup.
///
/// Loads stored tokens from the OS keychain, checks if they're valid,
/// and refreshes them if needed. Emits auth state to the frontend.
///
/// # Returns
/// * `Ok(true)` - User is authenticated (tokens valid or refreshed)
/// * `Ok(false)` - User is not authenticated (no tokens or refresh failed)
/// * `Err(String)` - Error during the check
#[tauri::command]
pub async fn check_auth_state(app: AppHandle) -> Result<bool, String> {
    // Try to load stored tokens
    let tokens = match load_tokens() {
        Ok(Some(tokens)) => tokens,
        Ok(None) => {
            // No tokens stored, user is signed out
            emit_signed_out(&app)?;
            return Ok(false);
        }
        Err(e) => {
            // Error loading tokens, treat as signed out
            log::warn!("Error loading tokens: {}", e);
            emit_signed_out(&app)?;
            return Ok(false);
        }
    };

    // Check if token is expired or expiring soon
    if is_token_expired_or_expiring(tokens.expires_at) {
        // Need to refresh
        match refresh_and_store(&tokens, &app).await {
            Ok(new_username) => {
                emit_signed_in(&app, &new_username)?;
                Ok(true)
            }
            Err(e) => {
                // Refresh failed, clean up and sign out
                log::warn!("Token refresh failed: {}", e);
                let _ = delete_tokens();
                emit_signed_out(&app)?;
                app.emit(AUTH_REAUTH_NEEDED_EVENT, ())
                    .map_err(|e| e.to_string())?;
                Ok(false)
            }
        }
    } else {
        // Token still valid
        emit_signed_in(&app, &tokens.username)?;
        Ok(true)
    }
}

/// Refreshes tokens and stores the new ones.
async fn refresh_and_store(tokens: &StoredTokens, _app: &AppHandle) -> Result<String, String> {
    let client_secret = get_client_secret().map_err(|e| e.to_string())?;
    let new_tokens = refresh_tokens(&tokens.refresh_token, &client_secret)
        .await
        .map_err(|e| e.to_string())?;

    let expires_at = calculate_expires_at(new_tokens.expires_in);
    let stored = StoredTokens {
        access_token: new_tokens.access_token,
        refresh_token: new_tokens.refresh_token,
        expires_at,
        username: tokens.username.clone(),
    };
    store_tokens(&stored).map_err(|e| e.to_string())?;

    Ok(tokens.username.clone())
}

/// Emits signed-in auth state to the frontend.
fn emit_signed_in(app: &AppHandle, username: &str) -> Result<(), String> {
    app.emit(
        AUTH_STATE_CHANGED_EVENT,
        AuthStatePayload {
            is_signed_in: true,
            username: Some(username.to_string()),
        },
    )
    .map_err(|e| e.to_string())
}

/// Emits signed-out auth state to the frontend.
fn emit_signed_out(app: &AppHandle) -> Result<(), String> {
    app.emit(
        AUTH_STATE_CHANGED_EVENT,
        AuthStatePayload {
            is_signed_in: false,
            username: None,
        },
    )
    .map_err(|e| e.to_string())
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
