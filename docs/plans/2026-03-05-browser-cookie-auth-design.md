# Browser Cookie Authentication Design

## Problem

The app's registered OAuth PKCE tokens (issued for `CLIENT_ID=4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv`) are rejected by SoundCloud's API v2 with 403. API v2 is the only way to access Go+ HQ 256kbps transcodings (`quality: "hq"`). The v1 API `/tracks/{id}/streams` works with the registered app tokens but caps at 160kbps AAC.

yt-dlp solves this by extracting the `oauth_token` cookie from the user's browser. That token was issued for SoundCloud's own web app client_id (the one scraped from JS bundles), so it works with v2 and unlocks HQ.

### Validated with curl

| Endpoint | Auth | Result |
|----------|------|--------|
| v2 resolve | scraped client_id, no OAuth | 200 (SQ only) |
| v2 resolve | scraped client_id + registered app OAuth | **403** |
| v2 resolve | scraped client_id + browser cookie OAuth | **200 (SQ + HQ)** |
| v1 /tracks/{id}/streams | registered app OAuth | 200 (160kbps max) |

## Solution

Replace the PKCE OAuth flow with browser cookie extraction using the `rookie` Rust crate. Extract the `oauth_token` cookie from `soundcloud.com`, use it alongside the scraped `client_id` for all v2 API calls.

Cookie auth is an **enhancement**, not a requirement. Without a browser token, downloads still work using the scraped `client_id` alone (standard quality, ~128/160kbps). With a browser token from a Go+ subscriber, HQ 256kbps transcodings are unlocked.

## Architecture

### Token Acquisition Flow

```
App Start
  -> Rust: scan_browser_cookies("soundcloud.com", "oauth_token")
    -> Try browsers in order (platform-specific, see below)
    -> Found? -> Verify: GET api-v2.soundcloud.com/me?client_id=SCRAPED
                          + Authorization: OAuth COOKIE_TOKEN
    -> Valid? -> Cache token + user info in app state
             -> Emit auth-state-changed { isSignedIn: true, username, plan }
    -> Not found / invalid -> Emit auth-state-changed { isSignedIn: false }
                           -> App remains usable at standard quality
```

### Browser Scan Order

Firefox is prioritized on all platforms because it has the least friction (no Keychain prompt on macOS, no admin rights on Windows).

| Platform | Order |
|----------|-------|
| macOS | Firefox -> Chrome -> Brave -> Edge -> Opera -> Vivaldi -> Arc |
| Windows | Firefox -> Chrome -> Brave -> Edge -> Opera -> Vivaldi |

Safari is **excluded** — it requires Full Disk Access, which is too invasive for a download utility.

### Firefox SQLite Safety

Firefox holds a WAL lock on `cookies.sqlite` while running. To avoid read failures:

1. Copy `cookies.sqlite` to a temp directory
2. Read cookies from the copy
3. Clean up the temp file
4. If the copy fails, skip Firefox and try the next browser

### Download Flow (with HQ)

```
download_track_to_mp3(track_url, cookie_token?)
  -> stream::resolve_stream_url(track_url, scraped_client_id, cookie_token)
    -> GET api-v2.soundcloud.com/resolve?url=...&client_id=SCRAPED
      + Authorization: OAuth COOKIE_TOKEN (if available)
    -> Response includes transcodings with quality="hq" for Go+ users
    -> select_best_transcoding() picks aac_hq (256kbps) over aac_160k
    -> Resolve transcoding URL -> signed CDN URL
  -> ffmpeg downloads CDN URL (no auth header needed on CDN URLs)
```

Without a cookie token, the resolve call still succeeds but only returns standard-quality transcodings.

### Token Refresh on Failure

```
Download fails with 401/403
  -> Acquire refresh mutex (prevents concurrent re-scans)
  -> Re-scan browser cookies silently
  -> Release mutex; waiting threads use the refreshed token
  -> Retry request with new token
  -> Still fails? -> Emit auth-reauth-needed
                  -> Frontend shows: "Log in to SoundCloud in your browser"
```

### Concurrent Refresh Guard

Multiple parallel downloads may hit 401/403 simultaneously. A `Mutex<Option<CachedToken>>` ensures:

- The first thread to fail acquires the lock and re-scans cookies
- Other threads wait for the lock, then use the refreshed token
- Prevents redundant filesystem access, Keychain prompts, and SQLite locks

## Dependencies

### New: `rookie` crate

