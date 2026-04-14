# Rekordbox Settings Design

## Goal

Add a small Rekordbox settings page under `src/features/settings` so users can verify whether Rekordbox is available and only configure a custom path when automatic detection fails.

The page should stay simple and future-facing. It should explain that the app will support downloading and exporting tracks directly to Rekordbox, but it should not expose advanced Rekordbox settings yet.

## User Experience

### Sidebar

- Add a new `Rekordbox` category to the settings sidebar.
- Keep existing categories unchanged.

### Rekordbox page

- Show a short description explaining that users will later be able to download tracks and export them directly to Rekordbox.
- When the page loads, run Rekordbox detection.
- If automatic detection succeeds:
  - show a minimal success state
  - do not show a manual override field
  - do not surface the detected path in the UI
- If automatic detection fails:
  - show a short “not found automatically” state
  - reveal a single manual override control
  - allow the user to retry detection

### Manual override behavior

- Save the user-provided override path in persisted settings.
- On later app launches or page visits:
  - try automatic detection first
  - if automatic detection succeeds, use the detected path and ignore the saved override
  - if automatic detection fails, retry detection with the saved override
- The override exists as a fallback only. It does not replace automatic detection when auto-detection is working.

## Functional Design

### Frontend state

- Extend the settings store with a persisted `rekordboxPathOverride` string.
- Keep Rekordbox detection state out of persisted settings because it is derived from runtime checks.
- The Rekordbox page should manage:
  - loading state
  - detected or not-detected status
  - transient detection error state if the command fails unexpectedly

### Frontend API

- Add a frontend Rekordbox settings API wrapper around the generated Tauri bindings.
- The wrapper should support:
  - detection without override
  - detection with an override when fallback is needed

### UI components

- Add a dedicated `RekordboxSettings` page component.
- Add a small picker component or reuse existing folder/file selection patterns for manual override input.
- The override control should remain hidden unless Rekordbox cannot be found automatically.
- Include a lightweight `Retry detection` action in the not-found state.

## Backend Design

### Detection command

- Extend the existing Rekordbox detection command so the frontend can optionally pass a manual override path.
- Preserve current automatic detection behavior.
- If an override is provided, the command should validate and use it only when the frontend explicitly requests fallback detection with that override.

### Path contract

- The settings UI should store the exact path format expected by backend validation.
- Prefer storing the Rekordbox database file path if that matches the current backend contract most directly.
- If the existing folder picker only returns directories, add the minimal backend or frontend adaptation needed so the stored override remains unambiguous and valid.

## Error Handling

- If detection fails normally, treat it as a non-error “not found” state in the UI.
- If the detection command returns an unexpected backend error, show a short generic error message and still allow retry.
- If a saved override becomes invalid, treat it like any other failed fallback and keep the manual override control visible.

## Testing

### Frontend

- Add or update tests for:
  - sidebar category rendering with the new Rekordbox entry
  - Rekordbox page success state when auto-detection succeeds
  - manual override visibility only when auto-detection fails
  - retry behavior
  - persisted override fallback behavior

### Backend

- Add command-level coverage for detection with and without an override if existing tests do not already cover that behavior through the service layer.

## Non-Goals

- No backup management UI
- No XML sync settings
- No playlist or export behavior controls
- No always-visible custom path field
- No advanced Rekordbox diagnostics

## Suggested Small Improvement

- Keep the `Retry detection` action.

This adds real value without increasing the settings surface area and helps when Rekordbox becomes available while the dialog is already open.
