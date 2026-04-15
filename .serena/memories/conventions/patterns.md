# Code Conventions & Patterns

## Frontend
- **Feature modules**: self-contained in `src/features/{name}/` with components/, hooks/, api/, store.ts, __test__/, index.ts
- **shadcn/ui**: all UI primitives in `src/components/ui/` — always use existing components
- **Zustand stores**: state + actions in single file, some use slice pattern (queue, player)
  - Settings store uses `makeSetter`, `makeClampedSetter`, `pickKeys` helpers from `features/settings/helpers.ts` to reduce boilerplate
- **Persisted store**: settings store uses zustand/middleware persist
- **i18n**: `useTranslation()` hook, translations in `src/locales/{en,fr}.json`
- **Tests**: colocated in `__test__/` directories
- **Logging**: NEVER use console.log — use `logger` from `@/lib/logger` (async, fire-and-forget with `void logger.info(...)`)
- **No comments** unless logic is genuinely non-obvious
- **No useEffect for derived state** — compute during render or useMemo
- **No useState + useEffect for fetched data** — use TanStack Query
- **Function length**: <50 lines. Component length: <150 lines.

## Feature Flags (WIP gating)
- Boolean flags in `src/config/feature-flags.toml` parsed by `src/lib/featureFlags.ts`
- Typed `FeatureFlags` object; unknown keys or non-boolean values throw at startup
- Use `featureFlags.xxx` to gate UI areas; never add tests for flag parser or flag-driven toggles

## Shared Layouts
- **Card/list views**: `CardListView` primitive + `ViewModeToggle` — feature decides both card and row components, primitive dispatches by `viewMode` from settings store
- **Track lists**: `components/track-list/` (TrackListView + TrackListItems + TrackListToolbar + useTrackListState) — shared across library, artist-profile, releases

## Backend (Rust)
- **Error types**: custom enums in `models/error.rs` implementing HasErrorCode trait
- **HTTP client**: `rquest` (NOT reqwest), configured in `services/http.rs`
- **Auth pattern**: commands use `require_auth_and_cid()` / `get_optional_auth_and_cid()` from commands/mod.rs
- **Serde**: `#[serde(flatten)]` for TrackCore composition, `#[serde(rename_all = "camelCase")]` for TS compatibility
- **Tauri commands**: thin wrappers in commands/ calling service functions
- **Specta**: `#[specta::specta]` on commands for TypeScript binding generation
- **Caching**: several services use interior mutability (Mutex<Option<T>>) for in-memory caches (LibraryCache, SelectionCache, NewTracksCache, client_id)
- **Rustfmt**: `src-tauri/rustfmt.toml` enforces formatting; husky pre-commit hook runs conditionally

## IPC
- `src/lib/tauri.ts` — `api` object wraps all Tauri commands
- `ApiError` class with error code
- `unwrap()` helper converts errors
- Types imported from `src/bindings.ts` (auto-generated, never edit)
