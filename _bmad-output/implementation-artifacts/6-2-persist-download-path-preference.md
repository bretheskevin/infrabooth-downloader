# Story 6.2: Persist Download Path Preference

Status: ready-for-dev

## Story

As a **user**,
I want **the app to remember my download folder**,
so that **I don't have to set it every time I open the application**.

## Acceptance Criteria

1. **Given** the user has selected a download folder (from Story 6.1)
   **When** the app closes
   **Then** the download path is persisted to settings storage
   **And** the persistence uses Zustand persist middleware

2. **Given** the app launches
   **When** loading settings
   **Then** the previously saved download path is restored
   **And** the settings store reflects the saved path
   **And** the UI shows the correct path immediately (no flash of default)

3. **Given** no download path has been set (first launch)
   **When** the app launches for the first time
   **Then** the default is the system Downloads folder (detected via Tauri)
   **And** this default is used until the user changes it
   **And** the default path is persisted for future sessions

4. **Given** a saved path no longer exists (e.g., external drive removed, folder deleted)
   **When** attempting to use it
   **Then** the app detects the invalid path
   **And** prompts the user to select a new location
   **And** does not crash or fail silently
   **And** falls back to system Downloads folder gracefully

5. **Given** settings persistence is configured
   **When** the persist middleware hydrates state
   **Then** the `onRehydrateStorage` callback validates the path
   **And** invalid paths trigger the fallback mechanism

## Tasks / Subtasks

