# Rust Backend Architecture

## Module Structure (`src-tauri/src/`)
```
lib.rs          — Tauri app setup, command registration
commands/       — Tauri command handlers (thin wrappers calling services)
  mod.rs        — re-exports + auth helper fns (require_user_id, require_auth_and_cid, get_optional_auth_and_cid)
services/       — Business logic layer
models/         — Shared types (error.rs, track.rs, playlist.rs, url.rs, artist.rs)
```

## Commands (17 modules)
auth, download, ffmpeg, playlist, settings, updater, library, search, player, selections, new_tracks, related, artist, follow, rekordbox, messages, like

## Services (33 modules)
### Core Download Pipeline
- `pipeline.rs` — orchestrates download: PipelineConfig + CancellationHandles → download_and_convert
- `downloader.rs` — FFmpeg sidecar execution, progress parsing, format detection (WAV/FLAC/MP3/AAC), original download support
- `stream.rs` — SoundCloud API v2 track resolution, transcoding selection (score-based: codec + protocol + quality), CDN URL resolution
- `queue.rs` — DownloadQueue with concurrent processing, rate limit handling (pause/skip/cancel), progress events
- `cancellation.rs` — CancellationState with process tree killing

### Auth System
- `cookie.rs` — browser cookie extraction via rookie crate (BrowserCookie, CookieScanResult, datadome support)
- `oauth.rs` — token verification via SoundCloud /me endpoint (UserProfile)
- `storage.rs` — in-memory AuthState with refresh guard, token/datadome/user_id caching
- `client_id.rs` — SoundCloud client_id scraping from JS bundles (cached, regex extraction)

### HTTP Layer
- `http.rs` — shared HTTP client (rquest), API_V2_BASE, pagination (fetch_all_pages), rate limit parsing, RequestBuilderExt trait (with_oauth, with_datadome)

### Messaging
- `messages.rs` — direct messages (conversations list, message fetching, send with DataDome, unread probe), track/playlist embed resolution

### SoundCloud Features
- `artist.rs` — profile fetch, all tracks, URL resolution
- `follow.rs` — follow/unfollow with HMAC signature (matches SC JS implementation)
- `search.rs` — track + user search via API v2
- `library.rs` — user playlists with caching (LibraryCache), owned playlist detection
- `selections.rs` — SoundCloud curated selections/mixes (cached)
- `new_tracks.rs` — followed artists activity feed, stream parsing, seen state persistence, release detection (30-day window)
- `related.rs` — related tracks
- `playlist.rs` — playlist track fetching
- `like.rs` — like/unlike tracks via SoundCloud API
- `liked_tracks.rs` — liked tracks fetching with LikedTracksCache
- `config.rs` — power-user config file (skip_tls_verify), loaded once at startup

### Rekordbox Integration (`services/rekordbox/`)
- `config.rs` — auto-detect Rekordbox install (options.json / settings file), DB path validation
- `database.rs` — encrypted SQLite via rusqlite, USN tracking, ID generation
- `content.rs` — track import (artist/album/content resolution)
- `playlist.rs` — InfraBooth folder management, playlist CRUD, song ordering
- `xml_sync.rs` — masterPlaylists6.xml parsing and modification
- `backup.rs` — DB backup/restore with rotation
- `file_manager.rs` — track file copying to Rekordbox directory
- `models.rs` — constants (INFRABOOTH_FOLDER_NAME, MASTER_DB_FILENAME), DTOs (ExportTrackRequest, ExportResult, RekordboxStatus, RekordboxConfig)

### Support
- `metadata.rs` — ID3 tag embedding, artwork download, existing track ID scanning
- `filename.rs` — path sanitization (UNSAFE_CHARS replacement)
- `paths.rs` — default download/app data directories
- `sidecar.rs` — FFmpeg binary version detection
- `events.rs` — Tauri event name constants, TracksBatchEvent, batch emitter
- `ffmpeg.rs`, `updater.rs` — FFmpeg check, app update

## Error System
All error types in `models/error.rs`: FfmpegError, MetadataError, DownloadError, AuthError, FollowError, RekordboxError, SearchError, ScApiError (shared error for API services)
Each implements HasErrorCode trait → ErrorResponse with code + message for frontend.

## Key Patterns
- Auth helpers in commands/mod.rs extract token/cid from Tauri state
- Services use `rquest` (not reqwest) as HTTP client
- Queue supports concurrent downloads with configurable max_concurrent
- Rate limiting: pause + wait_for_user_choice (continue/skip/cancel)
- TrackCore struct with #[serde(flatten)] for shared track fields
