# Story 2.1: Register Deep Link Protocol Handler

Status: ready-for-dev

## Story

As a **developer**,
I want **Tauri configured to handle the `sc-downloader://` custom protocol**,
so that **OAuth redirects can return to the app after browser authorization**.

## Acceptance Criteria

1. **Given** the Tauri project from Epic 1
   **When** the deep link plugin is configured
   **Then** `tauri.conf.json` registers `sc-downloader` as a custom protocol
   **And** the app can receive URLs matching `sc-downloader://auth/callback*`

2. **Given** the protocol handler is registered
   **When** a URL like `sc-downloader://auth/callback?code=abc123` is opened
   **Then** the app receives the URL and can extract query parameters
   **And** if the app is not running, it launches and receives the URL

3. **Given** the protocol is registered on macOS
   **When** checking the app bundle
   **Then** the `Info.plist` includes the URL scheme registration

4. **Given** the protocol is registered on Windows
   **When** the app is installed
   **Then** the registry entries for the protocol are created

5. **Given** a deep link is received
   **When** the app processes it
   **Then** an event is emitted to the frontend with the URL parameters

## Tasks / Subtasks

- [ ] Task 1: Add Tauri deep-link plugin (AC: #1)
  - [ ] 1.1 Add plugin to Cargo.toml:
    ```toml
    [dependencies]
    tauri-plugin-deep-link = "2"
    ```
  - [ ] 1.2 Run `cargo build` to fetch dependency
  - [ ] 1.3 Register plugin in `src-tauri/src/lib.rs`:
    ```rust
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
    ```

- [ ] Task 2: Configure protocol in tauri.conf.json (AC: #1, #3, #4)
  - [ ] 2.1 Add deep-link configuration:
    ```json
    {
      "plugins": {
        "deep-link": {
          "desktop": {
            "schemes": ["sc-downloader"]
          }
        }
      }
    }
    ```
  - [ ] 2.2 Verify configuration syntax is valid

- [ ] Task 3: Implement deep link handler in Rust (AC: #2, #5)
  - [ ] 3.1 Create `src-tauri/src/services/deep_link.rs`:
    ```rust
    use tauri::{AppHandle, Manager};
    use url::Url;

    pub fn handle_deep_link(app: &AppHandle, urls: Vec<String>) {
        for url_str in urls {
            if let Ok(url) = Url::parse(&url_str) {
                if url.scheme() == "sc-downloader" && url.path() == "/auth/callback" {
                    let code = url.query_pairs()
                        .find(|(k, _)| k == "code")
                        .map(|(_, v)| v.to_string());

                    if let Some(auth_code) = code {
                        // Emit event to frontend
                        let _ = app.emit("auth-callback", auth_code);
                    }
                }
            }
        }
    }
    ```
  - [ ] 3.2 Register handler in app setup
  - [ ] 3.3 Add `url` crate to Cargo.toml: `url = "2"`

- [ ] Task 4: Create frontend event listener (AC: #5)
  - [ ] 4.1 Create `src/hooks/useAuthCallback.ts`:
    ```typescript
    import { useEffect } from 'react';
    import { listen } from '@tauri-apps/api/event';

    export function useAuthCallback(onCallback: (code: string) => void) {
      useEffect(() => {
        const unlisten = listen<string>('auth-callback', (event) => {
          onCallback(event.payload);
        });

        return () => {
          unlisten.then((fn) => fn());
        };
      }, [onCallback]);
    }
    ```
  - [ ] 4.2 Export hook from hooks index

- [ ] Task 5: Test deep link registration (AC: #2, #3, #4)
  - [ ] 5.1 Build the app: `npm run tauri build`
  - [ ] 5.2 On macOS: Check Info.plist contains URL scheme
  - [ ] 5.3 On Windows: Verify registry entry after install
  - [ ] 5.4 Test with: `open "sc-downloader://auth/callback?code=test123"` (macOS)
  - [ ] 5.5 Verify app receives and logs the code

## Dev Notes

### Deep Link Protocol

**Protocol URI:** `sc-downloader://auth/callback`

This is the OAuth redirect URI that SoundCloud will call after user authorization. The protocol must be registered with the OS so the app handles these URLs.

[Source: _bmad-output/planning-artifacts/epics.md#API-2, API-3]

### Tauri 2.0 Deep Link Plugin

**CRITICAL:** Use Tauri 2.0 plugin pattern, not Tauri 1.x.

```rust
// Tauri 2.0 pattern
tauri::Builder::default()
    .plugin(tauri_plugin_deep_link::init())
```

The plugin handles OS-specific registration automatically:
- **macOS:** Adds URL scheme to Info.plist
- **Windows:** Creates registry entries on install

[Source: project-context.md#Tauri Version]

### Event Payload Structure

The `auth-callback` event emits the authorization code to the frontend:

```typescript
// Event name: 'auth-callback'
// Payload: string (the authorization code)

listen<string>('auth-callback', (event) => {
  console.log('Auth code received:', event.payload);
});
```

[Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]

### URL Parsing

Use the `url` crate for safe URL parsing in Rust:

```rust
use url::Url;

let url = Url::parse("sc-downloader://auth/callback?code=abc123")?;
let code = url.query_pairs()
    .find(|(k, _)| k == "code")
    .map(|(_, v)| v.to_string());
```

### File Structure After This Story

```
src-tauri/
├── Cargo.toml              # + tauri-plugin-deep-link, url
├── src/
│   ├── lib.rs              # Plugin registration
│   └── services/
│       ├── mod.rs
│       └── deep_link.rs    # Deep link handler

src/
├── hooks/
│   └── useAuthCallback.ts  # Frontend event listener
```

### Platform-Specific Behavior

| Platform | Registration | Test Command |
|----------|--------------|--------------|
| macOS | Info.plist URL schemes | `open "sc-downloader://auth/callback?code=test"` |
| Windows | Registry HKEY_CLASSES_ROOT | Start menu → Run → `sc-downloader://auth/callback?code=test` |

### Security Consideration

The deep link handler should:
- Only accept `sc-downloader://` scheme
- Only process `/auth/callback` path
- Validate URL structure before extracting parameters
- Never log or expose the authorization code in production

[Source: project-context.md#Security Rules]

### What This Story Does NOT Include

- OAuth flow initiation (Story 2.2)
- Token exchange (Story 2.2)
- UI feedback during auth (Story 2.3)
- This story ONLY sets up the protocol handler infrastructure

### Dependencies

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-deep-link = "2"
url = "2"
```

### Anti-Patterns to Avoid

- Do NOT use Tauri 1.x deep link patterns
- Do NOT hardcode the callback URL — use constants
- Do NOT skip URL validation — always parse safely
- Do NOT emit raw URLs to frontend — extract only needed data

### Testing the Result

After completing all tasks:
1. App builds without errors
2. Deep link plugin registered in Tauri config
3. `open "sc-downloader://auth/callback?code=test"` triggers event
4. Frontend receives auth code via event listener
5. App launches if not running when deep link clicked

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/epics.md#API-2, API-3]
- [Source: project-context.md#Tauri Version]
- [Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

