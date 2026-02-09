# Story 6.1: Implement Folder Selection Dialog

Status: ready-for-dev

## Story

As a **user**,
I want **to choose where my downloaded files are saved**,
so that **I can organize my music library my way**.

## Acceptance Criteria (FR20)

1. **Given** the user wants to change download location
   **When** they access the folder selection option
   **Then** a native OS file dialog opens (Tauri dialog API)
   **And** the dialog is a folder picker (not file picker)
   **And** the dialog starts at the current download path

2. **Given** the folder dialog is open
   **When** the user selects a folder
   **Then** the selected path is captured
   **And** the settings store is updated with the new path
   **And** the dialog closes and returns to the app

3. **Given** the folder dialog is open
   **When** the user cancels
   **Then** the previous download path is retained
   **And** no error is shown (user-initiated cancel)

4. **Given** a folder is selected
   **When** checking write permissions
   **Then** the app verifies it can write to the location
   **And** if not writable, an error message is shown
   **And** the user is prompted to select a different folder

5. **Given** the folder selection UI component
   **When** checking accessibility
   **Then** the component has proper aria labels
   **And** the component is keyboard navigable (Tab, Enter)
   **And** screen readers announce the current path and available action

## Tasks / Subtasks

- [ ] Task 1: Configure Tauri Dialog Plugin (AC: #1)
  - [ ] 1.1 Add `tauri-plugin-dialog` to Cargo.toml dependencies
  - [ ] 1.2 Register dialog plugin in `src-tauri/src/lib.rs`
  - [ ] 1.3 Add dialog permission in `tauri.conf.json` capabilities
  - [ ] 1.4 Verify plugin is available in frontend via `@tauri-apps/plugin-dialog`

- [ ] Task 2: Create Rust Command for Write Permission Check (AC: #4)
  - [ ] 2.1 Create `check_write_permission` command in `src-tauri/src/commands/settings.rs`
  - [ ] 2.2 Implement permission check by attempting to create/delete temp file
  - [ ] 2.3 Return `Result<bool, AppError>` with appropriate error handling
  - [ ] 2.4 Add command to Tauri handler registration

- [ ] Task 3: Create FolderPicker Component (AC: #1, #2, #3, #5)
  - [ ] 3.1 Create `src/components/features/settings/FolderPicker.tsx`
  - [ ] 3.2 Display current download path (from settingsStore)
  - [ ] 3.3 Add "Browse" button that triggers folder dialog
  - [ ] 3.4 Handle folder selection and update settingsStore
  - [ ] 3.5 Handle user cancellation gracefully (no action)
  - [ ] 3.6 Add proper ARIA labels and keyboard support

- [ ] Task 4: Implement Folder Dialog Logic (AC: #1, #2, #3)
  - [ ] 4.1 Create `src/lib/folderDialog.ts` utility
  - [ ] 4.2 Import and use `open` from `@tauri-apps/plugin-dialog`
  - [ ] 4.3 Configure dialog options: `directory: true`, `defaultPath`
  - [ ] 4.4 Handle dialog result (path or null for cancel)

- [ ] Task 5: Implement Write Permission Validation (AC: #4)
  - [ ] 5.1 Create `checkWritePermission` function in `src/lib/tauri.ts`
  - [ ] 5.2 Call Rust command to verify write access
  - [ ] 5.3 Display error toast/message if permission denied
  - [ ] 5.4 Prompt user to select different folder on failure

- [ ] Task 6: Integrate with Settings Store (AC: #2)
  - [ ] 6.1 Use `useSettingsStore` hook in FolderPicker
  - [ ] 6.2 Call `setDownloadPath` action on successful selection
  - [ ] 6.3 Ensure persistence middleware saves the path
  - [ ] 6.4 Verify path persists across app restarts

- [ ] Task 7: Add Translations (AC: #5)
  - [ ] 7.1 Add English translations to `src/locales/en.json`:
    ```json
    "settings": {
      "downloadLocation": "Download Location",
      "browse": "Browse",
      "currentPath": "Current: {{path}}",
      "permissionDenied": "Cannot write to this folder. Please select a different location.",
      "selectFolder": "Select download folder"
    }
    ```
  - [ ] 7.2 Add French translations to `src/locales/fr.json`:
    ```json
    "settings": {
      "downloadLocation": "Emplacement de telechargement",
      "browse": "Parcourir",
      "currentPath": "Actuel: {{path}}",
      "permissionDenied": "Impossible d'ecrire dans ce dossier. Veuillez selectionner un autre emplacement.",
      "selectFolder": "Selectionner le dossier de telechargement"
    }
    ```

- [ ] Task 8: Testing and Verification (AC: #1-5)
  - [ ] 8.1 Test folder selection on macOS
  - [ ] 8.2 Test folder selection on Windows
  - [ ] 8.3 Test cancellation behavior
  - [ ] 8.4 Test write permission validation with read-only folder
  - [ ] 8.5 Test keyboard navigation and screen reader announcements

## Dev Notes

### Frontend Architecture (Post-Refactor)

**Prerequisite:** Story 0.1 (Refactor Download Hooks) must be completed first.

This story creates a **custom hook** for folder selection:
- Create `useFolderSelection` hook in `src/hooks/settings/useFolderSelection.ts`
- Hook wraps Tauri dialog API and updates settingsStore
- Returns `{ downloadPath, selectFolder, isSelecting }`

**Hook pattern:**
```typescript
// src/hooks/settings/useFolderSelection.ts
export function useFolderSelection() {
  const downloadPath = useSettingsStore(state => state.downloadPath);
  const setDownloadPath = useSettingsStore(state => state.setDownloadPath);

  const selectFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) setDownloadPath(selected);
  };

  return { downloadPath, selectFolder };
}
```

[Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Custom Hook Patterns]

### Tauri 2.0 Dialog Plugin Setup

**Cargo.toml dependencies:**
```toml
[dependencies]
tauri-plugin-dialog = "2"
```

**Plugin registration in lib.rs:**
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // ... other plugins
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Capability permissions (src-tauri/capabilities/default.json):**
```json
{
  "permissions": [
    "dialog:allow-open",
    "dialog:allow-save"
  ]
}
```

[Source: Tauri 2.0 Dialog Plugin Documentation]

### Frontend Dialog API Usage

```typescript
import { open } from '@tauri-apps/plugin-dialog';

async function selectDownloadFolder(currentPath: string): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: currentPath,
    title: 'Select Download Folder',
  });

  // Returns string (path) or null (cancelled)
  return selected as string | null;
}
```

**Important:** In Tauri 2.0, the dialog API is a plugin, not part of `@tauri-apps/api`. Install with:
```bash
npm install @tauri-apps/plugin-dialog
```

[Source: Tauri 2.0 Migration - Dialog is now a plugin]

### Settings Store Integration

The settings store from Story 1.4 already has the structure:

```typescript
interface SettingsState {
  downloadPath: string;
  language: 'en' | 'fr';
  setDownloadPath: (path: string) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
}
```

Use the existing `setDownloadPath` action:

```typescript
import { useSettingsStore } from '@/stores/settingsStore';

function FolderPicker() {
  const { downloadPath, setDownloadPath } = useSettingsStore();

  const handleBrowse = async () => {
    const selected = await selectDownloadFolder(downloadPath);
    if (selected) {
      const hasPermission = await checkWritePermission(selected);
      if (hasPermission) {
        setDownloadPath(selected);
      } else {
        // Show error message
      }
    }
  };
}
```

[Source: Story 1.4 - Configure Zustand Store Structure]

### Write Permission Check (Rust)

```rust
// src-tauri/src/commands/settings.rs
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[tauri::command]
pub async fn check_write_permission(path: String) -> Result<bool, String> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Try to create and delete a temp file
    let test_file = dir_path.join(format!(".sc-downloader-test-{}", Uuid::new_v4()));

    match fs::write(&test_file, "test") {
        Ok(_) => {
            let _ = fs::remove_file(&test_file);
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}
```

**Add uuid to Cargo.toml:**
```toml
[dependencies]
uuid = { version = "1", features = ["v4"] }
```

[Source: Architecture - Rust Command Pattern]

### Component Structure

```typescript
// src/components/features/settings/FolderPicker.tsx
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export function FolderPicker() {
  const { t } = useTranslation();
  const { downloadPath, setDownloadPath } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        defaultPath: downloadPath || undefined,
        title: t('settings.selectFolder'),
      });

      if (selected && typeof selected === 'string') {
        const hasPermission = await invoke<boolean>('check_write_permission', {
          path: selected
        });

        if (hasPermission) {
          setDownloadPath(selected);
          setError(null);
        } else {
          setError(t('settings.permissionDenied'));
        }
      }
      // If selected is null, user cancelled - do nothing
    } catch (err) {
      console.error('Folder selection error:', err);
      setError(t('settings.permissionDenied'));
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {t('settings.downloadLocation')}
      </label>
      <div className="flex items-center gap-2">
        <span
          className="flex-1 truncate text-sm text-muted-foreground"
          aria-label={t('settings.currentPath', { path: downloadPath })}
        >
          {downloadPath || t('settings.notSet')}
        </span>
        <Button
          variant="outline"
          onClick={handleBrowse}
          aria-label={t('settings.selectFolder')}
        >
          {t('settings.browse')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

[Source: project-structure-boundaries.md - Component Organization]

### Default Download Path

The default download path should be the system Downloads folder. This will be fetched from Tauri on app initialization:

```rust
// src-tauri/src/commands/settings.rs
use tauri::api::path::download_dir;

#[tauri::command]
pub fn get_default_download_path() -> Result<String, String> {
    download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine downloads folder".to_string())
}
```

**Note:** In Tauri 2.0, path APIs are in `tauri::path`:
```rust
use tauri::Manager;

#[tauri::command]
pub fn get_default_download_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}
```

[Source: Tauri 2.0 Path API Migration]

### File Structure After This Story

```
src/
├── components/
│   └── features/
│       └── settings/
│           └── FolderPicker.tsx    # NEW
├── lib/
│   └── tauri.ts                    # Add checkWritePermission wrapper
├── locales/
│   ├── en.json                     # Add settings translations
│   └── fr.json                     # Add settings translations
└── stores/
    └── settingsStore.ts            # Already exists (Story 1.4)

src-tauri/
└── src/
    └── commands/
        └── settings.rs             # Add check_write_permission, get_default_download_path
```

[Source: architecture/project-structure-boundaries.md]

### IPC Command Naming

Follow the established naming conventions:
- Rust command: `check_write_permission` (snake_case)
- JS invoke: `checkWritePermission` (camelCase) - Tauri handles conversion
- Actually use: `invoke('check_write_permission', { path })` - snake_case in invoke string

[Source: project-context.md - Tauri IPC Rules]

### Anti-Patterns to Avoid

- Do NOT use `@tauri-apps/api/dialog` - this is Tauri 1.x, use `@tauri-apps/plugin-dialog` for Tauri 2.0
- Do NOT skip write permission check - users may select read-only locations
- Do NOT show error on user cancellation - this is expected behavior
- Do NOT use `any` type for dialog result - properly type as `string | null`
- Do NOT hardcode paths - always use Tauri's path APIs for cross-platform support
- Do NOT block UI during permission check - use async/await properly

[Source: project-context.md - Anti-Patterns to Avoid]

### Accessibility Requirements

Per UX-11, UX-12, UX-13:
- Visible focus ring on Browse button
- Full keyboard navigation (Tab to button, Enter to activate)
- Screen reader announces current path and available action
- Error messages use `role="alert"` for immediate announcement

```typescript
// Accessibility attributes
<Button
  variant="outline"
  onClick={handleBrowse}
  aria-label={t('settings.selectFolder')}
  className="focus:ring-2 focus:ring-offset-2"
>
  {t('settings.browse')}
</Button>

{error && (
  <p className="text-sm text-destructive" role="alert" aria-live="assertive">
    {error}
  </p>
)}
```

[Source: epics.md - UX-10 through UX-14]

### Testing Checklist

**Manual Testing:**
- [ ] Folder dialog opens when clicking Browse
- [ ] Dialog starts at current download path (if set)
- [ ] Selecting a folder updates the displayed path
- [ ] Cancelling the dialog keeps the previous path
- [ ] Selecting a read-only folder shows permission error
- [ ] Path persists after closing and reopening the app
- [ ] Works on macOS (native Finder dialog)
- [ ] Works on Windows (native Explorer dialog)

**Accessibility Testing:**
- [ ] Can Tab to the Browse button
- [ ] Can activate with Enter key
- [ ] Screen reader announces button purpose
- [ ] Screen reader announces current path
- [ ] Error messages are announced immediately

**Integration Testing:**
- [ ] Settings store updates correctly
- [ ] Persistence middleware saves path to localStorage
- [ ] Downloads use the selected path (verified in Epic 6.3)

### Dependencies

**Depends on:**
- Story 1.4: Configure Zustand Store Structure (settingsStore exists)
- Story 1.3: Create App Shell Layout (component mounting point)

**Blocks:**
- Story 6.2: Persist Download Path Preference (uses same store)
- Story 6.3: Generate Filenames from Metadata (uses download path)

### References

- [Source: epics.md - Story 6.1 Acceptance Criteria]
- [Source: epics.md - FR20: User can select download destination folder via native OS dialog]
- [Source: project-context.md - Tauri IPC Rules]
- [Source: project-context.md - Anti-Patterns to Avoid]
- [Source: architecture/project-structure-boundaries.md - Component Organization]
- [Tauri 2.0 Dialog Plugin Documentation](https://v2.tauri.app/plugin/dialog/)
- [Tauri 2.0 Path API](https://v2.tauri.app/reference/javascript/api/namespacepath/)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

