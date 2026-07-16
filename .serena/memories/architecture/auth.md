# Authentication System

## Flow
1. App startup → `useStartupAuth` hook calls `checkAuth` command
2. Rust `cookie.rs` scans browser cookies (via rookie crate) for SoundCloud oauth_token
3. Token verified via `oauth.rs` → calls SoundCloud /me endpoint → UserProfile (id, username, avatar_url, plan)
4. AuthState cached in `storage.rs` (in-memory Mutex: oauth_token + datadome + user_id)
5. Frontend AuthStore (Zustand): isSignedIn, username, avatarUrl, plan, cookieWarning

## Cookie Extraction
- `enumerate_profile_tokens()` → ProfileScan (profiles: Vec<ProfileToken>, standalone_datadome, warning)
  - ProfileToken: key="{browser}:{profileDir}", oauth_token (redacted Debug), datadome, soundcloud_cookie_count
  - Sorted best-first (most SC cookies desc, browser_order asc tiebreak)
  - This is now the primary API; check_auth delegates to it
- `scan_browser_cookies()` → CookieScanResult — legacy wrapper delegating to enumerate_profile_tokens; kept for back-compat
- `soundcloud_session_cookies_for(key: Option<&str>)` → Vec<RawCookie> — keyed variant for WebView session replay
- CookieScanResult includes optional datadome and appbound encryption warning
- Datadome cookie forwarded with API requests for anti-bot bypass
- WARNING_APPBOUND_ENCRYPTION constant for Chrome cookie limitation warning

## Profile Selection (Multi-Profile)
- `check_auth(app, profile_key: Option<String>)` — decision tree:
  1. No profiles → clear, emit signed-out
  2. profile_key found → verify+connect that one
  3. Exactly 1 profile → verify+connect it
  4. 2+ profiles, no valid key → emit AUTH_PROFILE_SELECTION_NEEDED
- `list_profiles(app)` → Vec<ProfileSummary> — verifies all tokens via /me in parallel (join_all)
- ProfileSummary: key, browser, profile, username, avatar_url, plan (Serialize+Type, camelCase)
- CachedAuth gains profile_key: Option<String>; AuthState.get_profile_key() accessor
- AUTH_PROFILE_SELECTION_NEEDED event constant in events.rs
- webview_send.rs: reads cached profile_key and passes to soundcloud_session_cookies_for()

## Frontend Components
- SignInButton — triggers auth check
- UserMenu — displays user info, sign out
- AuthContainer — wrapper handling auth state display
- useAuthStateListener — listens to AUTH_STATE_CHANGED / AUTH_REAUTH_NEEDED events

## Auth in Commands
- `require_user_id(state)` → extracts user_id from AuthState
- `require_auth_and_cid(state)` → extracts oauth_token + client_id
- `get_optional_auth_and_cid(state)` → optional auth for public endpoints

## Client ID
- Scraped from SoundCloud JS bundles (client_id.rs)
- Cached globally, invalidated on failure
- Required for all API v2 requests alongside oauth_token