- [ ] Task 1: Create Rust command for default downloads folder detection (AC: #3)
  - [ ] 1.1 Create or update `src-tauri/src/commands/settings.rs`
  - [ ] 1.2 Implement `get_default_download_path` command using Tauri path API
  - [ ] 1.3 Return `Result<String, String>` with the system downloads path
  - [ ] 1.4 Register command in Tauri handler

- [ ] Task 2: Create Rust command for path validation (AC: #4, #5)
  - [ ] 2.1 Implement `validate_download_path` command in `settings.rs`
  - [ ] 2.2 Check if path exists using `std::path::Path::exists()`
  - [ ] 2.3 Check if path is a directory using `is_dir()`
  - [ ] 2.4 Return `Result<bool, String>` indicating validity

- [ ] Task 3: Configure Zustand persist middleware for settingsStore (AC: #1, #2)
  - [ ] 3.1 Import `persist` middleware from `zustand/middleware`
  - [ ] 3.2 Wrap settingsStore creation with `persist()`
  - [ ] 3.3 Configure storage name: `'sc-downloader-settings'`
  - [ ] 3.4 Add `onRehydrateStorage` callback for path validation

- [ ] Task 4: Implement path validation on hydration (AC: #4, #5)
  - [ ] 4.1 Create async validation function in settingsStore
  - [ ] 4.2 Call Tauri `validate_download_path` command on hydration
  - [ ] 4.3 If invalid, fetch default path and update store
  - [ ] 4.4 Show user notification about path reset (if path was invalid)

- [ ] Task 5: Implement first-launch default path detection (AC: #3)
  - [ ] 5.1 Create initialization hook `useInitializeSettings`
  - [ ] 5.2 Detect if downloadPath is empty (first launch)
  - [ ] 5.3 Call `get_default_download_path` from Tauri
  - [ ] 5.4 Set and persist the default path

- [ ] Task 6: Create TypeScript wrapper functions (AC: #1-5)
  - [ ] 6.1 Add `getDefaultDownloadPath` to `src/lib/tauri.ts`
  - [ ] 6.2 Add `validateDownloadPath` to `src/lib/tauri.ts`
  - [ ] 6.3 Handle invoke errors gracefully with fallbacks

- [ ] Task 7: Handle edge cases (AC: #4)
  - [ ] 7.1 Handle network drive disconnection (Windows)
  - [ ] 7.2 Handle external drive removal (macOS)
  - [ ] 7.3 Handle permission changes after path was saved
  - [ ] 7.4 Log path validation failures for debugging

- [ ] Task 8: Add translations for path validation messages (AC: #4)
  - [ ] 8.1 Add English translations to `en.json`:
    ```json
    "settings": {
      "pathInvalid": "Your saved download folder is no longer available.",
      "pathReset": "Download location has been reset to the default folder.",
      "defaultFolder": "Downloads"
    }
    ```
  - [ ] 8.2 Add French translations to `fr.json`:
    ```json
    "settings": {
      "pathInvalid": "Votre dossier de telechargement enregistre n'est plus disponible.",
      "pathReset": "L'emplacement de telechargement a ete reinitialise au dossier par defaut.",
      "defaultFolder": "Telechargements"
    }
    ```

- [ ] Task 9: Testing and Verification (AC: #1-5)
  - [ ] 9.1 Test persistence across app restarts
  - [ ] 9.2 Test first-launch default detection
  - [ ] 9.3 Test invalid path fallback (delete saved folder, relaunch)
  - [ ] 9.4 Test external drive removal scenario
  - [ ] 9.5 Verify no flash of incorrect path on launch

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story configures **Zustand store persistence**. Following the custom hooks architecture:
- Components access `settingsStore` via hooks (e.g., `useFolderSelection` from Story 6.1)
- Store persistence is transparent to components
- Hooks wrap store selectors — components don't directly access store

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Zustand Persist Middleware Configuration

**From Story 1.4 and Architecture:**

The settings store should use Zustand's persist middleware for automatic localStorage persistence:

```typescript
// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  isHydrated: boolean;
  // Actions
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      downloadPath: '',
      language: 'en',
      isHydrated: false,
      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: 'sc-downloader-settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Validate path after hydration
        if (state) {
          state.setHydrated(true);
          validateAndFixPath(state.downloadPath, state.setDownloadPath);
        }
      },
    }
  )
);
```

**Key considerations:**
- Use `isHydrated` flag to prevent UI flash before persistence loads
- The `onRehydrateStorage` callback runs after state is loaded from storage
- Path validation should be async but not block initial render

[Source: Story 1.4, Zustand persist middleware documentation]

### Default Downloads Folder Detection via Tauri

**Tauri 2.0 Path API:**

```rust
// src-tauri/src/commands/settings.rs
use tauri::Manager;

#[tauri::command]
pub fn get_default_download_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Could not determine downloads folder: {}", e))
}
```

**Important Tauri 2.0 changes:**
- Path APIs moved from `tauri::api::path` to `tauri::Manager` trait
- Must pass `AppHandle` to access path resolver
- Returns `Result` type, not `Option`

**Frontend usage:**

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export async function getDefaultDownloadPath(): Promise<string> {
  try {
    return await invoke<string>('get_default_download_path');
  } catch (error) {
    console.error('Failed to get default download path:', error);
    // Fallback for edge cases
    return '';
  }
}
```

[Source: Tauri 2.0 Path API documentation]

### Invalid Path Handling Strategy

**Detection approach:**

```rust
// src-tauri/src/commands/settings.rs
use std::path::Path;

#[tauri::command]
pub fn validate_download_path(path: String) -> Result<bool, String> {
    let dir_path = Path::new(&path);

    // Check existence
    if !dir_path.exists() {
        return Ok(false);
    }

    // Check it's a directory (not a file)
    if !dir_path.is_dir() {
        return Ok(false);
    }

    // Optionally check read access (write check is in Story 6.1)
    Ok(true)
}
```

**Frontend validation flow:**

```typescript
// Async validation after hydration
async function validateAndFixPath(
  currentPath: string,
  setDownloadPath: (path: string) => void
): Promise<void> {
  if (!currentPath) {
    // First launch - get default
    const defaultPath = await getDefaultDownloadPath();
    if (defaultPath) {
      setDownloadPath(defaultPath);
    }
    return;
  }

  // Validate existing path
  const isValid = await validateDownloadPath(currentPath);
  if (!isValid) {
    // Path no longer valid - reset to default
    const defaultPath = await getDefaultDownloadPath();
    setDownloadPath(defaultPath);

    // Notify user (via toast or notification)
    showPathResetNotification();
  }
}
```

[Source: Architecture error handling patterns]

### Hydration State Management

**Preventing UI flash:**

The `isHydrated` flag prevents showing stale or default values before persistence loads:

```typescript
// In a component
function DownloadSettings() {
  const { downloadPath, isHydrated } = useSettingsStore();

  if (!isHydrated) {
    // Show skeleton or loading state
    return <PathSkeleton />;
  }

  return <div>Download path: {downloadPath}</div>;
}
```

**Alternative: useHydration hook pattern:**

```typescript
// src/hooks/useHydration.ts
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist hydrates synchronously on first render
    // but we can't know when until the store updates
    const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Check if already hydrated
    if (useSettingsStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsubscribe;
  }, []);

  return hydrated;
}
```

[Source: Zustand persist middleware documentation]

### Settings Store with Full Implementation

```typescript
// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  _hasHydrated: boolean;

  // Actions
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
  _setHasHydrated: (state: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      downloadPath: '',
      language: 'en',
      _hasHydrated: false,

      setDownloadPath: (path) => set({ downloadPath: path }),
      setLanguage: (lang) => set({ language: lang }),
      _setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'sc-downloader-settings',
      storage: createJSONStorage(() => localStorage),

      // Only persist these fields (not _hasHydrated)
      partialState: (state) => ({
        downloadPath: state.downloadPath,
        language: state.language,
      }),

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Settings hydration error:', error);
        }
        // Mark as hydrated regardless of error
        state?._setHasHydrated(true);
      },
    }
  )
);

// Selector for hydration status
export const useSettingsHydrated = () =>
  useSettingsStore((state) => state._hasHydrated);
```

[Source: Story 1.4, Zustand patterns]

### Initialization Hook for First Launch

```typescript
// src/hooks/useInitializeSettings.ts
import { useEffect } from 'react';
import { useSettingsStore, useSettingsHydrated } from '@/stores/settingsStore';
import { getDefaultDownloadPath, validateDownloadPath } from '@/lib/tauri';

export function useInitializeSettings() {
  const { downloadPath, setDownloadPath } = useSettingsStore();
  const isHydrated = useSettingsHydrated();

  useEffect(() => {
    if (!isHydrated) return;

    const initializePath = async () => {
      // First launch: no path set
      if (!downloadPath) {
        const defaultPath = await getDefaultDownloadPath();
        if (defaultPath) {
          setDownloadPath(defaultPath);
        }
        return;
      }

      // Subsequent launch: validate saved path
      const isValid = await validateDownloadPath(downloadPath);
      if (!isValid) {
        console.warn('Saved download path is invalid, resetting to default');
        const defaultPath = await getDefaultDownloadPath();
        setDownloadPath(defaultPath);
        // TODO: Show notification to user (Story 8.1 settings panel)
      }
    };

    initializePath();
  }, [isHydrated, downloadPath, setDownloadPath]);
}
```

**Usage in App.tsx:**

```typescript
function App() {
  useInitializeSettings();

  return (
    // ... app content
  );
}
```

[Source: Architecture hooks pattern]

### File Structure After This Story

```
src/
├── hooks/
│   └── useInitializeSettings.ts  # NEW - First launch & validation
├── lib/
│   └── tauri.ts                  # UPDATE - Add path utilities
├── stores/
│   └── settingsStore.ts          # UPDATE - Add persist middleware
└── locales/
    ├── en.json                   # UPDATE - Add path messages
    └── fr.json                   # UPDATE - Add path messages

src-tauri/
└── src/
    └── commands/
        └── settings.rs           # UPDATE - Add path commands
```

[Source: architecture/project-structure-boundaries.md]

### Platform-Specific Considerations

**macOS:**
- Default downloads: `/Users/{username}/Downloads`
- External drives: `/Volumes/{drive_name}/...`
- Path validation handles drive unmounting gracefully

**Windows:**
- Default downloads: `C:\Users\{username}\Downloads`
- Network drives: `\\server\share\...` or mapped `Z:\...`
- Path validation handles network disconnection

**Cross-platform path handling:**

```rust
// Rust handles path normalization
use std::path::PathBuf;

#[tauri::command]
pub fn validate_download_path(path: String) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);

    // canonicalize() resolves symlinks and normalizes path
    match path_buf.canonicalize() {
        Ok(canonical) => Ok(canonical.is_dir()),
        Err(_) => Ok(false), // Path doesn't exist or isn't accessible
    }
}
```

[Source: Rust std::path documentation]

### Anti-Patterns to Avoid

1. **DON'T** validate path synchronously on every render:
   ```typescript
   // WRONG - blocks render
   const isValid = validatePathSync(downloadPath);

   // RIGHT - async validation after hydration
   useEffect(() => { validatePathAsync(); }, [isHydrated]);
   ```

2. **DON'T** show error for empty path on first launch:
   ```typescript
   // WRONG - confuses users
   if (!downloadPath) showError("No download path set!");

   // RIGHT - silently set default
   if (!downloadPath) setDownloadPath(await getDefaultDownloadPath());
   ```

3. **DON'T** persist hydration state:
   ```typescript
   // WRONG - persists runtime state
   persist({ downloadPath, language, isHydrated }, ...)

   // RIGHT - exclude runtime state
   partialState: (state) => ({ downloadPath: state.downloadPath, language: state.language })
   ```

4. **DON'T** use Tauri 1.x path APIs:
   ```typescript
   // WRONG - Tauri 1.x
   import { downloadDir } from '@tauri-apps/api/path';

   // RIGHT - Tauri 2.0 (use Rust command)
   await invoke('get_default_download_path');
   ```

5. **DON'T** hardcode fallback paths:
   ```typescript
   // WRONG - not cross-platform
   const fallback = '/Users/default/Downloads';

   // RIGHT - always use Tauri API
   const fallback = await getDefaultDownloadPath();
   ```

[Source: project-context.md - Anti-Patterns to Avoid]

### Testing Checklist

**Persistence Tests:**
- [ ] Path persists to localStorage after setting
- [ ] Path loads correctly on app restart
- [ ] Language preference persists alongside path
- [ ] Storage key is `sc-downloader-settings`

**First Launch Tests:**
- [ ] Empty path triggers default detection
- [ ] Default path is system Downloads folder
- [ ] Default path is persisted after detection
- [ ] No error shown on first launch

**Invalid Path Tests:**
- [ ] Deleted folder triggers reset to default
- [ ] External drive removal triggers reset
- [ ] Network drive disconnection handled (Windows)
- [ ] User notified when path is reset
- [ ] App doesn't crash on invalid path

**Hydration Tests:**
- [ ] No flash of empty/wrong path on launch
- [ ] `isHydrated` flag works correctly
- [ ] Components wait for hydration before rendering path
- [ ] Hydration completes within acceptable time (<100ms)

**Cross-Platform Tests:**
- [ ] macOS: default path detection works
- [ ] Windows: default path detection works
- [ ] macOS: external drive path handling
- [ ] Windows: network drive path handling

### Dependencies

**Depends on:**
- Story 1.4: Configure Zustand Store Structure (settingsStore base)
- Story 6.1: Implement Folder Selection Dialog (setDownloadPath action)

**Blocks:**
- Story 6.3: Generate Filenames from Metadata (needs valid download path)
- Story 6.4: Display Completion Panel (uses download path for "Open Folder")

### References

- [Source: epics.md - Story 6.2 Acceptance Criteria]
- [Source: epics.md - FR21: System can save downloaded files to user-specified location]
- [Source: epics.md - NFR10: Application state persists across unexpected termination]
- [Source: Story 1.4 - Zustand Store Structure]
- [Source: Story 6.1 - Folder Selection Dialog]
- [Source: project-context.md - Zustand Rules]
- [Source: project-context.md - Anti-Patterns to Avoid]
- [Source: architecture/project-structure-boundaries.md]
- [Tauri 2.0 Path API](https://v2.tauri.app/reference/rust/tauri/path/)
- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

