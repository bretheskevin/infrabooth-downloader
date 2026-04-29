use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;

/// Cached auth state, held in Tauri managed state.
/// Re-populated from browser cookies on each app launch.
#[derive(Clone)]
pub struct CachedAuth {
    pub oauth_token: String,
    pub user_id: u64,
}

impl std::fmt::Debug for CachedAuth {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CachedAuth").field("oauth_token", &"[redacted]").field("user_id", &self.user_id).finish()
    }
}

/// Thread-safe auth state container.
///
/// `cached` holds the current token and user info.
/// `refresh_guard` ensures only one cookie scan runs at a time
/// (prevents redundant scans when multiple downloads hit 401/403).
pub struct AuthState {
    pub(crate) cached: Mutex<Option<CachedAuth>>,
    /// Datadome cookie stored independently of auth — needed for all API calls.
    datadome: Mutex<Option<String>>,
    refresh_guard: AsyncMutex<()>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self { cached: Mutex::new(None), datadome: Mutex::new(None), refresh_guard: AsyncMutex::new(()) }
    }
}

impl AuthState {
    /// Acquire the refresh guard. Hold this across the full
    /// scan-verify-cache cycle to prevent concurrent cookie scans.
    pub async fn lock_refresh(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.refresh_guard.lock().await
    }

    pub fn set(&self, auth: CachedAuth) {
        *self.cached.lock().expect("AuthState lock poisoned") = Some(auth);
    }

    pub fn clear(&self) {
        *self.cached.lock().expect("AuthState lock poisoned") = None;
    }

    pub fn get_token(&self) -> Option<String> {
        self.cached.lock().expect("AuthState lock poisoned").as_ref().map(|a| a.oauth_token.clone())
    }

    pub fn get_datadome(&self) -> Option<String> {
        self.datadome.lock().expect("AuthState datadome lock poisoned").clone()
    }

    pub fn set_datadome(&self, datadome: Option<String>) {
        *self.datadome.lock().expect("AuthState datadome lock poisoned") = datadome;
    }

    pub fn update_datadome(&self, new: Option<String>) {
        if new.is_some() {
            self.set_datadome(new);
        }
    }

    pub fn get_user_id(&self) -> Option<u64> {
        self.cached.lock().expect("AuthState lock poisoned").as_ref().map(|a| a.user_id)
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
        state.set(CachedAuth { oauth_token: "test_token".to_string(), user_id: 0 });
        assert_eq!(state.get_token(), Some("test_token".to_string()));
    }

    #[test]
    fn test_auth_state_clear() {
        let state = AuthState::default();
        state.set(CachedAuth { oauth_token: "token".to_string(), user_id: 0 });
        assert!(state.get_token().is_some());
        state.clear();
        assert!(state.get_token().is_none());
    }

    #[test]
    fn test_cached_auth_clone() {
        let auth = CachedAuth { oauth_token: "token".to_string(), user_id: 0 };
        let cloned = auth.clone();
        assert_eq!(cloned.oauth_token, "token");
    }

    #[test]
    fn test_cached_auth_debug_redacts_token() {
        let auth = CachedAuth { oauth_token: "secret_token".to_string(), user_id: 0 };
        let debug = format!("{:?}", auth);
        assert!(!debug.contains("secret_token"));
        assert!(debug.contains("[redacted]"));
    }
}