- [crates.io/crates/rookie](https://crates.io/crates/rookie) (v0.5.6, LGPL-3.0-or-later)
- Supports: Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Arc, Chromium, LibreWolf, Zen
- Handles platform-specific cookie decryption (macOS Keychain for Chrome, DPAPI for Windows Chrome, unencrypted SQLite for Firefox)
- API: `rookie::firefox(Some(vec!["soundcloud.com".into()]))` -> `Vec<Cookie>`

### Removed

- `keyring` crate usage for OAuth tokens
- Deep link scheme (`ib-downloader://auth/callback`)
- PKCE OAuth flow (including `CLIENT_SECRET` compile-time embedding)
- Client Credentials / app token flow (`get_cached_app_token`)

## Platform Considerations

| Browser | macOS | Windows | Notes |
|---------|-------|---------|-------|
| Firefox | Seamless | Seamless | Cookies in SQLite (copy file first to avoid WAL lock) |
| Chrome | Keychain prompt (one-time) | Admin elevation (Chrome v130+) | "Chrome Safe Storage" access on macOS; app-bound encryption on Windows |
| Brave | Keychain prompt (one-time) | Admin elevation (Chrome v130+) | "Brave Safe Storage" on macOS |
| Edge | Keychain prompt (one-time) | Admin elevation (Chrome v130+) | |
| Safari | **Excluded** | N/A | Requires Full Disk Access — too invasive |

### macOS Keychain prompt

When reading Chromium cookies on macOS, `rookie` shells out to `/usr/bin/security` which triggers a system Keychain dialog. The user can click "Always Allow" for a permanent grant. In production (signed) builds, this prompt appears once. In dev builds, it may reappear on each restart.

### Windows admin elevation

Chrome v130+ on Windows uses app-bound encryption. The app requests admin privileges when Chromium cookie extraction requires it. Firefox remains seamless and is tried first.

## Changes by File

### Backend (Rust)

| File | Change |
|------|--------|
| `Cargo.toml` | Add `rookie`, remove `keyring` |
| `services/oauth.rs` | Remove PKCE flow, `CLIENT_SECRET`, `exchange_code()`, `refresh_tokens()`. Add `extract_browser_token()`, `verify_token()` |
| `services/storage.rs` | Simplify — cache `{ oauth_token, username, plan?, avatar_url? }`. Remove `refresh_token`, `expires_at`, token refresh logic |
| `services/client_id.rs` | Keep as-is (still needed for v2 API calls) |
| `services/stream.rs` | Use scraped `client_id` + optional cookie token. Remove app token fallback |
| `services/playlist.rs` | Use scraped `client_id` + optional cookie token. Remove `get_cached_app_token()` |
| `commands/auth.rs` | Replace `start_oauth`/`complete_oauth` with `check_auth`/`refresh_auth`. Add concurrent refresh mutex |
| `lib.rs` | Update command registration, remove deep link plugin |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `features/auth/api.ts` | Remove `startOAuth`/`completeOAuth`, add `refreshAuth` |
| `features/auth/hooks/useOAuthFlow.ts` | Remove (no more PKCE callback) |
| `features/auth/hooks/useAuthCallback.ts` | Remove (no more deep link callback) |
| `features/auth/hooks/useStartupAuth.ts` | Keep, calls new `checkAuth` command |
| `features/auth/hooks/useAuthStateListener.ts` | Keep as-is |
| `features/auth/components/SignInButton.tsx` | Replace with status + "Check browser login" button |
| `features/auth/components/AuthContainer.tsx` | Update for new flow |
| `features/auth/store.ts` | Keep same shape (isSignedIn, username, plan, avatarUrl) |
| `locales/{en,fr}.json` | Update auth-related strings |

### Config

| File | Change |
|------|--------|
| `tauri.conf.json` | Remove deep-link scheme |

## UX Design

### Pre-scan messaging

Before triggering the browser scan, show a contextual message to prepare the user for any system prompts.

**During scan (all platforms):**
> "Checking your browser for a SoundCloud session..."

**If a system prompt is about to appear (macOS Chromium):**
> "Your system may ask for permission to read browser data. Please allow it to enable high-quality downloads."

**If admin elevation needed (Windows Chromium):**
> "Administrator access is needed to read browser cookies. Please approve the prompt to enable high-quality downloads."

### Signed in (cookie found)

Same as current: username displayed, "Go+ 256kbps" badge if Go+ subscriber, sign-out option in menu.

### Not signed in (no cookie found)

Message: "Log in to SoundCloud in your browser for higher quality downloads"
Button: "Check browser login" (re-scans cookies)

Downloads remain functional at standard quality.

### Session expired during download

Auto re-scan cookies silently (mutex-guarded). If still fails:
Toast notification: "SoundCloud session expired. Please log in to SoundCloud in your browser."
Button in toast or auth area: "Refresh"

### Sign out

"Sign out" clears the cached token. App returns to "not signed in" state. User can re-import by clicking "Check browser login".

## What Stays the Same

- `downloader.rs` — ffmpeg download logic unchanged
- `pipeline.rs` — pipeline orchestration unchanged
- `queue.rs` — queue management unchanged
- `metadata.rs` — ID3 tagging unchanged
- Auth store interface — same Zustand store shape
- Frontend auth state listener — same event-driven updates
- `cancellation.rs` — unchanged
