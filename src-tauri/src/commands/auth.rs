use crate::services::cookie::scan_browser_cookies;
use crate::services::oauth::verify_token;
use crate::services::storage::{AuthState, CachedAuth};
use log::{info, warn};
use serde::Serialize;
use specta::Type;
use tauri::{AppHandle, Emitter, Manager};

/// Auth state payload emitted to the frontend.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatePayload {
    pub is_signed_in: bool,
    pub username: Option<String>,
    pub plan: Option<String>,
    pub avatar_url: Option<String>,
}

/// Event name for auth state changes.
pub const AUTH_STATE_CHANGED_EVENT: &str = "auth-state-changed";

/// Event name emitted when re-authentication is required.
pub const AUTH_REAUTH_NEEDED_EVENT: &str = "auth-reauth-needed";

fn signed_out_payload() -> AuthStatePayload {
    AuthStatePayload {
        is_signed_in: false,
        username: None,
        plan: None,
        avatar_url: None,
    }
}

/// Scans browser cookies for a SoundCloud oauth_token, verifies it
/// against the API, and caches the result. Emits an auth state event.
///
/// # Returns
/// * `Ok(true)` - A valid token was found and verified
/// * `Ok(false)` - No valid token found (not signed in)
/// * `Err(String)` - Error during the check
#[tauri::command]
#[specta::specta]
pub async fn check_auth(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<AuthState>();

    // Hold the refresh guard across the full scan-verify-cache cycle.
    // Other callers wait here until the first one finishes.
    let _guard = state.lock_refresh().await;

    let result = tokio::task::spawn_blocking(|| scan_browser_cookies())
        .await
        .map_err(|e| e.to_string())?;

    let Some(cookie) = result else {
        state.clear();
        let _ = app.emit(AUTH_STATE_CHANGED_EVENT, signed_out_payload());
        return Ok(false);
    };

    match verify_token(&cookie.value).await {
        Ok(profile) => {
            state.set(CachedAuth {
                oauth_token: cookie.value,
                username: profile.username.clone(),
                plan: profile.plan.clone(),
                avatar_url: profile.avatar_url.clone(),
            });
            let _ = app.emit(
                AUTH_STATE_CHANGED_EVENT,
                AuthStatePayload {
                    is_signed_in: true,
                    username: Some(profile.username),
                    plan: profile.plan,
                    avatar_url: profile.avatar_url,
                },
            );
            info!("Authenticated via {} browser cookie", cookie.browser);
            Ok(true)
        }
        Err(e) => {
            warn!("Cookie verification failed: {}", e);
            state.clear();
            let _ = app.emit(AUTH_STATE_CHANGED_EVENT, signed_out_payload());
            Ok(false)
        }
    }
}

/// Re-verifies auth on demand (e.g., after download 401/403).
/// First tries to re-verify the cached token (cheap API call) before
/// falling back to a full browser cookie scan (expensive I/O).
/// If no valid token is found, emits `auth-reauth-needed` so the frontend can prompt the user.
#[tauri::command]
#[specta::specta]
pub async fn refresh_auth(app: AppHandle) -> Result<bool, String> {
    // Fast path: re-verify the cached token without rescanning cookies.
    let cached_token = app.state::<AuthState>().get_token();
    if let Some(token) = cached_token {
        if verify_token(&token).await.is_ok() {
            return Ok(true);
        }
        info!("Cached token verification failed, falling back to cookie scan");
    }

    let result = check_auth(app.clone()).await?;
    if !result {
        let _ = app.emit(AUTH_REAUTH_NEEDED_EVENT, ());
    }
    Ok(result)
}

/// Signs out by clearing cached auth state and emitting signed-out event.
///
/// Note: This does NOT delete the browser cookie — the user remains logged in
/// to SoundCloud in their browser. It only clears the app's cached token.
#[tauri::command]
#[specta::specta]
pub async fn sign_out(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AuthState>();
    state.clear();
    let _ = app.emit(AUTH_STATE_CHANGED_EVENT, signed_out_payload());
    info!("User signed out");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_state_payload_serializes() {
        let payload = AuthStatePayload {
            is_signed_in: true,
            username: Some("testuser".to_string()),
            plan: Some("Pro Unlimited".to_string()),
            avatar_url: Some("https://i1.sndcdn.com/avatars-xxx.jpg".to_string()),
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"username\":\"testuser\""));
        assert!(json.contains("\"plan\":\"Pro Unlimited\""));
        assert!(json.contains("\"avatarUrl\":\"https://i1.sndcdn.com/avatars-xxx.jpg\""));
    }

    #[test]
    fn test_auth_state_payload_serializes_without_optional_fields() {
        let payload = AuthStatePayload {
            is_signed_in: true,
            username: Some("testuser".to_string()),
            plan: None,
            avatar_url: None,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"plan\":null"));
        assert!(json.contains("\"avatarUrl\":null"));
    }

    #[test]
    fn test_signed_out_payload_is_correct() {
        let payload = signed_out_payload();
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":false"));
        assert!(json.contains("\"username\":null"));
        assert!(json.contains("\"plan\":null"));
        assert!(json.contains("\"avatarUrl\":null"));
    }
}
