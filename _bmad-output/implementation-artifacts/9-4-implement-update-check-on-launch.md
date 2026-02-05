# Story 9.4: Implement Update Check on Launch

Status: ready-for-dev

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

- [ ] Task 1: Configure Tauri Updater Plugin (AC: #1, #2)
  - [ ] 1.1 Add `@tauri-apps/plugin-updater` to dependencies in `package.json`
  - [ ] 1.2 Add updater plugin to Tauri cargo dependencies in `src-tauri/Cargo.toml`
  - [ ] 1.3 Configure updater in `tauri.conf.json` with endpoint pointing to GitHub Releases
  - [ ] 1.4 Set updater public key for signature verification
  - [ ] 1.5 Verify updater plugin is registered in Tauri builder

- [ ] Task 2: Create Update Check Rust Command (AC: #1, #2, #3, #4, #5)
  - [ ] 2.1 Create `src-tauri/src/commands/update.rs` module
  - [ ] 2.2 Define `UpdateInfo` struct for update data (`version`, `notes`, `date`, `download_url`)
  - [ ] 2.3 Implement `check_for_updates` async command
  - [ ] 2.4 Return `Result<Option<UpdateInfo>, String>` - None if no update, Some if update available
  - [ ] 2.5 Handle network errors gracefully - return Ok(None), log error internally
  - [ ] 2.6 Set appropriate timeout for update check (5 seconds max)
  - [ ] 2.7 Register command in `main.rs`

- [ ] Task 3: Implement Version Comparison Logic (AC: #2)
  - [ ] 3.1 Use semantic versioning comparison (semver crate)
  - [ ] 3.2 Parse current app version from `tauri.conf.json`
  - [ ] 3.3 Parse latest version from update manifest
  - [ ] 3.4 Compare versions: only flag update if remote > current
  - [ ] 3.5 Handle prerelease versions appropriately (e.g., 1.0.0-beta < 1.0.0)

- [ ] Task 4: Create Update Store in Frontend (AC: #1, #2, #3)
  - [ ] 4.1 Create `src/stores/updateStore.ts`
  - [ ] 4.2 Define state interface: `{ updateAvailable: boolean, updateInfo: UpdateInfo | null, checkInProgress: boolean, lastChecked: Date | null }`
  - [ ] 4.3 Add action `checkForUpdates` that invokes Tauri command
  - [ ] 4.4 Add action `dismissUpdate` to clear update notification for session
  - [ ] 4.5 Add action `clearUpdateInfo` to reset state
  - [ ] 4.6 Export typed hook `useUpdateStore`

- [ ] Task 5: Create useUpdateCheck Hook (AC: #1, #4, #5)
  - [ ] 5.1 Create `src/hooks/useUpdateCheck.ts`
  - [ ] 5.2 Implement hook that triggers update check on mount
  - [ ] 5.3 Use `useEffect` with empty dependency array for single check on launch
  - [ ] 5.4 Call update store's `checkForUpdates` action
  - [ ] 5.5 Handle errors silently - no user-facing error states
  - [ ] 5.6 Return `{ updateAvailable, updateInfo, isChecking }` for consumers

- [ ] Task 6: Integrate Update Check in App Root (AC: #1, #4, #5)
  - [ ] 6.1 Import `useUpdateCheck` in main App component
  - [ ] 6.2 Call hook at app initialization (component mount)
  - [ ] 6.3 Ensure check runs after initial UI render (non-blocking)
  - [ ] 6.4 Do not conditionally render app content based on update check
  - [ ] 6.5 Verify UI remains interactive during check

- [ ] Task 7: Add Update Info to IPC Types (AC: #2)
  - [ ] 7.1 Add `UpdateInfo` interface to `src/types/update.ts`:
    ```typescript
    export interface UpdateInfo {
      version: string;
      notes: string;
      date: string;
      downloadUrl: string;
    }
    ```
  - [ ] 7.2 Ensure TypeScript interface mirrors Rust struct exactly
  - [ ] 7.3 Export types from `src/types/index.ts`

- [ ] Task 8: Implement Silent Failure Handling (AC: #4, #5)
  - [ ] 8.1 Wrap Tauri invoke in try/catch in frontend
  - [ ] 8.2 On error, log to console for debugging (not console.error to avoid alarms)
  - [ ] 8.3 Set `updateAvailable: false` on error
  - [ ] 8.4 Do not throw errors up to UI components
  - [ ] 8.5 Implement retry logic: no retries on launch (avoid hammering endpoint)

- [ ] Task 9: Add Debug Logging (AC: #4)
  - [ ] 9.1 Log update check start: `console.log('[Update] Checking for updates...')`
  - [ ] 9.2 Log success with version: `console.log('[Update] Latest version: x.y.z')`
  - [ ] 9.3 Log when update available: `console.log('[Update] New version available: x.y.z')`
  - [ ] 9.4 Log when no update: `console.log('[Update] App is up to date')`
  - [ ] 9.5 Log failures: `console.log('[Update] Check failed:', reason)`
  - [ ] 9.6 In Rust, use `log::info!` and `log::warn!` for backend logging

- [ ] Task 10: Add i18n Keys for Update Messages (AC: #2, #3)
  - [ ] 10.1 Add to `src/locales/en.json`:
    ```json
    "update": {
      "available": "Update available",
      "version": "Version {{version}}",
      "download": "Download",
      "dismiss": "Dismiss",
      "releaseNotes": "What's new",
      "upToDate": "You're up to date"
    }
    ```
  - [ ] 10.2 Add to `src/locales/fr.json`:
    ```json
    "update": {
      "available": "Mise a jour disponible",
      "version": "Version {{version}}",
      "download": "Telecharger",
      "dismiss": "Ignorer",
      "releaseNotes": "Nouveautes",
      "upToDate": "Vous etes a jour"
    }
    ```

- [ ] Task 11: Testing and Verification (AC: #1-5)
  - [ ] 11.1 Test update check triggers on app launch
  - [ ] 11.2 Test UI is responsive during update check
  - [ ] 11.3 Test no banner appears when app is up to date
  - [ ] 11.4 Test update info captured when update exists (mock endpoint)
  - [ ] 11.5 Test silent failure with network disconnected
  - [ ] 11.6 Test silent failure with invalid endpoint
  - [ ] 11.7 Test app remains fully functional after update check failure
  - [ ] 11.8 Verify no telemetry is sent (NFR7)
  - [ ] 11.9 Test with slow network (check doesn't block UI)

## Dev Notes

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List
