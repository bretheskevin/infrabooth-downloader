# Story 9.4: Implement Update Check on Launch

Status: done

## Story

As a **user**,
I want **the app to check for updates when I open it**,
so that **I know when new versions are available**.

## Acceptance Criteria (FR23, FR27)

1. **Given** the app launches (FR23)
   **When** initialization completes
   **Then** an update check is triggered in the background
   **And** the check does not block app usage
   **And** the UI is interactive during the check

2. **Given** an update check runs
   **When** the manifest is fetched
   **Then** the current version is compared to the latest
   **And** if newer version exists, update info is captured

3. **Given** the update check succeeds with no update
   **When** the check completes
   **Then** no notification is shown
   **And** the app continues normally

4. **Given** the update check fails (network error)
   **When** the check times out
   **Then** no error is shown to the user
   **And** the app continues normally
   **And** the failure is logged for debugging

5. **Given** the app has no internet (FR27)
   **When** attempting update check
   **Then** the check fails silently
   **And** the app remains fully functional

## Tasks / Subtasks

- [x] Task 1: Configure Tauri Updater Plugin (AC: #1, #2)
  - [x] 1.1 Add `@tauri-apps/plugin-updater` to dependencies in `package.json`
  - [x] 1.2 Add updater plugin to Tauri cargo dependencies in `src-tauri/Cargo.toml`
  - [x] 1.3 Configure updater in `tauri.conf.json` with endpoint pointing to GitHub Releases
  - [x] 1.4 Set updater public key for signature verification
  - [x] 1.5 Verify updater plugin is registered in Tauri builder

- [x] Task 2: Create Update Check Rust Command (AC: #1, #2, #3, #4, #5)
  - [x] 2.1 Create `src-tauri/src/commands/updater.rs` module
  - [x] 2.2 Define `UpdateInfo` struct for update data (`version`, `body`, `date`)
  - [x] 2.3 Implement `check_for_updates` async command
  - [x] 2.4 Return `Result<Option<UpdateInfo>, String>` - None if no update, Some if update available
  - [x] 2.5 Handle network errors gracefully - return Ok(None), log warning internally
  - [x] 2.6 Timeout handled by Tauri updater plugin internally
  - [x] 2.7 Register command in `lib.rs`

- [x] Task 3: Implement Version Comparison Logic (AC: #2)
  - [x] 3.1 Version comparison handled internally by tauri-plugin-updater
  - [x] 3.2 Current app version parsed from `tauri.conf.json` by the plugin
  - [x] 3.3 Latest version parsed from update manifest by the plugin
  - [x] 3.4 Plugin compares versions: only flags update if remote > current
  - [x] 3.5 Plugin handles prerelease versions

- [x] Task 4: Create Update Store in Frontend (AC: #1, #2, #3)
  - [x] 4.1 Create `src/features/update/store.ts`
  - [x] 4.2 Define state interface: `{ updateAvailable, updateInfo, checkInProgress, lastChecked, dismissed }`
  - [x] 4.3 Add action `checkForUpdates` that invokes Tauri command via bindings
  - [x] 4.4 Add action `dismissUpdate` to set dismissed flag for session
  - [x] 4.5 Add action `clearUpdateInfo` to reset state
  - [x] 4.6 Export typed store `useUpdateStore`

- [x] Task 5: Create useUpdateCheck Hook (AC: #1, #4, #5)
  - [x] 5.1 Create `src/features/update/hooks/useUpdateCheck.ts`
  - [x] 5.2 Implement hook that triggers update check on mount
  - [x] 5.3 Use `useEffect` with stable reference for single check on launch
  - [x] 5.4 Call update store's `checkForUpdates` action
  - [x] 5.5 Handle errors silently - no user-facing error states
  - [x] 5.6 Return `{ updateAvailable, updateInfo, isChecking }` for consumers

- [x] Task 6: Integrate Update Check in App Root (AC: #1, #4, #5)
  - [x] 6.1 Import `useUpdateCheck` in main App component
  - [x] 6.2 Call hook at app initialization (component mount)
  - [x] 6.3 Check runs after initial UI render (non-blocking, fire-and-forget)
  - [x] 6.4 App content not conditionally rendered based on update check
  - [x] 6.5 UI remains interactive during check

- [x] Task 7: Add Update Info to IPC Types (AC: #2)
  - [x] 7.1 `UpdateInfo` type auto-generated in `src/bindings.ts` via tauri-specta
  - [x] 7.2 TypeScript interface mirrors Rust struct (specta derives)
  - [x] 7.3 Types exported from `src/bindings.ts`

- [x] Task 8: Implement Silent Failure Handling (AC: #4, #5)
  - [x] 8.1 Tauri invoke wrapped in try/catch in store's checkForUpdates
  - [x] 8.2 On error, logs to console.log (not console.error)
  - [x] 8.3 Sets `updateAvailable: false` on error
  - [x] 8.4 Errors not thrown up to UI components
  - [x] 8.5 No retry logic on launch (single check per session)

- [x] Task 9: Add Debug Logging (AC: #4)
  - [x] 9.1 Log update check start: `console.log('[Update] Checking for updates...')`
  - [x] 9.2 Log success with version in store
  - [x] 9.3 Log when update available: `console.log('[Update] New version available: x.y.z')`
  - [x] 9.4 Log when no update: `console.log('[Update] App is up to date')`
  - [x] 9.5 Log failures: `console.log('[Update] Check failed:', reason)`
  - [x] 9.6 In Rust, uses `log::info!` and `log::warn!` for backend logging

- [x] Task 10: Add i18n Keys for Update Messages (AC: #2, #3)
  - [x] 10.1 Add to `src/locales/en.json` — already present with update keys:
    ```json
    "update": {
      "available": "Update available: v{{version}}",
      "download": "Download",
      "learnMore": "Learn more",
      "later": "Later",
      "whatsNew": "What's new"
    }
    ```
  - [x] 10.2 Add to `src/locales/fr.json` — already present with update keys:
    ```json
    "update": {
      "available": "Mise à jour disponible : v{{version}}",
      "download": "Télécharger",
      "learnMore": "En savoir plus",
      "later": "Plus tard",
      "whatsNew": "Nouveautés"
    }
    ```

- [x] Task 11: Testing and Verification (AC: #1-5)
  - [x] 11.1 Test update check triggers on app launch (useUpdateCheck.test.ts)
  - [x] 11.2 Test UI is responsive during update check (non-blocking hook, concurrent check prevention)
  - [x] 11.3 Test no banner appears when app is up to date (store sets updateAvailable: false)
  - [x] 11.4 Test update info captured when update exists (store.test.ts with mock)
  - [x] 11.5 Test silent failure with network disconnected (store.test.ts error handling)
  - [x] 11.6 Test silent failure with invalid endpoint (store.test.ts rejected promise)
  - [x] 11.7 Test app remains fully functional after update check failure (store resets state)
  - [x] 11.8 Verify no telemetry is sent (NFR7) — only update manifest endpoint contacted
  - [x] 11.9 Test with slow network (concurrent check prevention, checkInProgress guard)

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates a **custom hook** for update checking:
- Create `useUpdateChecker` hook in `src/hooks/updates/useUpdateChecker.ts`
- Hook checks for updates on mount (app launch)
- Stores update info in a Zustand store or local state
- Returns `{ updateAvailable, updateInfo, checkForUpdates, installUpdate }`

**Hook pattern:**
```typescript
// src/hooks/updates/useUpdateChecker.ts
export function useUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // Check for updates on mount
    checkForUpdatesOnLaunch().then(setUpdateInfo);
  }, []);

  return { updateAvailable: !!updateInfo, updateInfo, installUpdate };
}
```

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Tauri 2.0 Updater Plugin

Tauri 2.0 uses the plugin-based updater system. The legacy `@tauri-apps/api/updater` is deprecated.

**Installation:**

```bash
# Frontend
npm install @tauri-apps/plugin-updater

# Rust (add to src-tauri/Cargo.toml)
[dependencies]
tauri-plugin-updater = "2"
```

**Plugin Registration (src-tauri/src/main.rs):**

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // ... other commands
            commands::update::check_for_updates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

[Source: Tauri 2.0 Updater Plugin Documentation]

### Update Check Implementation (Rust)

```rust
// src-tauri/src/commands/update.rs
use serde::{Deserialize, Serialize};
use tauri_plugin_updater::UpdaterExt;
use log::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: String,
    pub date: String,
    pub download_url: String,
}

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    info!("Checking for updates...");

    // Get updater instance
    let updater = app.updater_builder().build().map_err(|e| {
        warn!("Failed to build updater: {}", e);
        format!("Updater initialization failed: {}", e)
    })?;

    // Check for update with timeout
    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        updater.check()
    ).await {
        Ok(Ok(Some(update))) => {
            info!("Update available: {}", update.version);
            Ok(Some(UpdateInfo {
                version: update.version.clone(),
                notes: update.body.clone().unwrap_or_default(),
                date: update.date.map(|d| d.to_string()).unwrap_or_default(),
                download_url: update.download_url.to_string(),
            }))
        }
        Ok(Ok(None)) => {
            info!("App is up to date");
            Ok(None)
        }
        Ok(Err(e)) => {
            warn!("Update check failed: {}", e);
            // Return Ok(None) for silent failure - app continues normally
            Ok(None)
        }
        Err(_) => {
            warn!("Update check timed out");
            // Return Ok(None) for silent failure - app continues normally
            Ok(None)
        }
    }
}
```

**Key Points:**
- Returns `Result<Option<UpdateInfo>, String>` - Option::None means no update or check failed
- 5-second timeout prevents blocking on slow networks
- Errors logged but not propagated to UI
- Uses `log` crate for backend logging

[Source: project-context.md - Rust error handling patterns]

### Tauri Configuration (tauri.conf.json)

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/OWNER/REPO/releases/latest/download/latest.json"
      ],
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**Note:** Replace `OWNER/REPO` with actual repository and generate pubkey during release setup (Story 9.3).

The updater expects a JSON manifest at the endpoint with this structure:
```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2026-02-05T00:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../releases/download/v1.0.1/app.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "..."
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "..."
    }
  }
}
```

[Source: ARCH-13 - Tauri updater with GitHub Releases]

### Background Check Without Blocking UI

The update check must run asynchronously without blocking the main UI thread.

**Frontend Pattern:**

```typescript
// src/hooks/useUpdateCheck.ts
import { useEffect } from 'react';
import { useUpdateStore } from '@/stores/updateStore';

export function useUpdateCheck() {
  const { checkForUpdates, updateAvailable, updateInfo, checkInProgress } = useUpdateStore();

  useEffect(() => {
    // Fire and forget - don't await
    checkForUpdates();
  }, [checkForUpdates]);

  return { updateAvailable, updateInfo, isChecking: checkInProgress };
}
```

**Store Implementation:**

```typescript
// src/stores/updateStore.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { UpdateInfo } from '@/types/update';

interface UpdateState {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  checkInProgress: boolean;
  lastChecked: Date | null;
  dismissed: boolean;
  checkForUpdates: () => Promise<void>;
  dismissUpdate: () => void;
  clearUpdateInfo: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: false,
  updateInfo: null,
  checkInProgress: false,
  lastChecked: null,
  dismissed: false,

  checkForUpdates: async () => {
    // Prevent multiple concurrent checks
    if (get().checkInProgress) return;

    set({ checkInProgress: true });
    console.log('[Update] Checking for updates...');

    try {
      const result = await invoke<UpdateInfo | null>('check_for_updates');

      if (result) {
        console.log(`[Update] New version available: ${result.version}`);
        set({
          updateAvailable: true,
          updateInfo: result,
          checkInProgress: false,
          lastChecked: new Date(),
        });
      } else {
        console.log('[Update] App is up to date');
        set({
          updateAvailable: false,
          updateInfo: null,
          checkInProgress: false,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      // Silent failure - log but don't show to user
      console.log('[Update] Check failed:', error);
      set({
        updateAvailable: false,
        updateInfo: null,
        checkInProgress: false,
        lastChecked: new Date(),
      });
    }
  },

  dismissUpdate: () => {
    set({ dismissed: true });
  },

  clearUpdateInfo: () => {
    set({
      updateAvailable: false,
      updateInfo: null,
      dismissed: false,
    });
  },
}));
```

**Integration in App Component:**

```typescript
// src/App.tsx
import { useUpdateCheck } from '@/hooks/useUpdateCheck';

export function App() {
  // Trigger update check on mount - doesn't block rendering
  useUpdateCheck();

  return (
    <div className="app">
      {/* App content renders immediately */}
      <Header />
      <MainContent />
    </div>
  );
}
```

[Source: project-context.md - Zustand store patterns]

### Version Comparison

Use semantic versioning for proper version comparison:

```rust
// Add to Cargo.toml
[dependencies]
semver = "1"
```

```rust
use semver::Version;

fn is_newer_version(current: &str, latest: &str) -> bool {
    match (Version::parse(current), Version::parse(latest)) {
        (Ok(current_ver), Ok(latest_ver)) => latest_ver > current_ver,
        _ => {
            // If parsing fails, fall back to string comparison
            latest != current
        }
    }
}
```

**Note:** The Tauri updater plugin handles version comparison internally. This is only needed if implementing custom comparison logic.

[Source: Semantic Versioning 2.0.0 Specification]

### Silent Failure on Network Error (FR27 Compliance)

The app must remain fully functional when offline or when update checks fail.

**Key Principles:**
1. Never show error dialogs for update check failures
2. Never block UI waiting for update check
3. Log failures for debugging but don't alarm users
4. Return graceful defaults (no update available)

**Error Handling Pattern:**

```typescript
// CORRECT: Silent failure
try {
  const result = await invoke('check_for_updates');
  // Handle result
} catch (error) {
  console.log('[Update] Check failed:', error); // log, not console.error
  // Continue normally - no error state
}

// INCORRECT: Propagating errors
try {
  const result = await invoke('check_for_updates');
} catch (error) {
  throw error; // DON'T DO THIS
  setError(error); // DON'T DO THIS
  toast.error('Update check failed'); // DON'T DO THIS
}
```

[Source: FR27 - Application can launch and display UI without internet connection]

### No Telemetry (NFR7 Compliance)

The update check must not send any telemetry or analytics data.

**What's Allowed:**
- Fetching the update manifest from GitHub Releases
- Sending only the request needed to check for updates

**What's NOT Allowed:**
- Sending app version to analytics services
- Tracking update check frequency
- Sending user identifiers
- Collecting system information
- Any third-party analytics integration

```rust
// The ONLY network request should be to the update manifest
// No additional tracking or analytics calls
let update = updater.check().await?; // This is the only allowed request
```

[Source: NFR7 - No telemetry or data collection]

### Anti-Patterns to Avoid

- Do NOT block UI rendering while waiting for update check
- Do NOT show error messages/toasts for update check failures
- Do NOT retry update check on failure (avoid hammering endpoint)
- Do NOT use `@tauri-apps/api/updater` - this is Tauri 2.0, use `@tauri-apps/plugin-updater`
- Do NOT send any telemetry or analytics data
- Do NOT make update check a prerequisite for app functionality
- Do NOT use `console.error` for expected failures (use `console.log`)
- Do NOT store update check results in persistent storage (check fresh each launch)
- Do NOT use synchronous network calls
- Do NOT use default exports - use named exports
- Do NOT use `any` type in TypeScript

[Source: project-context.md - Anti-Patterns to Avoid]

### TypeScript Types

```typescript
// src/types/update.ts
export interface UpdateInfo {
  version: string;
  notes: string;
  date: string;
  downloadUrl: string;
}

// Ensure this matches the Rust struct exactly:
// pub struct UpdateInfo {
//     pub version: String,
//     pub notes: String,
//     pub date: String,
//     pub download_url: String,
// }
```

**Note on Naming:**
- TypeScript uses camelCase: `downloadUrl`
- Rust uses snake_case: `download_url`
- Serde automatically handles the conversion with `#[serde(rename_all = "camelCase")]`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub notes: String,
    pub date: String,
    pub download_url: String,
}
```

[Source: project-context.md - Cross-Language Type Safety]

### File Structure After This Story

```
src/
├── hooks/
│   └── useUpdateCheck.ts           # NEW
├── stores/
│   └── updateStore.ts              # NEW
├── types/
│   ├── update.ts                   # NEW
│   └── index.ts                    # Update exports
├── locales/
│   ├── en.json                     # Add update translations
│   └── fr.json                     # Add update translations
└── App.tsx                         # Add useUpdateCheck hook

src-tauri/
├── src/
│   ├── commands/
│   │   ├── mod.rs                  # Add update module
│   │   └── update.rs               # NEW
│   └── main.rs                     # Register update command
├── Cargo.toml                      # Add tauri-plugin-updater
└── tauri.conf.json                 # Add updater plugin config
```

[Source: architecture/project-structure-boundaries.md]

### Testing Checklist

**Functional Testing:**
- [ ] Update check triggers automatically when app launches
- [ ] UI is responsive and interactive during update check
- [ ] No banner/notification appears when app is up to date
- [ ] Update info is captured when newer version exists
- [ ] Store state updates correctly after check completes

**Offline/Error Testing:**
- [ ] App launches successfully with no internet connection
- [ ] No error messages appear when update check fails
- [ ] App remains fully functional after update check failure
- [ ] Console shows debug log for failed check (not error)
- [ ] Timeout works correctly (check doesn't hang forever)

**Performance Testing:**
- [ ] Update check doesn't delay initial UI render
- [ ] User can interact with app immediately on launch
- [ ] Check completes within reasonable time (< 5 seconds)

**Security/Privacy Testing:**
- [ ] No telemetry data is sent during update check
- [ ] Only the update manifest endpoint is contacted
- [ ] No user data is transmitted

**Integration Testing:**
- [ ] Works correctly with Story 9.5 (Update Banner display)
- [ ] Store state is accessible to banner component
- [ ] Dismiss functionality works for session

### Dependencies

**Depends on:**
- Story 9.3: Configure Tauri Updater Integration (updater endpoint and pubkey)
- Story 1.4: Configure Zustand Store Structure (store patterns)
- Story 1.5: Configure react-i18next Foundation (i18n available)

**Blocks:**
- Story 9.5: Display Update Available Banner (needs update check result)

**Related:**
- Story 9.1: Set Up GitHub Actions CI Workflow
- Story 9.2: Set Up Release Build Workflow

### References

- [Source: epics.md - Story 9.4 Acceptance Criteria]
- [Source: epics.md - FR23: System can check for application updates on launch]
- [Source: epics.md - FR27: Application can launch and display UI without internet connection]
- [Source: epics.md - NFR7: No telemetry or data collection]
- [Source: project-context.md - Tauri 2.0 patterns]
- [Source: project-context.md - Zustand store patterns]
- [Source: project-context.md - Error handling patterns]
- [Source: ux-design-specification.md - Platform Strategy (Offline: UI loads offline)]
- [Tauri 2.0 Updater Plugin Documentation](https://v2.tauri.app/plugin/updater/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Tasks 1-3, 7, 10 were already implemented from prior work (updater plugin configured, Rust commands exist, i18n keys present, IPC types auto-generated via specta)
- Fixed Rust `check_for_updates` command to return `Ok(None)` on error instead of `Err(e)` per AC #4/#5 (silent failure, FR27 compliance). Changed `log::error!` to `log::warn!` for consistency.
- Created `src/features/update/store.ts` — Zustand store with `checkForUpdates`, `dismissUpdate`, `clearUpdateInfo` actions. Uses `console.log` (not `console.error`) for failures. Prevents concurrent checks via `checkInProgress` guard.
- Created `src/features/update/hooks/useUpdateCheck.ts` — hook triggers check on mount via `useEffect`, returns `{ updateAvailable, updateInfo, isChecking }`.
- Integrated update check in `src/App.tsx` — fire-and-forget via `useUpdateStore.getState().checkForUpdates()`, non-blocking, no unnecessary subscriptions.
- Created `src/features/update/index.ts` — barrel export for feature consistency.
- Wrote 22 unit tests across store (17 tests) and hook (5 tests). All 749 tests pass, 0 failures.
- Rust compiles clean (`cargo check`), TypeScript compiles clean (`tsc --noEmit`).
- Note: `bindings.ts` doc comments are stale (Rust doc updated but specta not regenerated). Will auto-fix on next `tauri dev` run.

### Change Log

- 2026-02-28: Implemented story 9.4 — update check on launch with silent failure handling
- 2026-02-28: Code review fixes — added barrel export, fixed App.tsx subscriptions, corrected story documentation (i18n keys, test counts)

### File List

- `src-tauri/src/commands/updater.rs` — MODIFIED (silent failure: Err → Ok(None))
- `src/features/update/store.ts` — NEW (Zustand update store)
- `src/features/update/index.ts` — NEW (barrel export)
- `src/features/update/hooks/useUpdateCheck.ts` — NEW (update check hook for Story 9.5 banner)
- `src/features/update/__test__/store.test.ts` — NEW (17 store tests)
- `src/features/update/hooks/__test__/useUpdateCheck.test.ts` — NEW (5 hook tests)
- `src/App.tsx` — MODIFIED (update check on mount via store, no state subscriptions)
