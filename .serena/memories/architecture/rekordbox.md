# Rekordbox Integration Architecture

## Purpose
Export downloaded tracks into Rekordbox 6/7 database. Creates "InfraBooth" folder in Rekordbox with per-download playlists.

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

## Frontend Settings
- RekordboxSettings component — detect status, configure path
- RekordboxPathPicker — folder dialog for manual override
- Settings store: `rekordboxPathOverride` field

## Safety
- Always creates backup before DB modifications
- Checks if Rekordbox is running (warns user to close it)
- USN updates ensure Rekordbox picks up changes on next launch
