# Browser Cookie Authentication Design

## Problem

The app's registered OAuth PKCE tokens (issued for `CLIENT_ID=4CHDCUOhHIdSxBv4XN0msyZXuIXbB5wv`) are rejected by SoundCloud's API v2 with 403. API v2 is the only way to access Go+ HQ 256kbps transcodings (`quality: "hq"`). The v1 API `/tracks/{id}/streams` works with the registered app tokens but caps at 160kbps AAC.

yt-dlp solves this by extracting the `oauth_token` cookie from the user's browser. That token was issued for SoundCloud's own web app client_id (the one scraped from JS bundles), so it works with v2 and unlocks HQ.

### Validated with curl

| Endpoint | Auth | Result |
|----------|------|--------|
| v2 resolve | scraped client_id, no OAuth | 200 (SQ only) |
| v2 resolve | scraped client_id + registered app OAuth | **403** |
| v2 resolve | scraped client_id + browser cookie OAuth | **200 (SQ + HQ)** (expected) |
| v1 /tracks/{id}/streams | registered app OAuth | 200 (160kbps max) |

## Solution

Replace the PKCE OAuth flow with browser cookie extraction using the `rookie` Rust crate. Extract the `oauth_token` cookie from `soundcloud.com`, use it alongside the scraped `client_id` for all v2 API calls.

## Architecture

### Token Acquisition Flow

```
App Start
  → Rust: scan_browser_cookies("soundcloud.com", "oauth_token")
    → Try browsers in order: Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Safari
    → Found? → Verify: GET api-v2.soundcloud.com/me?client_id=SCRAPED
                        + Authorization: OAuth COOKIE_TOKEN
    → Valid? → Cache token + user info in keychain
            → Emit auth-state-changed { isSignedIn: true, username, plan }
    → Not found / invalid → Emit auth-state-changed { isSignedIn: false }
```

### Download Flow (with HQ)

```
download_track_to_mp3(track_url, cookie_token)
  → stream::resolve_stream_url(track_url, scraped_client_id, cookie_token)
    → GET api-v2.soundcloud.com/resolve?url=...&client_id=SCRAPED
      + Authorization: OAuth COOKIE_TOKEN
    → Response includes transcodings with quality="hq" for Go+ users
    → select_best_transcoding() picks aac_hq (256kbps) over aac_160k
    → Resolve transcoding URL → signed CDN URL
  → ffmpeg downloads CDN URL (no auth header needed on CDN URLs)
```

### Token Refresh on Failure

```
Download fails with 401/403
  → Re-scan browser cookies silently
  → Retry request with new token
  → Still fails? → Emit auth-reauth-needed
                 → Frontend shows: "Log in to SoundCloud in your browser"
```

## Dependencies

### New: `rookie` crate

- [crates.io/crates/rookie](https://crates.io/crates/rookie) (v0.5.6)
- Supports: Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Safari, Arc, Chromium, LibreWolf, Zen
- Handles platform-specific cookie decryption (macOS Keychain for Chrome, unencrypted for Firefox)
- API: `rookie::chrome(Some(vec!["soundcloud.com".into()]))` → `Vec<Cookie>`

### Removed

- `keyring` crate usage for OAuth tokens (can keep for caching)
- Deep link scheme (`ib-downloader://auth/callback`)
- PKCE OAuth flow

## Platform Considerations

| Browser | macOS | Windows | Notes |
|---------|-------|---------|-------|
| Firefox | Seamless | Seamless | Cookies unencrypted in SQLite |
| Chrome | Keychain prompt (one-time) | DPAPI (seamless) | "Chrome Safe Storage" access |
| Brave | Keychain prompt (one-time) | DPAPI (seamless) | "Brave Safe Storage" |
| Edge | Keychain prompt (one-time) | DPAPI (seamless) | |
| Safari | Needs Full Disk Access | N/A | Most invasive, try last |

## Changes by File

### Backend (Rust)

| File | Change |
|------|--------|
| `Cargo.toml` | Add `rookie` dependency |
| `services/oauth.rs` | Remove PKCE flow. Add `extract_browser_token()` and `verify_token()` |
| `services/storage.rs` | Simplify — cache browser token + user info (not source of truth) |
| `services/client_id.rs` | Keep as-is (still needed for v2 API calls) |
| `services/stream.rs` | Use scraped `client_id` + cookie token (both from web app context now) |
| `services/playlist.rs` | Switch from app token to scraped `client_id` + cookie token |
| `commands/auth.rs` | Replace `start_oauth`/`complete_oauth` with `check_auth`/`refresh_auth` |
| `lib.rs` | Update command registration, remove deep link plugin |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `features/auth/api.ts` | Remove `startOAuth`/`completeOAuth`, add `refreshAuth` |
| `features/auth/hooks/useOAuthFlow.ts` | Remove (no more PKCE callback) |
| `features/auth/hooks/useAuthCallback.ts` | Remove (no more deep link callback) |
| `features/auth/hooks/useStartupAuth.ts` | Keep, calls new `checkAuth` command |
| `features/auth/hooks/useAuthStateListener.ts` | Keep as-is |
| `features/auth/components/SignInButton.tsx` | Replace with status message + "Refresh from browser" button |
| `features/auth/components/AuthContainer.tsx` | Update for new flow |
| `features/auth/store.ts` | Keep same shape (isSignedIn, username, plan, avatarUrl) |
| `locales/{en,fr}.json` | Update auth-related strings |

### Config

| File | Change |
|------|--------|
| `tauri.conf.json` | Remove deep-link scheme |

## UX Design

### Signed in (cookie found)
Same as current: username displayed, "Go+ 256kbps" badge if Go+ subscriber, sign-out option in menu.

### Not signed in (no cookie found)
Message: "Log in to SoundCloud in your browser to enable downloads"
Button: "Check browser login" (re-scans cookies)

### Session expired during download
Auto re-scan cookies silently. If still fails:
Toast notification: "SoundCloud session expired. Please log in to SoundCloud in your browser."
Button in toast or auth area: "Refresh"

### Sign out
"Sign out" clears the cached token. App returns to "not signed in" state. User can re-import by clicking "Check browser login".

## What Stays the Same

- `downloader.rs` — ffmpeg download logic unchanged
- `pipeline.rs` — pipeline orchestration unchanged
- `queue.rs` — queue management unchanged (still gets token from storage)
- `metadata.rs` — ID3 tagging unchanged
- Auth store interface — same Zustand store shape
- Frontend auth state listener — same event-driven updates
- `cancellation.rs` — unchanged
