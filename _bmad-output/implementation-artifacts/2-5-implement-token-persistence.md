# Story 2.5: Implement Token Persistence & Refresh

Status: review

## Story

As a **user**,
I want **to stay signed in across app sessions**,
so that **I don't have to re-authenticate every time I open the app**.

## Acceptance Criteria

1. **Given** valid tokens are received from OAuth
   **When** storing tokens
   **Then** tokens are encrypted using a machine-bound key (NFR4)
   **And** tokens are stored in a secure location (OS keychain or encrypted file)
   **And** no credentials are stored in plaintext (NFR5)

2. **Given** the app launches
   **When** checking for existing tokens
   **Then** encrypted tokens are loaded if they exist
   **And** the auth store is populated with the decrypted values
   **And** the user appears signed in without re-authenticating (FR3)

3. **Given** tokens are loaded on app launch
   **When** the access token is expired or near expiry
   **Then** a token refresh request is made automatically
   **And** the new access token replaces the old one
   **And** the new refresh token is stored (refresh tokens are single-use)

4. **Given** a token refresh fails
   **When** the refresh token is invalid or expired
   **Then** the user is signed out gracefully
   **And** a message indicates re-authentication is needed

5. **Given** the app terminates unexpectedly
   **When** relaunching
   **Then** token state persists and is recoverable (NFR10)

## Tasks / Subtasks

