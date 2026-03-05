# Browser Cookie Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace PKCE OAuth with browser cookie extraction via the `rookie` crate, making auth an optional enhancement that unlocks HQ 256kbps downloads for Go+ subscribers.

**Architecture:** On app start (and on manual refresh), scan the user's browsers for a `soundcloud.com` `oauth_token` cookie using `rookie`. Verify it against API v2 `/me`. Cache token in Tauri managed state (in-memory only — re-scanned on every launch). Downloads work without auth at standard quality; with auth, HQ transcodings are unlocked.

**Tech Stack:** Rust (rookie, rusqlite, reqwest, tokio), Tauri 2.x managed state + events, React 19 + Zustand + Vitest

**Design doc:** `docs/plans/2026-03-05-browser-cookie-auth-design.md`

---

### Task 1: Update Cargo.toml — add rookie, remove old auth deps

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add rookie dependency**

Add under `[dependencies]`:
```toml
rookie = "0.5"
```

**Step 2: Remove PKCE-only dependencies**

Remove these dependencies (only used by the PKCE flow):
- `sha2` (PKCE challenge hashing)
- `base64` (PKCE encoding)
- `rand` (PKCE verifier generation)
- `keyring` (OS keychain token storage)

Keep `reqwest`, `tokio`, `url`, `serde`, `serde_json`, `thiserror` — still used.

Before removing, verify no other code uses them:
```bash
cd src-tauri && grep -r "sha2\|use base64\|use rand\|keyring" src/ --include="*.rs" | grep -v oauth.rs | grep -v storage.rs
```

If any are used elsewhere, keep them.

**Step 3: Remove deep-link plugin dependency**

Remove from `[dependencies]`:
```toml
tauri-plugin-deep-link = "2"
```

**Step 4: Verify it compiles (will have errors — that's expected)**

```bash
cd src-tauri && cargo check 2>&1 | head -30
```

Expected: compilation errors from code still referencing removed items. That's fine — we fix them in subsequent tasks.

**Step 5: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: add rookie crate, remove PKCE auth dependencies"
```

---

### Task 2: Create services/cookie.rs — browser cookie extraction

**Files:**
- Create: `src-tauri/src/services/cookie.rs`
- Modify: `src-tauri/src/services/mod.rs` (add module)

**Step 1: Write the cookie extraction module**

Create `src-tauri/src/services/cookie.rs`:

```rust
use log::{info, warn};

/// Result of a browser cookie scan
#[derive(Debug, Clone)]
pub struct BrowserCookie {
    pub value: String,
    pub browser: String,
}

/// Scan browsers for the SoundCloud oauth_token cookie.
///
/// Browser order prioritizes Firefox (no Keychain prompt on macOS,
/// no admin elevation on Windows) then falls through Chromium-based browsers.
///
/// Platform-specific order:
/// - macOS: Firefox -> Chrome -> Brave -> Edge -> Opera -> Vivaldi -> Arc
/// - Windows: Firefox -> Chrome -> Brave -> Edge -> Opera -> Vivaldi
pub fn scan_browser_cookies() -> Option<BrowserCookie> {
    let domains = Some(vec![".soundcloud.com".to_string()]);

    // Each entry: (browser_name, extraction_fn)
    let browsers: Vec<(&str, fn(Option<Vec<String>>) -> Result<Vec<rookie::Cookie>, rookie::Error>)> = vec![
        ("Firefox", rookie::firefox),
        ("Chrome", rookie::chrome),
        ("Brave", rookie::brave),
        ("Edge", rookie::edge),
        ("Opera", rookie::opera),
        ("Vivaldi", rookie::vivaldi),
        #[cfg(target_os = "macos")]
        ("Arc", rookie::arc),
    ];

    for (name, extract_fn) in &browsers {
        match extract_fn(domains.clone()) {
            Ok(cookies) => {
                if let Some(token_cookie) = cookies.iter().find(|c| c.name == "oauth_token") {
                    if !token_cookie.value.is_empty() {
                        info!("Found oauth_token in {}", name);
                        return Some(BrowserCookie {
                            value: token_cookie.value.clone(),
                            browser: name.to_string(),
                        });
                    }
                }
            }
            Err(e) => {
                warn!("Failed to read cookies from {}: {}", name, e);
            }
        }
    }

    info!("No SoundCloud oauth_token found in any browser");
    None
}
```

Note: The `rookie` crate's exact function signatures and error types should be verified against the actual API at implementation time. Adjust the type annotations (e.g., `rookie::Error` vs `eyre::Report`) based on what `rookie 0.5` actually exports.

**Step 2: Register the module**

In `src-tauri/src/services/mod.rs`, add:
```rust
pub mod cookie;
```

**Step 3: Commit**

```bash
git add src-tauri/src/services/cookie.rs src-tauri/src/services/mod.rs
git commit -m "feat: add browser cookie extraction module using rookie"
```

---

### Task 3: Update models/error.rs — new AuthError variants

**Files:**
- Modify: `src-tauri/src/models/error.rs`

**Step 1: Replace AuthError enum**

Replace the existing `AuthError` variants with:

```rust
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("No browser cookie found")]
    NoCookieFound,

    #[error("Cookie verification failed: {0}")]
    VerificationFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("Profile fetch failed: {0}")]
    ProfileFetchFailed(String),
}
```

**Step 2: Update HasErrorCode implementation**

Update the error codes to match new variants:

```rust
impl HasErrorCode for AuthError {
    fn error_code(&self) -> &'static str {
        match self {
            AuthError::NoCookieFound => "NO_COOKIE_FOUND",
            AuthError::VerificationFailed(_) => "VERIFICATION_FAILED",
            AuthError::NetworkError(_) => "NETWORK_ERROR",
            AuthError::ProfileFetchFailed(_) => "PROFILE_FETCH_FAILED",
        }
    }
}
```

Remove old variants: `MissingClientSecret`, `TokenExchangeFailed`, `NoFlowInProgress`, `RefreshFailed`.

**Step 3: Commit**

```bash
git add src-tauri/src/models/error.rs
git commit -m "refactor: update AuthError for cookie-based auth"
```

---

### Task 4: Rewrite services/oauth.rs — verify token + fetch profile only

**Files:**
- Modify: `src-tauri/src/services/oauth.rs`

**Step 1: Strip down to verification and profile fetch**

Replace the entire file. Keep only what's needed:

```rust
use crate::models::error::AuthError;
use reqwest::Client;
use serde::Deserialize;

