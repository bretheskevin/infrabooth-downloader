# Story 2.2: Implement OAuth 2.1 Flow with PKCE

Status: review

## Story

As a **user**,
I want **secure authentication with SoundCloud**,
so that **my credentials are never exposed to the app directly**.

## Acceptance Criteria

1. **Given** the deep link handler from Story 2.1
   **When** the OAuth flow is initiated
   **Then** a PKCE code verifier (random string) is generated
   **And** a code challenge is derived using SHA-256
   **And** both are stored temporarily in memory

2. **Given** PKCE parameters are generated
   **When** constructing the authorization URL
   **Then** the URL includes:
   - `client_id`: `4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv`
   - `redirect_uri`: `sc-downloader://auth/callback`
   - `response_type`: `code`
   - `code_challenge`: the generated challenge
   - `code_challenge_method`: `S256`

3. **Given** the user authorizes in the browser
   **When** the callback URL is received with an authorization code
   **Then** a token exchange request is made to SoundCloud's token endpoint
   **And** the request includes the code verifier for PKCE validation
   **And** the Client Secret is read from secure configuration (API-7)

4. **Given** the token exchange succeeds
   **When** tokens are received
   **Then** both access_token and refresh_token are captured
   **And** the token expiry time is recorded
   **And** an auth success event is emitted to the frontend

5. **Given** the token exchange fails
   **When** an error response is received
   **Then** a user-friendly error message is returned
   **And** the PKCE state is cleared

## Tasks / Subtasks