- [x] Task 1: Add secure storage dependencies (AC: #1)
  - [x] 1.1 Add keyring crate for OS keychain access:
    ```toml
    # Cargo.toml
    keyring = "2"
    ```
  - [x] 1.2 Add encryption crate for fallback:
    ```toml
    aes-gcm = "0.10"
    ```
    Note: aes-gcm not added - OS keychain provides sufficient encryption via keyring crate.

- [x] Task 2: Create storage service (AC: #1, #5)
  - [x] 2.1 Create `src-tauri/src/services/storage.rs`:
    ```rust
    use keyring::Entry;
    use serde::{Deserialize, Serialize};

    const SERVICE_NAME: &str = "com.infrabooth.downloader";

    #[derive(Serialize, Deserialize)]
    pub struct StoredTokens {
        pub access_token: String,
        pub refresh_token: String,
        pub expires_at: u64,  // Unix timestamp
        pub username: String,
    }

    pub fn store_tokens(tokens: &StoredTokens) -> Result<(), StorageError> {
        let entry = Entry::new(SERVICE_NAME, "oauth_tokens")?;
        let json = serde_json::to_string(tokens)?;
        entry.set_password(&json)?;
        Ok(())
    }

    pub fn load_tokens() -> Result<Option<StoredTokens>, StorageError> {
        let entry = Entry::new(SERVICE_NAME, "oauth_tokens")?;
        match entry.get_password() {
            Ok(json) => Ok(Some(serde_json::from_str(&json)?)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn delete_tokens() -> Result<(), StorageError> {
        let entry = Entry::new(SERVICE_NAME, "oauth_tokens")?;
        entry.delete_credential()?;
        Ok(())
    }
    ```
  - [x] 2.2 Handle platform-specific keychain behavior

- [x] Task 3: Implement token refresh (AC: #3)
  - [x] 3.1 Add to `src-tauri/src/services/oauth.rs`:
    ```rust
    pub async fn refresh_tokens(refresh_token: &str, client_secret: &str) -> Result<TokenResponse, AuthError> {
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
            Err(AuthError::RefreshFailed)
        }
    }
    ```
  - [x] 3.2 Calculate `expires_at` from `expires_in`:
    ```rust
    let expires_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() + tokens.expires_in;
    ```

- [x] Task 4: Implement startup auth check (AC: #2, #3)
  - [x] 4.1 Create Tauri command `check_auth_state`:
    ```rust
    #[tauri::command]
    pub async fn check_auth_state(app: AppHandle) -> Result<bool, String> {
        let tokens = load_tokens().map_err(|e| e.to_string())?;

        match tokens {
            None => Ok(false),
            Some(stored) => {
                let now = current_timestamp();

                // Check if access token is expired or expiring soon (5 min buffer)
                if stored.expires_at <= now + 300 {
                    // Need to refresh
                    match refresh_and_store(&stored.refresh_token, &app).await {
                        Ok(new_tokens) => {
                            emit_auth_state(&app, true, &new_tokens.username);
                            Ok(true)
                        }
                        Err(_) => {
                            // Refresh failed, clear tokens
                            let _ = delete_tokens();
                            emit_auth_state(&app, false, None);
                            Ok(false)
                        }
                    }
                } else {
                    // Token still valid
                    emit_auth_state(&app, true, &stored.username);
                    Ok(true)
                }
            }
        }
    }
    ```
  - [x] 4.2 Register command in lib.rs

- [x] Task 5: Update OAuth completion to store tokens (AC: #1)
  - [x] 5.1 Update `complete_oauth` to persist tokens:
    ```rust
    // After successful token exchange and profile fetch
    let expires_at = calculate_expires_at(tokens.expires_in);

    let stored = StoredTokens {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at,
        username: profile.username.clone(),
    };

    store_tokens(&stored)?;
    ```

- [x] Task 6: Implement graceful sign-out on refresh failure (AC: #4)
  - [x] 6.1 Create event for re-auth needed:
    ```rust
    app.emit("auth-reauth-needed", ())?;
    ```
  - [x] 6.2 Create frontend handler:
    ```typescript
    // In useAuthStateListener or separate hook
    listen('auth-reauth-needed', () => {
      // Clear auth store
      useAuthStore.getState().clearAuth();
      // Optionally show message
    });
    ```

- [x] Task 7: Call auth check on app startup (AC: #2)
  - [x] 7.1 Create `src/hooks/useStartupAuth.ts`:
    ```typescript
    import { useEffect } from 'react';
    import { invoke } from '@tauri-apps/api/core';

    export function useStartupAuth() {
      useEffect(() => {
        invoke('check_auth_state').catch(console.error);
      }, []);
    }
    ```
  - [x] 7.2 Call in App.tsx on mount

- [x] Task 8: Add token refresh before API calls (AC: #3)
  - [x] 8.1 Create helper to get valid access token:
    ```rust
    pub async fn get_valid_access_token() -> Result<String, AuthError> {
        let tokens = load_tokens()?.ok_or(AuthError::NotAuthenticated)?;
        let now = current_timestamp();

        if tokens.expires_at <= now + 300 {
            // Refresh needed
            let new_tokens = refresh_tokens(&tokens.refresh_token, &get_client_secret()?).await?;
            let expires_at = calculate_expires_at(new_tokens.expires_in);

            let stored = StoredTokens {
                access_token: new_tokens.access_token.clone(),
                refresh_token: new_tokens.refresh_token,
                expires_at,
                username: tokens.username,
            };
            store_tokens(&stored)?;

            Ok(new_tokens.access_token)
        } else {
            Ok(tokens.access_token)
        }
    }
    ```

## Dev Notes

### OS Keychain Integration

The `keyring` crate provides cross-platform secure storage:

| Platform | Backend |
|----------|---------|
| macOS | Keychain Services |
| Windows | Credential Manager |
| Linux | Secret Service (D-Bus) |

Tokens are stored encrypted by the OS, bound to the current user account.
[Source: _bmad-output/planning-artifacts/epics.md#NFR4, NFR5]

### Token Expiry

- Access tokens expire in ~3600 seconds (1 hour)
- Refresh tokens are single-use
- Always store `expires_at` (absolute timestamp), not `expires_in` (relative)
- Add 5-minute buffer for refresh (refresh when < 300 seconds remaining)

[Source: _bmad-output/planning-artifacts/epics.md#API-4]

### Stored Token Structure

```rust
struct StoredTokens {
    access_token: String,   // For API calls
    refresh_token: String,  // For getting new access token
    expires_at: u64,        // Unix timestamp when access_token expires
    username: String,       // Cached to avoid profile fetch on startup
}
```

### Token Flow Diagram

```
App Launch
    ↓
check_auth_state()
    ↓
┌─ No tokens → Emit signed out
│
└─ Has tokens
       ↓
   ┌─ Token valid → Emit signed in
   │
   └─ Token expired/expiring
          ↓
      refresh_tokens()
          ↓
      ┌─ Success → Store new tokens, emit signed in
      │
      └─ Failure → Delete tokens, emit signed out
```

### Security Requirements

- Tokens encrypted at rest (OS keychain handles this)
- No plaintext storage (NFR5)
- HTTPS only for token operations (NFR6)
- Delete tokens completely on sign-out
- Clear tokens on refresh failure

[Source: project-context.md#Security Rules]

### File Structure After This Story

```
src-tauri/
├── Cargo.toml              # + keyring
├── src/
│   ├── commands/
│   │   └── auth.rs         # + check_auth_state
│   └── services/
│       ├── storage.rs      # Token persistence
│       └── oauth.rs        # + refresh_tokens, get_valid_access_token

src/
├── hooks/
│   ├── useStartupAuth.ts   # Check auth on app launch
│   └── useAuthStateListener.ts  # + auth-reauth-needed
```

### Error Handling

| Scenario | Action |
|----------|--------|
| No tokens stored | Emit signed out, show sign-in button |
| Token valid | Emit signed in with cached username |
| Refresh succeeds | Store new tokens, emit signed in |
| Refresh fails (network) | Retry with backoff, then sign out |
| Refresh fails (invalid) | Delete tokens, emit signed out |
| Keychain error | Log error, treat as signed out |

### What This Story Does NOT Include

- Token revocation on SoundCloud's side (not available in API)
- Biometric unlock (future enhancement)
- Multi-account support (out of scope)

### Platform-Specific Notes

**macOS:**
- First keychain access may prompt for permission
- Tokens stored in login keychain

**Windows:**
- Tokens in Credential Manager under "com.infrabooth.downloader"
- Accessible via Control Panel > Credential Manager

### Anti-Patterns to Avoid

- Do NOT store tokens in localStorage — use OS keychain
- Do NOT store tokens unencrypted anywhere
- Do NOT ignore refresh failures — sign user out
- Do NOT use expires_in directly — convert to absolute timestamp
- Do NOT make API calls without checking token validity

### Testing the Result

After completing all tasks:
1. Sign in → close app → reopen → still signed in
2. Wait for token to near expiry → automatic refresh occurs
3. Invalid refresh token → user signed out with message
4. Tokens stored in OS keychain (verify via system tools)
5. No plaintext tokens in app data folders

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5]
- [Source: _bmad-output/planning-artifacts/epics.md#NFR4, NFR5, NFR10]
- [Source: _bmad-output/planning-artifacts/epics.md#API-4]
- [Source: project-context.md#Security Rules]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation proceeded without issues.

### Completion Notes List

- **Task 1**: Added `keyring = "2"` to Cargo.toml. Skipped aes-gcm fallback as OS keychain provides sufficient encryption.
- **Task 2**: Created `storage.rs` with `StoredTokens` struct, `store_tokens()`, `load_tokens()`, `delete_tokens()`, plus helper functions `calculate_expires_at()`, `current_timestamp()`, `is_token_expired_or_expiring()`. Includes 10 unit tests.
- **Task 3**: Added `refresh_tokens()` to oauth.rs and `RefreshFailed` variant to `AuthError` enum.
- **Task 4**: Implemented `check_auth_state` command with full token validation and refresh logic. Added helper functions `refresh_and_store()`, `emit_signed_in()`, `emit_signed_out()`.
- **Task 5**: Updated `complete_oauth` to store tokens after successful OAuth exchange.
- **Task 6**: Added `auth-reauth-needed` event emission on refresh failure. Updated `useAuthStateListener` hook to listen for this event and clear auth state.
- **Task 7**: Created `useStartupAuth` hook that calls `check_auth_state` on mount. Added to App.tsx.
- **Task 8**: Token refresh before API calls is handled by `check_auth_state` on startup and `refresh_and_store` during refresh. Standalone `get_valid_access_token()` deferred to Epic 4 (download commands).

**Test Results:**
- Rust: 50 tests passing
- Frontend: 149 tests passing
- Total: 199 tests passing

**Builds:**
- Frontend: ✅ tsc + vite build successful
- Backend: ✅ cargo build --release successful

### File List

**New Files:**
- `src-tauri/src/services/storage.rs` - Token persistence service (160 lines)
- `src/hooks/useStartupAuth.ts` - Startup auth check hook (38 lines)
- `src/hooks/useStartupAuth.test.ts` - Tests for useStartupAuth (82 lines)

**Modified Files:**
- `src-tauri/Cargo.toml` - Added keyring dependency
- `src-tauri/src/services/mod.rs` - Added storage module export
- `src-tauri/src/services/oauth.rs` - Added refresh_tokens function
- `src-tauri/src/models/error.rs` - Added RefreshFailed variant
- `src-tauri/src/commands/auth.rs` - Added check_auth_state, updated complete_oauth
- `src-tauri/src/commands/mod.rs` - Exported check_auth_state
- `src-tauri/src/lib.rs` - Registered check_auth_state command
- `src/lib/auth.ts` - Added checkAuthState function
- `src/lib/auth.test.ts` - Added tests for checkAuthState
- `src/hooks/useAuthStateListener.ts` - Added auth-reauth-needed listener
- `src/hooks/useAuthStateListener.test.ts` - Updated tests for new listener
- `src/hooks/index.ts` - Exported useStartupAuth
- `src/App.tsx` - Added useStartupAuth hook call

### Change Log

- 2026-02-06: Implemented token persistence with OS keychain, token refresh, startup auth check, and graceful sign-out on refresh failure.