use super::client_id::get_client_id;

#[derive(Debug, Deserialize)]
pub struct UserProfile {
    pub username: String,
    pub avatar_url: Option<String>,
    pub consumer_plan: Option<String>,
}

/// Verify a cookie token by calling /me on API v2.
/// Returns the user profile if the token is valid.
pub async fn verify_token(oauth_token: &str) -> Result<UserProfile, AuthError> {
    let client_id = get_client_id()
        .await
        .map_err(|e| AuthError::VerificationFailed(e.to_string()))?;

    let client = Client::new();
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

    let profile: UserProfile = resp
        .json()
        .await
        .map_err(|e| AuthError::ProfileFetchFailed(e.to_string()))?;

    Ok(profile)
}
```

Remove: `CLIENT_ID`, `REDIRECT_URI`, `AUTH_URL`, `TOKEN_URL`, `generate_pkce()`, `build_auth_url()`, `exchange_code()`, `get_client_secret()`, `refresh_tokens()`, `get_app_token()`, `TokenResponse`, `AppTokenResponse`.

Note: Check whether `UserProfile` field for the plan is `consumer_plan` or `plan` in the v2 API response — verify at implementation time by checking the actual JSON from `api-v2.soundcloud.com/me`. The current code uses `api.soundcloud.com/me` (v1) — the field name may differ in v2.

**Step 2: Commit**

```bash
git add src-tauri/src/services/oauth.rs
git commit -m "refactor: strip oauth.rs to token verification only"
```

---

### Task 5: Simplify services/storage.rs — in-memory token state

**Files:**
- Modify: `src-tauri/src/services/storage.rs`

**Step 1: Replace with in-memory state holder**

The token is now re-scanned from browser cookies on every launch. No keychain persistence needed. Replace the entire file:

```rust
use std::sync::Mutex;

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
/// The Mutex guards both the cached token and acts as the
/// concurrent refresh guard (only one thread re-scans cookies at a time).
#[derive(Debug, Default)]
pub struct AuthState {
    pub cached: Mutex<Option<CachedAuth>>,
}

