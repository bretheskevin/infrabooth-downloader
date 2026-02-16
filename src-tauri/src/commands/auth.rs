use serde::Serialize;
use specta::Type;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[cfg(debug_assertions)]
use crate::services::dev_server::start_dev_callback_server;
use crate::services::oauth::{
    build_auth_url, exchange_code, fetch_user_profile, generate_pkce, get_client_secret,
    REDIRECT_URI,
};
use crate::services::storage::{
    calculate_expires_at, delete_tokens, is_token_expired_or_expiring, load_tokens,
    refresh_and_store_tokens, store_tokens, StoredTokens,
};

pub struct OAuthState {
    pub verifier: Mutex<Option<String>>,
    pub redirect_uri: Mutex<Option<String>>,
}

impl Default for OAuthState {
    fn default() -> Self {
        Self {
            verifier: Mutex::new(None),
            redirect_uri: Mutex::new(None),
        }
    }
}

/// Auth state payload emitted to the frontend.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatePayload {
    pub is_signed_in: bool,
    pub username: Option<String>,
    pub plan: Option<String>,
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
#[specta::specta]
pub async fn start_oauth(state: State<'_, OAuthState>, app: AppHandle) -> Result<String, String> {
    let (verifier, challenge) = generate_pkce();

    *state.verifier.lock().map_err(|e| e.to_string())? = Some(verifier);

    let redirect_uri;

    #[cfg(debug_assertions)]
    {
        // Dev mode: use localhost callback server
        let port = start_dev_callback_server(app).await?;
        redirect_uri = format!("http://localhost:{}/callback", port);
        log::info!(
            "[start_oauth] Dev mode: using localhost callback at {}",
            redirect_uri
        );
    }

    #[cfg(not(debug_assertions))]
    {
        // Production: use deep link scheme
        let _ = &app;
        redirect_uri = REDIRECT_URI.to_string();
        log::info!(
            "[start_oauth] Production mode: using deep link {}",
            redirect_uri
        );
    }

    *state.redirect_uri.lock().map_err(|e| e.to_string())? = Some(redirect_uri.clone());

    Ok(build_auth_url(&challenge, &redirect_uri))
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
#[specta::specta]
pub async fn complete_oauth(
    code: String,
    state: State<'_, OAuthState>,
    app: AppHandle,
) -> Result<(), String> {
    log::info!(
        "[complete_oauth] Called with code: {}...",
        &code[..code.len().min(10)]
    );

    let verifier = state
        .verifier
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or("No OAuth flow in progress")?;

    let redirect_uri = state
        .redirect_uri
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .unwrap_or_else(|| REDIRECT_URI.to_string());

    log::info!("[complete_oauth] Using redirect_uri: {}", redirect_uri);

    let client_secret = get_client_secret().map_err(|e: crate::models::AuthError| {
        log::error!("[complete_oauth] Failed to get client secret: {}", e);
        e.to_string()
    })?;

    let tokens = exchange_code(&code, &verifier, &client_secret, &redirect_uri)
        .await
        .map_err(|e| {
            log::error!("[complete_oauth] Token exchange failed: {}", e);
            e.to_string()
        })?;

    log::info!("[complete_oauth] Token exchange succeeded, fetching user profile...");

    // Fetch user profile to get username
    let profile = fetch_user_profile(&tokens.access_token)
        .await
        .map_err(|e| {
            log::error!("[complete_oauth] Profile fetch failed: {}", e);
            e.to_string()
        })?;

    log::info!(
        "[complete_oauth] Got profile for user: {}",
        profile.username
    );

    // Calculate expiry timestamp and store tokens
    let expires_at = calculate_expires_at(tokens.expires_in);
    let stored = StoredTokens {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at,
        username: profile.username.clone(),
        plan: profile.plan.clone(),
    };
    store_tokens(&stored).map_err(|e| e.to_string())?;

    // Emit success event to frontend with username and plan
    app.emit(
        AUTH_STATE_CHANGED_EVENT,
        AuthStatePayload {
            is_signed_in: true,
            username: Some(profile.username),
            plan: profile.plan,
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
#[specta::specta]
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
        match refresh_and_store_tokens(&tokens).await {
            Ok(refreshed) => {
                emit_signed_in(&app, &refreshed.username, &refreshed.plan)?;
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
        emit_signed_in(&app, &tokens.username, &tokens.plan)?;
        Ok(true)
    }
}

/// Emits signed-in auth state to the frontend.
fn emit_signed_in(app: &AppHandle, username: &str, plan: &Option<String>) -> Result<(), String> {
    app.emit(
        AUTH_STATE_CHANGED_EVENT,
        AuthStatePayload {
            is_signed_in: true,
            username: Some(username.to_string()),
            plan: plan.clone(),
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
            plan: None,
        },
    )
    .map_err(|e| e.to_string())
}

/// Signs out the user by deleting stored tokens and emitting signed-out state.
///
/// This command:
/// 1. Deletes tokens from the OS keychain
/// 2. Emits an auth-state-changed event with signed-out state
///
/// # Returns
/// * `Ok(())` - If sign-out succeeds
/// * `Err(String)` - Error message if sign-out fails
#[tauri::command]
#[specta::specta]
pub async fn sign_out(app: AppHandle) -> Result<(), String> {
    // Delete stored tokens from OS keychain
    delete_tokens().map_err(|e| e.to_string())?;

    // Emit signed-out state to frontend
    emit_signed_out(&app)?;

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
            plan: Some("Pro Unlimited".to_string()),
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"username\":\"testuser\""));
        assert!(json.contains("\"plan\":\"Pro Unlimited\""));
    }

    #[test]
    fn test_auth_state_payload_serializes_without_plan() {
        let payload = AuthStatePayload {
            is_signed_in: true,
            username: Some("testuser".to_string()),
            plan: None,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"plan\":null"));
    }

    #[test]
    fn test_sign_out_payload_is_correct() {
        let payload = AuthStatePayload {
            is_signed_in: false,
            username: None,
            plan: None,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":false"));
        assert!(json.contains("\"username\":null"));
        assert!(json.contains("\"plan\":null"));
    }
}