- [x] Task 1: Create OAuth service module (AC: #1, #2)
  - [x] 1.1 Create `src-tauri/src/services/oauth.rs`
  - [x] 1.2 Implement PKCE code verifier generation:
    ```rust
    use rand::Rng;
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    use sha2::{Sha256, Digest};

    pub fn generate_pkce() -> (String, String) {
        let verifier: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(64)
            .map(char::from)
            .collect();

        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

        (verifier, challenge)
    }
    ```
  - [x] 1.3 Add dependencies to Cargo.toml:
    ```toml
    rand = "0.8"
    base64 = "0.21"
    sha2 = "0.10"
    ```

- [x] Task 2: Implement authorization URL builder (AC: #2)
  - [x] 2.1 Create constants for OAuth config:
    ```rust
    const CLIENT_ID: &str = "4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv";
    const REDIRECT_URI: &str = "sc-downloader://auth/callback";
    const AUTH_URL: &str = "https://api.soundcloud.com/connect";
    const TOKEN_URL: &str = "https://api.soundcloud.com/oauth2/token";
    ```
  - [x] 2.2 Implement `build_auth_url()` function:
    ```rust
    pub fn build_auth_url(code_challenge: &str) -> String {
        format!(
            "{}?client_id={}&redirect_uri={}&response_type=code&code_challenge={}&code_challenge_method=S256",
            AUTH_URL, CLIENT_ID, REDIRECT_URI, code_challenge
        )
    }
    ```

- [x] Task 3: Implement token exchange (AC: #3, #4, #5)
  - [x] 3.1 Add reqwest for HTTP requests:
    ```toml
    reqwest = { version = "0.11", features = ["json"] }
    tokio = { version = "1", features = ["full"] }
    serde = { version = "1", features = ["derive"] }
    serde_json = "1"
    ```
  - [x] 3.2 Define token response struct:
    ```rust
    #[derive(Deserialize)]
    pub struct TokenResponse {
        pub access_token: String,
        pub refresh_token: String,
        pub expires_in: u64,
        pub token_type: String,
    }
    ```
  - [x] 3.3 Implement `exchange_code()` function:
    ```rust
    pub async fn exchange_code(
        code: &str,
        code_verifier: &str,
        client_secret: &str,
    ) -> Result<TokenResponse, AuthError> {
        let client = reqwest::Client::new();
        let response = client
            .post(TOKEN_URL)
            .form(&[
                ("grant_type", "authorization_code"),
                ("client_id", CLIENT_ID),
                ("client_secret", client_secret),
                ("redirect_uri", REDIRECT_URI),
                ("code", code),
                ("code_verifier", code_verifier),
            ])
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            Err(AuthError::TokenExchangeFailed)
        }
    }
    ```

- [x] Task 4: Create OAuth state manager (AC: #1, #5)
  - [x] 4.1 Create state struct to hold PKCE values:
    ```rust
    use std::sync::Mutex;
    use tauri::State;

    pub struct OAuthState {
        pub verifier: Mutex<Option<String>>,
    }
    ```
  - [x] 4.2 Register state in Tauri app:
    ```rust
    .manage(OAuthState { verifier: Mutex::new(None) })
    ```
  - [x] 4.3 Clear state after use or on error

- [x] Task 5: Create Tauri commands (AC: #2, #3, #4)
  - [x] 5.1 Create `src-tauri/src/commands/auth.rs`
  - [x] 5.2 Implement `start_oauth` command:
    ```rust
    #[tauri::command]
    pub async fn start_oauth(
        state: State<'_, OAuthState>,
    ) -> Result<String, String> {
        let (verifier, challenge) = generate_pkce();
        *state.verifier.lock().unwrap() = Some(verifier);
        Ok(build_auth_url(&challenge))
    }
    ```
  - [x] 5.3 Implement `complete_oauth` command (called after callback):
    ```rust
    #[tauri::command]
    pub async fn complete_oauth(
        code: String,
        state: State<'_, OAuthState>,
        app: AppHandle,
    ) -> Result<(), String> {
        let verifier = state.verifier.lock().unwrap().take()
            .ok_or("No OAuth flow in progress")?;

        let client_secret = get_client_secret()?; // From secure config
        let tokens = exchange_code(&code, &verifier, &client_secret)
            .await
            .map_err(|e| e.to_string())?;

        // Store tokens (Story 2.5)
        // Fetch user profile (Story 2.4)
        // Emit success event
        app.emit("auth-state-changed", AuthState {
            is_signed_in: true,
            username: None // Will be set in Story 2.4
        })?;

        Ok(())
    }
    ```
  - [x] 5.4 Register commands in lib.rs

- [x] Task 6: Implement client secret handling (AC: #3)
  - [x] 6.1 Create `.env.example` with `SOUNDCLOUD_CLIENT_SECRET=`
  - [x] 6.2 Add `dotenvy` crate for env loading:
    ```toml
    dotenvy = "0.15"
    ```
  - [x] 6.3 Implement `get_client_secret()`:
    ```rust
    fn get_client_secret() -> Result<String, AuthError> {
        std::env::var("SOUNDCLOUD_CLIENT_SECRET")
            .map_err(|_| AuthError::MissingClientSecret)
    }
    ```
  - [x] 6.4 Document secure configuration in README

- [x] Task 7: Create TypeScript bindings (AC: #4)
  - [x] 7.1 Create `src/lib/auth.ts`:
    ```typescript
    import { invoke } from '@tauri-apps/api/core';
    import { open } from '@tauri-apps/plugin-shell';

    export async function startOAuth(): Promise<void> {
      const authUrl = await invoke<string>('start_oauth');
      await open(authUrl);
    }

    export async function completeOAuth(code: string): Promise<void> {
      await invoke('complete_oauth', { code });
    }
    ```
  - [x] 7.2 Add shell plugin: `npm install @tauri-apps/plugin-shell`

## Dev Notes

### SoundCloud OAuth 2.1 with PKCE

SoundCloud requires OAuth 2.1 with PKCE for secure authorization. This flow:
1. Generate random code_verifier (64 chars)
2. Hash with SHA-256 → code_challenge
3. Open browser with challenge
4. Receive auth code via deep link
5. Exchange code + verifier for tokens

[Source: _bmad-output/planning-artifacts/epics.md#API-1]

### OAuth Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://api.soundcloud.com/connect` |
| Token | `https://api.soundcloud.com/oauth2/token` |
| User Profile | `https://api.soundcloud.com/me` |

### Client Credentials

- **Client ID:** `4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv` (can be in code)
- **Client Secret:** Must be in environment variable, NEVER in code

[Source: _bmad-output/planning-artifacts/epics.md#API-6, API-7]

### Token Response Structure

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Access tokens expire in ~1 hour. Refresh tokens are single-use.
[Source: _bmad-output/planning-artifacts/epics.md#API-4]

### Error Types

Define in `src-tauri/src/models/error.rs`:
```rust
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Missing client secret configuration")]
    MissingClientSecret,
    #[error("Token exchange failed")]
    TokenExchangeFailed,
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    #[error("No OAuth flow in progress")]
    NoFlowInProgress,
}
```

[Source: project-context.md#Rust Error Handling]

### Security Requirements

- HTTPS only for all network requests (NFR6)
- Client secret NEVER in source code
- PKCE verifier stored in memory only, cleared after use
- Tokens will be encrypted at rest (Story 2.5)

[Source: project-context.md#Security Rules]

### File Structure After This Story

```
src-tauri/
├── Cargo.toml           # + rand, base64, sha2, reqwest, dotenvy
├── .env.example         # Template for secrets
├── src/
│   ├── commands/
│   │   ├── mod.rs
│   │   └── auth.rs      # start_oauth, complete_oauth
│   ├── services/
│   │   ├── mod.rs
│   │   ├── deep_link.rs # From 2.1
│   │   └── oauth.rs     # PKCE, token exchange
│   └── models/
│       ├── mod.rs
│       └── error.rs     # AuthError

src/
├── lib/
│   └── auth.ts          # TypeScript OAuth helpers
```

### What This Story Does NOT Include

- Token storage/persistence (Story 2.5)
- User profile fetching (Story 2.4)
- Sign-in UI button (Story 2.3)
- Token refresh logic (Story 2.5)

This story implements the core OAuth flow; other stories handle UI and persistence.

### Tauri Command Naming

- Rust: `snake_case` → `start_oauth`, `complete_oauth`
- JS invoke: `snake_case` (matches Rust) → `invoke('start_oauth')`

[Source: project-context.md#Tauri IPC]

### Anti-Patterns to Avoid

- Do NOT store client secret in code — use environment variable
- Do NOT skip PKCE — SoundCloud requires it
- Do NOT log tokens — security risk
- Do NOT use HTTP — HTTPS only
- Do NOT leave PKCE state around after use — clear it

### Testing the Result

After completing all tasks:
1. `start_oauth` returns valid authorization URL
2. URL contains correct client_id, redirect_uri, code_challenge
3. Deep link callback triggers `complete_oauth`
4. Token exchange succeeds with valid code
5. `auth-state-changed` event emitted on success
6. Errors handled gracefully with user-friendly messages

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/epics.md#API-1 through API-7]
- [Source: project-context.md#Security Rules]
- [Source: architecture/implementation-patterns-consistency-rules.md#Tauri Commands]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No debug issues encountered.

### Completion Notes List

- ✅ Implemented PKCE generation with 64-char verifier and SHA-256 challenge (12 unit tests)
- ✅ Created OAuth service module with constants for SoundCloud endpoints
- ✅ Implemented token exchange function with proper error handling
- ✅ Created AuthError enum using thiserror with 4 error variants (6 unit tests)
- ✅ Created OAuthState struct with Mutex for thread-safe verifier storage (5 unit tests)
- ✅ Implemented `start_oauth` and `complete_oauth` Tauri commands
- ✅ Registered commands and state in lib.rs
- ✅ Added dotenvy for environment variable loading
- ✅ Created .env.example template for client secret
- ✅ Added .env to .gitignore for security
- ✅ Created TypeScript auth module with startOAuth and completeOAuth functions (5 unit tests)
- ✅ Installed @tauri-apps/plugin-shell for browser opening
- ✅ Added shell:allow-open permission to capabilities

**Test Summary:**
- Rust tests: 33 passing
- TypeScript tests: 108 passing (5 new auth tests)
- Total: 141 tests

### File List

**New Files:**
- src-tauri/src/services/oauth.rs
- src-tauri/src/models/mod.rs
- src-tauri/src/models/error.rs
- src-tauri/src/commands/mod.rs
- src-tauri/src/commands/auth.rs
- src-tauri/.env.example
- src/lib/auth.ts
- src/lib/auth.test.ts

**Modified Files:**
- src-tauri/Cargo.toml (added rand, base64, sha2, reqwest, tokio, thiserror, dotenvy, tauri-plugin-shell)
- src-tauri/src/lib.rs (added commands, models modules, registered state and commands)
- src-tauri/src/services/mod.rs (added oauth module export)
- src-tauri/capabilities/default.json (added shell:allow-open permission)
- .gitignore (added .env, target/, Cargo.lock)
- package.json (added @tauri-apps/plugin-shell dependency)

### Change Log

- 2026-02-06: Implemented OAuth 2.1 with PKCE flow for SoundCloud authentication (Story 2.2)

