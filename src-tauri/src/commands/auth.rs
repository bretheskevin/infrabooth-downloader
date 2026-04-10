use crate::services::cookie::scan_browser_cookies;
use crate::services::http::SOUNDCLOUD_URL;
use crate::services::library::LibraryCache;
use crate::services::oauth::verify_token;
use crate::services::storage::{AuthState, CachedAuth};
use log::{info, warn};
use serde::Serialize;
use specta::Type;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatePayload {
    pub is_signed_in: bool,
    pub username: Option<String>,
    pub plan: Option<String>,
    pub avatar_url: Option<String>,
    pub cookie_warning: Option<String>,
}

use crate::services::events;

fn signed_out_payload(cookie_warning: Option<String>) -> AuthStatePayload {
    AuthStatePayload {
        is_signed_in: false,
        username: None,
        plan: None,
        avatar_url: None,
        cookie_warning,
    }
}

#[tauri::command]
#[specta::specta]
pub async fn check_auth(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<AuthState>();

    // Hold the refresh guard across the full scan-verify-cache cycle.
    // Other callers wait here until the first one finishes.
    let _guard = state.lock_refresh().await;

    let scan = tokio::task::spawn_blocking(|| scan_browser_cookies())
        .await
        .map_err(|e| e.to_string())?;

    // Always store datadome — it's needed for all API calls, even without auth
    state.set_datadome(scan.datadome);

    let Some(cookie) = scan.cookie else {
        state.clear();
        let _ = app.emit(events::AUTH_STATE_CHANGED, signed_out_payload(scan.warning));
        return Ok(false);
    };

    match verify_token(&cookie.value).await {
        Ok(profile) => {
            state.set(CachedAuth {
                oauth_token: cookie.value,
                datadome: cookie.datadome,
                user_id: profile.id,
            });
            let _ = app.emit(
                events::AUTH_STATE_CHANGED,
                AuthStatePayload {
                    is_signed_in: true,
                    username: Some(profile.username),
                    plan: profile.plan,
                    avatar_url: profile.avatar_url,
                    cookie_warning: None,
                },
            );
            info!("Authenticated via {} browser cookie", cookie.browser);
            Ok(true)
        }
        Err(e) => {
            warn!("Cookie verification failed: {}", e);
            state.clear();
            let _ = app.emit(events::AUTH_STATE_CHANGED, signed_out_payload(None));
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
        let _ = app.emit(events::AUTH_REAUTH_NEEDED, ());
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
    app.state::<LibraryCache>().clear();
    app.state::<crate::services::selections::SelectionCache>().clear();
    app.state::<crate::services::new_tracks::NewTracksCache>().clear();
    let _ = app.emit(events::AUTH_STATE_CHANGED, signed_out_payload(None));
    info!("User signed out");
    Ok(())
}


#[cfg(target_os = "windows")]
const WINDOWS_FIREFOX_FALLBACK_PATHS: &[&str] = &[
    r"C:\Program Files\Mozilla Firefox\firefox.exe",
    r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe",
];

#[cfg(target_os = "windows")]
fn firefox_exe_from_registry() -> Option<String> {
    let output = std::process::Command::new("reg")
        .args(["query", r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe", "/ve"])
        .output()
        .ok()?;
    if !output.status.success() { return None; }
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.lines()
        .find_map(|line| line.split("REG_SZ").nth(1))
        .map(|s| s.trim().to_string())
        .filter(|path| std::path::Path::new(path).exists())
}

#[cfg(target_os = "windows")]
fn find_firefox_exe() -> Option<String> {
    firefox_exe_from_registry().or_else(|| {
        WINDOWS_FIREFOX_FALLBACK_PATHS.iter()
            .find(|p| std::path::Path::new(p).exists())
            .map(|p| p.to_string())
    })
}

#[cfg(target_os = "macos")]
fn is_firefox_installed_macos() -> bool {
    let home = std::env::var("HOME").unwrap_or_default();
    std::path::Path::new("/Applications/Firefox.app").exists()
        || std::path::Path::new(&format!("{home}/Applications/Firefox.app")).exists()
}

#[tauri::command]
#[specta::specta]
pub fn check_firefox_installed() -> bool {
    #[cfg(target_os = "windows")]
    { return find_firefox_exe().is_some(); }

    #[cfg(target_os = "macos")]
    { return is_firefox_installed_macos(); }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    { false }
}

#[tauri::command]
#[specta::specta]
pub fn open_in_firefox() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let firefox = find_firefox_exe().ok_or_else(|| "Firefox not found".to_string())?;
        std::process::Command::new(firefox)
            .arg(SOUNDCLOUD_URL)
            .spawn()
            .map_err(|e| format!("Failed to launch Firefox: {e}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-a", "Firefox", SOUNDCLOUD_URL])
            .spawn()
            .map_err(|e| format!("Failed to launch Firefox: {e}"))?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    { Err("Unsupported platform".to_string()) }
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
            cookie_warning: None,
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
            cookie_warning: None,
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":true"));
        assert!(json.contains("\"plan\":null"));
        assert!(json.contains("\"avatarUrl\":null"));
    }

    #[test]
    fn test_signed_out_payload_is_correct() {
        let payload = signed_out_payload(None);
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"isSignedIn\":false"));
        assert!(json.contains("\"username\":null"));
        assert!(json.contains("\"plan\":null"));
        assert!(json.contains("\"avatarUrl\":null"));
        assert!(json.contains("\"cookieWarning\":null"));
    }
}
