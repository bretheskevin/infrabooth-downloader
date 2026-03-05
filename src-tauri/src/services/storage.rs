use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;

/// Cached auth state, held in Tauri managed state.
/// Re-populated from browser cookies on each app launch.
#[derive(Debug, Clone)]
pub struct CachedAuth {
    pub oauth_token: String,
    pub username: String,
    pub plan: Option<String>,
    pub avatar_url: Option<String>,
}

/// Thread-safe auth state container.
///
/// `cached` holds the current token and user info.
/// `refresh_guard` ensures only one cookie scan runs at a time
/// (prevents redundant scans when multiple downloads hit 401/403).
pub struct AuthState {
    pub(crate) cached: Mutex<Option<CachedAuth>>,
    refresh_guard: AsyncMutex<()>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            cached: Mutex::new(None),
            refresh_guard: AsyncMutex::new(()),
        }
    }
}

impl AuthState {
    /// Acquire the refresh guard. Hold this across the full
    /// scan-verify-cache cycle to prevent concurrent cookie scans.
    pub async fn lock_refresh(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.refresh_guard.lock().await
    }

    pub fn set(&self, auth: CachedAuth) {
        *self.cached.lock().unwrap() = Some(auth);
    }

    pub fn clear(&self) {
        *self.cached.lock().unwrap() = None;
    }

    pub fn get_token(&self) -> Option<String> {
        self.cached
            .lock()
            .unwrap()
            .as_ref()
            .map(|a| a.oauth_token.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_state_default_is_empty() {
        let state = AuthState::default();
        assert!(state.get_token().is_none());
    }

    #[test]
    fn test_auth_state_set_and_get_token() {
        let state = AuthState::default();
        state.set(CachedAuth {
            oauth_token: "test_token".to_string(),
            username: "testuser".to_string(),
            plan: Some("Pro".to_string()),
            avatar_url: None,
        });
        assert_eq!(state.get_token(), Some("test_token".to_string()));
    }

    #[test]
    fn test_auth_state_clear() {
        let state = AuthState::default();
        state.set(CachedAuth {
            oauth_token: "token".to_string(),
            username: "user".to_string(),
            plan: None,
            avatar_url: None,
        });
        assert!(state.get_token().is_some());
        state.clear();
        assert!(state.get_token().is_none());
    }

    #[test]
    fn test_cached_auth_clone() {
        let auth = CachedAuth {
            oauth_token: "token".to_string(),
            username: "user".to_string(),
            plan: Some("Go+".to_string()),
            avatar_url: Some("https://example.com/avatar.jpg".to_string()),
        };
        let cloned = auth.clone();
        assert_eq!(cloned.oauth_token, "token");
        assert_eq!(cloned.username, "user");
        assert_eq!(cloned.plan, Some("Go+".to_string()));
        assert_eq!(
            cloned.avatar_url,
            Some("https://example.com/avatar.jpg".to_string())
        );
    }
}
