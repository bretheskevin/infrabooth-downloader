# Authentication System

## Flow
1. App startup → `useStartupAuth` hook calls `checkAuth` command
2. Rust `cookie.rs` scans browser cookies (via rookie crate) for SoundCloud oauth_token
3. Token verified via `oauth.rs` → calls SoundCloud /me endpoint → UserProfile (id, username, avatar_url, plan)
4. AuthState cached in `storage.rs` (in-memory Mutex: oauth_token + datadome + user_id)
5. Frontend AuthStore (Zustand): isSignedIn, username, avatarUrl, plan, cookieWarning

## Cookie Extraction
- `scan_browser_cookies()` → BrowserCookie (value, browser name, datadome cookie)
- CookieScanResult includes optional datadome and appbound encryption warning
- Datadome cookie forwarded with API requests for anti-bot bypass
- WARNING_APPBOUND_ENCRYPTION constant for Chrome cookie limitation warning

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