impl AuthState {
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
```

Remove all keyring-related code, `StoredTokens`, `store_tokens()`, `load_tokens()`, `delete_tokens()`, `refresh_and_store_tokens()`, `is_token_expired_or_expiring()`, `calculate_expires_at()`, `current_timestamp()`.

**Step 2: Commit**

```bash
git add src-tauri/src/services/storage.rs
git commit -m "refactor: replace keychain storage with in-memory auth state"
```

---

### Task 6: Rewrite commands/auth.rs — new commands + concurrent refresh

**Files:**
- Modify: `src-tauri/src/commands/auth.rs`

**Step 1: Replace with new command implementations**

```rust
use crate::models::error::AuthError;
use crate::services::cookie::scan_browser_cookies;
use crate::services::oauth::verify_token;
use crate::services::storage::{AuthState, CachedAuth};
use log::{info, warn};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

pub const AUTH_STATE_CHANGED_EVENT: &str = "auth-state-changed";
pub const AUTH_REAUTH_NEEDED_EVENT: &str = "auth-reauth-needed";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatePayload {
    pub is_signed_in: bool,
    pub username: Option<String>,
    pub plan: Option<String>,
    pub avatar_url: Option<String>,
}

/// Scan browser cookies, verify token, cache result, emit auth state.
/// Called on app startup and when user clicks "Check browser login".
#[tauri::command]
#[specta::specta]
pub async fn check_auth(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<AuthState>();

    // Acquire the mutex — this is the concurrent refresh guard.
    // If another thread is already scanning, we wait.
    let result = {
        // scan_browser_cookies is sync (filesystem I/O), run in blocking context
        tokio::task::spawn_blocking(|| scan_browser_cookies())
            .await
            .map_err(|e| e.to_string())?
    };

    let Some(cookie) = result else {
        state.clear();
        let _ = app.emit(
            AUTH_STATE_CHANGED_EVENT,
            AuthStatePayload {
                is_signed_in: false,
                username: None,
                plan: None,
                avatar_url: None,
            },
        );
        return Ok(false);
    };

    // Verify the token against SoundCloud API
    match verify_token(&cookie.value).await {
        Ok(profile) => {
            let auth = CachedAuth {
                oauth_token: cookie.value,
                username: profile.username.clone(),
                plan: profile.consumer_plan.clone(),
                avatar_url: profile.avatar_url.clone(),
            };
            state.set(auth);

            let _ = app.emit(
                AUTH_STATE_CHANGED_EVENT,
                AuthStatePayload {
                    is_signed_in: true,
                    username: Some(profile.username),
                    plan: profile.consumer_plan,
                    avatar_url: profile.avatar_url,
                },
            );
            info!("Authenticated via {} browser cookie", cookie.browser);
            Ok(true)
        }
        Err(e) => {
            warn!("Cookie verification failed: {}", e);
            state.clear();
            let _ = app.emit(
                AUTH_STATE_CHANGED_EVENT,
                AuthStatePayload {
                    is_signed_in: false,
                    username: None,
                    plan: None,
                    avatar_url: None,
                },
            );
            Ok(false)
        }
    }
}

/// Attempt to refresh auth by re-scanning browser cookies.
/// Called when a download fails with 401/403, or when user clicks "Refresh".
#[tauri::command]
#[specta::specta]
pub async fn refresh_auth(app: AppHandle) -> Result<bool, String> {
    // Delegates to the same logic as check_auth
    check_auth(app).await
}

/// Clear cached auth state. User manually signs out.
#[tauri::command]
#[specta::specta]
pub async fn sign_out(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AuthState>();
    state.clear();

    let _ = app.emit(
        AUTH_STATE_CHANGED_EVENT,
        AuthStatePayload {
            is_signed_in: false,
            username: None,
            plan: None,
            avatar_url: None,
        },
    );
    info!("User signed out");
    Ok(())
}
```

Remove: `OAuthState`, `start_oauth`, `complete_oauth`, `check_auth_state`, and the old `sign_out` implementation.

**Step 2: Commit**

```bash
git add src-tauri/src/commands/auth.rs
git commit -m "feat: rewrite auth commands for browser cookie flow"
```

---

### Task 7: Update services/stream.rs — get token from AuthState

**Files:**
- Modify: `src-tauri/src/services/stream.rs`

**Step 1: Update token retrieval**

Find where `resolve_stream_url` gets the oauth token. Currently it accepts `oauth_token: Option<&str>` as a parameter.

Check how it's called from the pipeline. The caller (likely `pipeline.rs`) reads the token from storage and passes it. Update the caller to read from `AuthState` instead:

```rust
// In the caller (pipeline.rs or wherever resolve_stream_url is called):
let token = app.state::<AuthState>().get_token();
let stream_info = resolve_stream_url(
    &track_url,
    token.as_deref(),
).await?;
```

The `resolve_stream_url` function signature stays the same — it already accepts `Option<&str>`.

**Step 2: Verify the token retrieval path**

Search for all call sites of `resolve_stream_url`, `get_current_access_token`, and `load_tokens` to ensure all are updated:

```bash
cd src-tauri && grep -rn "get_current_access_token\|load_tokens\|resolve_stream_url" src/ --include="*.rs"
```

Update each call site to use `AuthState::get_token()` instead.

**Step 3: Commit**

```bash
git add src-tauri/src/services/stream.rs src-tauri/src/services/pipeline.rs
git commit -m "refactor: read auth token from AuthState in stream resolution"
```

---

### Task 8: Update services/playlist.rs — remove app token fallback

**Files:**
- Modify: `src-tauri/src/services/playlist.rs`

**Step 1: Simplify token retrieval**

Replace `get_access_token()` (which falls back to app token) with direct `AuthState` access. The function should return `Option<String>` — no fallback to app tokens:

Find the `get_access_token()` function and all its callers. Replace with reading from `AuthState`:

```rust
// Where playlist.rs gets its token, replace with:
let token = app.state::<AuthState>().get_token();
```

The API calls should use `client_id` as a query parameter (always) and `Authorization: OAuth {token}` header (only if token is available).

**Step 2: Remove `get_app_token` / `get_cached_app_token` references**

Search and remove:
```bash
cd src-tauri && grep -rn "get_app_token\|get_cached_app_token\|app_token" src/ --include="*.rs"
```

**Step 3: Commit**

```bash
git add src-tauri/src/services/playlist.rs
git commit -m "refactor: remove app token fallback from playlist service"
```

---

### Task 9: Remove services/deep_link.rs and update services/mod.rs

**Files:**
- Delete: `src-tauri/src/services/deep_link.rs`
- Modify: `src-tauri/src/services/mod.rs`

**Step 1: Delete deep_link.rs**

```bash
rm src-tauri/src/services/deep_link.rs
```

**Step 2: Remove from mod.rs**

In `src-tauri/src/services/mod.rs`, remove:
```rust
pub mod deep_link;
```

Also remove the `AUTH_CALLBACK_EVENT` constant if it's defined in mod.rs.

**Step 3: Check for remaining references**

```bash
cd src-tauri && grep -rn "deep_link\|AUTH_CALLBACK_EVENT\|handle_deep_link" src/ --include="*.rs"
```

Fix any remaining references.

**Step 4: Commit**

```bash
git add -A src-tauri/src/services/
git commit -m "refactor: remove deep link handler"
```

---

### Task 10: Update lib.rs — remove deep link plugin, update state and commands

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Remove deep link plugin registration**

Remove:
```rust
use tauri_plugin_deep_link;
// ...
.plugin(tauri_plugin_deep_link::init())
```

Remove the `app.deep_link().on_open_url(...)` handler.

**Step 2: Replace OAuthState with AuthState**

Replace:
```rust
.manage(OAuthState::default())
```
With:
```rust
.manage(AuthState::default())
```

Add the import:
```rust
use crate::services::storage::AuthState;
```

Remove the `OAuthState` import.

**Step 3: Update command registration**

In the `collect_commands!` or `generate_handler!` macro, replace:
- `start_oauth` → remove
- `complete_oauth` → remove
- `check_auth_state` → `check_auth`
- Keep `sign_out`
- Add `refresh_auth`

**Step 4: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Fix any remaining compilation errors.

**Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: update lib.rs for cookie auth — remove deep link, update commands"
```

---

### Task 11: Update tauri.conf.json — remove deep link scheme

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Remove deep-link plugin config**

Remove the deep-link section from `plugins`:
```json
"deep-link": {
  "desktop": {
    "schemes": ["ib-downloader"]
  }
}
```

**Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: remove deep-link scheme from tauri config"
```

---

### Task 12: Cargo check — ensure Rust backend compiles clean

**Files:** None (verification only)

**Step 1: Full cargo check**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: clean compilation with no errors. If there are errors, fix them before proceeding to frontend.

**Step 2: Run any existing Rust tests**

```bash
cd src-tauri && cargo test 2>&1
```

Fix any failures.

**Step 3: Commit if any fixes were needed**

```bash
git add src-tauri/
git commit -m "fix: resolve compilation errors after auth refactor"
```

---

### Task 13: Regenerate bindings.ts and update frontend api.ts

**Files:**
- Auto-generated: `src/bindings.ts` (regenerated by tauri-specta)
- Modify: `src/features/auth/api.ts`

**Step 1: Regenerate TypeScript bindings**

```bash
cd src-tauri && cargo build
```

This triggers tauri-specta to regenerate `src/bindings.ts` with the new command signatures:
- `checkAuth()` (was `startOauth` + `completeOauth` + `checkAuthState`)
- `refreshAuth()` (new)
- `signOut()` (unchanged)

Verify the new bindings:
```bash
grep -A2 "checkAuth\|refreshAuth\|signOut\|startOauth\|completeOauth" src/bindings.ts
```

**Step 2: Rewrite api.ts**

Replace `src/features/auth/api.ts`:

```typescript
import { api } from "@/bindings";

export async function checkAuth(): Promise<boolean> {
  return await api.checkAuth();
}

export async function refreshAuth(): Promise<boolean> {
  return await api.refreshAuth();
}

export async function signOut(): Promise<void> {
  await api.signOut();
}
```

Remove: `startOAuth`, `completeOAuth`, `checkAuthState`, and the `@tauri-apps/plugin-shell` import for opening browser.

**Step 3: Commit**

```bash
git add src/bindings.ts src/features/auth/api.ts
git commit -m "feat: update frontend API bindings for cookie auth"
```

---

### Task 14: Remove old hooks, update useStartupAuth

**Files:**
- Delete: `src/features/auth/hooks/useOAuthFlow.ts`
- Delete: `src/features/auth/hooks/useAuthCallback.ts`
- Modify: `src/features/auth/hooks/useStartupAuth.ts`

**Step 1: Delete removed hooks**

```bash
rm src/features/auth/hooks/useOAuthFlow.ts
rm src/features/auth/hooks/useAuthCallback.ts
```

**Step 2: Update useStartupAuth.ts**

Replace the `checkAuthState()` call with `checkAuth()`:

```typescript
import { useEffect } from "react";
import { checkAuth } from "../api";

export function useStartupAuth() {
  useEffect(() => {
    checkAuth();
  }, []);
}
```

**Step 3: Remove hook re-exports if they exist**

Check `src/features/auth/hooks/index.ts` (if it exists) and remove re-exports of deleted hooks.

**Step 4: Remove references to deleted hooks**

```bash
grep -rn "useOAuthFlow\|useAuthCallback" src/ --include="*.ts" --include="*.tsx"
```

Remove any imports/usages found (likely in `DownloadPage.tsx` or similar).

**Step 5: Commit**

```bash
git add -A src/features/auth/hooks/
git commit -m "refactor: remove PKCE hooks, simplify startup auth"
```

---

### Task 15: Update SignInButton.tsx — new cookie check UX

**Files:**
- Modify: `src/features/auth/components/SignInButton.tsx`

**Step 1: Replace OAuth flow with cookie check**

Replace the component. The new button triggers `checkAuth()` instead of opening a browser:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { checkAuth } from "../api";

export function SignInButton() {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await checkAuth();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground text-center">
        {t("auth.signInHint")}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={isChecking}
      >
        {isChecking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {isChecking ? t("auth.checking") : t("auth.checkBrowser")}
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/features/auth/components/SignInButton.tsx
git commit -m "feat: replace OAuth sign-in button with browser cookie check"
```

---

### Task 16: Update AuthContainer.tsx (if needed)

**Files:**
- Modify: `src/features/auth/components/AuthContainer.tsx`

**Step 1: Verify AuthContainer still works**

The component conditionally renders `UserMenu` or `SignInButton`. Since both components are updated, AuthContainer likely needs no changes. Verify:

```bash
grep -n "useOAuthFlow\|startOAuth\|completeOAuth" src/features/auth/components/AuthContainer.tsx
```

If any references to old flow exist, remove them.

**Step 2: Commit if changed**

```bash
git add src/features/auth/components/AuthContainer.tsx
git commit -m "refactor: update AuthContainer for cookie auth flow"
```

---

### Task 17: Update translations

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/fr.json`

**Step 1: Update English translations**

Add/replace auth keys in `en.json`:

```json
{
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "signInHint": "Log in to SoundCloud in your browser for higher quality downloads",
    "checkBrowser": "Check browser login",
    "checking": "Checking...",
    "sessionExpired": "Session Expired",
    "sessionExpiredDescription": "Your SoundCloud session has expired. Please log in to SoundCloud in your browser.",
    "signInAgain": "Refresh",
    "continueStandard": "Continue at standard quality",
    "qualityBadge": "Go+ 256kbps"
  }
}
```

Remove: `auth.openingBrowser` (no longer opens browser).

**Step 2: Update French translations**

Add/replace auth keys in `fr.json`:

```json
{
  "auth": {
    "signIn": "Se connecter",
    "signOut": "Se déconnecter",
    "signInHint": "Connectez-vous à SoundCloud dans votre navigateur pour des téléchargements en meilleure qualité",
    "checkBrowser": "Vérifier la connexion",
    "checking": "Vérification...",
    "sessionExpired": "Session expirée",
    "sessionExpiredDescription": "Votre session SoundCloud a expiré. Veuillez vous reconnecter dans votre navigateur.",
    "signInAgain": "Actualiser",
    "continueStandard": "Continuer en qualité standard",
    "qualityBadge": "Go+ 256kbps"
  }
}
```

**Step 3: Commit**

```bash
git add src/locales/en.json src/locales/fr.json
git commit -m "i18n: update auth translations for cookie-based flow"
```

---

### Task 18: Update frontend tests

**Files:**
- Modify: `src/features/auth/__test__/api.test.ts`
- Modify: `src/features/auth/__test__/useStartupAuth.test.ts`
- Modify: `src/features/auth/__test__/SignInButton.test.tsx`
- Modify: `src/features/auth/__test__/AuthContainer.test.tsx`
- Modify: `src/features/auth/__test__/useAuthStateListener.test.ts`
- Delete: `src/features/auth/__test__/useOAuthFlow.test.ts`
- Delete: `src/features/auth/__test__/useAuthCallback.test.ts`

**Step 1: Delete tests for removed hooks**

```bash
rm src/features/auth/__test__/useOAuthFlow.test.ts
rm src/features/auth/__test__/useAuthCallback.test.ts
```

**Step 2: Update api.test.ts**

Replace tests to cover the new API surface:
- `checkAuth()` calls `api.checkAuth()`
- `refreshAuth()` calls `api.refreshAuth()`
- `signOut()` calls `api.signOut()`

Remove tests for `startOAuth`, `completeOAuth`, `checkAuthState`.

**Step 3: Update useStartupAuth.test.ts**

Update to verify that `checkAuth` (not `checkAuthState`) is called on mount.

**Step 4: Update SignInButton.test.tsx**

Replace OAuth flow tests with:
- Renders "Check browser login" button
- Shows loading state when checking
- Calls `checkAuth()` on click
- Re-enables button after check completes

Remove: tests for opening browser, timeout behavior, OAuth URL handling.

**Step 5: Update AuthContainer.test.tsx**

Should need minimal changes — just verify it still renders `SignInButton` when signed out and `UserMenu` when signed in.

**Step 6: Update useAuthStateListener.test.ts**

Should need no changes — it still listens to the same events.

**Step 7: Verify store.test.ts and UserMenu.test.tsx**

These should be unaffected. Verify:

```bash
npm test -- --run
```

**Step 8: Commit**

```bash
git add -A src/features/auth/__test__/
git commit -m "test: update auth tests for cookie-based flow"
```

---

### Task 19: Final verification

**Files:** None (verification only)

**Step 1: TypeScript check**

```bash
npm run typecheck
```

Expected: no errors.

**Step 2: Run all frontend tests**

```bash
npm test -- --run
```

Expected: all tests pass.

**Step 3: Cargo check**

```bash
cd src-tauri && cargo check
```

Expected: clean compilation.

**Step 4: Cargo test**

```bash
cd src-tauri && cargo test
```

Expected: all tests pass.

**Step 5: Smoke test with `tauri dev`**

```bash
npm run tauri dev
```

Verify:
- App launches without errors
- Auth state shows "not signed in" or detects browser cookie
- If signed in: username and plan badge display correctly
- "Check browser login" button works
- "Sign out" works
- Downloads work (standard quality without auth, HQ with auth)

**Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve issues found during final verification"
```
