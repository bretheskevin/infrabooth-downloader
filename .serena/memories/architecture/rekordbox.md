# Rekordbox Integration Architecture

## Purpose
Export downloaded tracks and playlists into Rekordbox 6/7 database. Creates "InfraBooth" folder in Rekordbox with per-download playlists.

## Playlist Export (`commands/rekordbox_export.rs`)
- `export_playlist_to_rekordbox` command — exports a playlist's tracks to Rekordbox
- Concurrent track downloads with semaphore-based throttling
- Progress events streamed to frontend via `REKORDBOX_EXPORT_PROGRESS`
- Downloads tracks to `rekordbox_downloads/` in app data dir, reuses existing files
- Registers tracks in named playlist + "All Tracks" playlist under InfraBooth folder

## Exclusion – Leaf-Hook Architecture (Issue #44)
- `src/components/track-list-context.ts` — defines `TrackListContextValue` (with `playlistId?: string`), `TrackListContext`, `useTrackListContext`, `useTrackListContextOptional`. Separate file to avoid circular deps.
- `src/features/rekordbox-export/hooks/useTrackExclusion.ts` — leaf hook: reads `playlistId` from optional context, derives `isExcluded` and `toggle` (undefined when no playlist). Used by `TrackRow` (badge/opacity) and `TrackMenuItems` (menu item).
- No `isExcluded`/`onToggleExcluded` props on `TrackRowProps`, `TrackRowActionsDropdownProps`, `TrackRowActionsContextContentProps`, `TrackMenuItemsProps`.
- `TrackListProvider` carries `playlistId` only (no `excludedIds`/`onToggleExcluded`).
- Bulk "Exclude from export" still in `useTrackListState` via `handleExcludeSelected`/`canExclude` → `SelectionActionBar`.
- Row selectability (`nonSelectableIds` in `useTrackListState`): no Rekordbox → downloaded rows non-selectable; Rekordbox → only downloaded∩excluded non-selectable (downloaded stays selectable so it can be excluded). Bulk download skips already-downloaded (`downloadableSelected`); `useDownloadSelected` no-ops on an empty list (avoids a stuck "Preparing…" bar). Exclude UI (bulk button, per-row toggle, badge) gated on Rekordbox via `canExclude`.

## Exclusion Store (`features/rekordbox-export/store.ts`)
- `useRekordboxExclusionStore` — zustand persist store; `excludedByPlaylist: Record<string, number[]>` persisted under `'sc-downloader-rekordbox-exclusions'`
- `toggleExcluded(playlistId, trackId)` — adds or removes a track id
- `excludeTracks(playlistId, trackIds[])` — bulk-adds without duplicating existing ids
- `useExcludedTrackIds(playlistId?)` — hook returning a memoized `Set<number>` (ref-stable when array unchanged, empty Set when undefined)

## Frontend Export (`features/rekordbox-export/`)
- `ExportToRekordboxButton` — trigger button with confirmation dialog
- `ExportPhaseSection` — phase-based progress UI (pending → downloading → registering → completed)
- `useRekordboxExport` hook — manages export lifecycle and track status tracking
- `useRekordboxDetection` hook — checks Rekordbox availability

## Module Layout (`services/rekordbox/`)
- `config.rs` — detect Rekordbox install path, version, DB location
  - Checks `options.json` and settings files in Pioneer app directory
  - Supports manual path override from frontend settings
  - `detect_rekordbox()` → RekordboxStatus (found, version, db_path, is_running)
- `database.rs` — RekordboxDatabase wrapper around rusqlite
  - Opens encrypted SQLite DB (Rekordbox uses SQLCipher-like encryption)
  - USN (Update Sequence Number) tracking for Rekordbox sync
  - ID generation: random IDs with bit shifting, collision avoidance
  - Transaction support with flush_usn_and_commit / rollback
- `content.rs` — track content management
  - `add_content()` — imports track file into Rekordbox content table
  - Resolves or creates: artist, album, named entities
  - Reads ID3 metadata from MP3 files
  - Builds search strings for Rekordbox search
- `playlist.rs` — playlist operations in Rekordbox DB
  - `find_or_create_infrabooth_folder()` — creates InfraBooth root folder
  - `create_playlist()`, `delete_playlist()`, `add_to_playlist()`
  - Name deduplication (appends " (2)", " (3)" etc.)
  - Sibling reordering on insert/delete
- `xml_sync.rs` — masterPlaylists6.xml manipulation
  - Custom XML parser (not DOM-based, preserves formatting)
  - PlaylistXml: read, add_playlist, remove_playlist, save
  - XmlNode with id, parent_id, attributes, timestamps
- `backup.rs` — DB backup before modifications
  - Timestamped copies, rotation (keeps N most recent)
  - Restore capability
- `file_manager.rs` — copies MP3 files to Rekordbox directory
  - Sanitizes filenames, dedup check (files_match)
- `models.rs` — shared constants and DTOs
  - INFRABOOTH_FOLDER_NAME, MASTER_DB_FILENAME, MASTER_PLAYLISTS_XML
  - ExportTrackRequest, ExportResult, RekordboxConfig, RekordboxStatus, etc.

## Tests
- Unit tests colocated as `services/rekordbox/tests/` (backup, config, content, database, file_manager, playlist, xml_sync, e2e, export_flow)
- Fixtures and runner script in `src-tauri/tests/fixtures/rekordbox/`
- Command-level tests in `commands/rekordbox_tests.rs`

## Frontend Settings
- `RekordboxSettings` component — detects status, configures manual path override via embedded folder picker
- `BackupSection` component — lists backups, restore with confirmation dialog, pre-restore snapshots
- Settings store: `rekordboxPathOverride` field

## Safety
- Always creates backup before DB modifications
- Checks if Rekordbox is running (warns user to close it)
- USN updates ensure Rekordbox picks up changes on next launch
- Untrusted `manual_db_path` override and per-track export `source_path` are confined to the user's home dir via `paths::confine_within` (see `resolve_rekordbox_config`/`confine_manual_db_path` in `commands/rekordbox.rs`); violations return `RekordboxError::InvalidPath` (`REKORDBOX_INVALID_PATH`). Needed because these paths can arrive from the remote LAN bridge
