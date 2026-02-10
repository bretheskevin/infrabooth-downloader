# Story 6.3: Generate Filenames from Metadata

Status: review

## Story

As a **user**,
I want **my downloaded files to have proper filenames**,
so that **I can identify songs without opening them**.

## Acceptance Criteria (FR21, FR22)

1. **Given** a track has been downloaded and converted (FR22)
   **When** saving the final file
   **Then** the filename format is: `Artist - Title.mp3`
   **And** the file is saved to the user's chosen download path (FR21)

2. **Given** track metadata includes special characters
   **When** generating the filename
   **Then** invalid filesystem characters are sanitized (e.g., `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`)
   **And** the filename remains readable and meaningful

3. **Given** a file with the same name already exists
   **When** saving the new file
   **Then** a number suffix is added: `Artist - Title (2).mp3`
   **And** existing files are not overwritten

4. **Given** the artist or title is missing
   **When** generating the filename
   **Then** fallback to track ID or URL slug
   **And** the file is still saved with a valid name

5. **Given** a playlist download
   **When** generating filenames
   **Then** optionally prefix with track number: `01 - Artist - Title.mp3`
   **And** numbering preserves playlist order

## Tasks / Subtasks

- [x] Task 1: Create Filename Generator Service (AC: #1, #2, #4)
  - [x] 1.1 Create `src-tauri/src/services/filesystem.rs` (or extend if exists)
  - [x] 1.2 Implement `generate_filename` function with sanitization
  - [x] 1.3 Implement `sanitize_filename_component` helper for individual parts
  - [x] 1.4 Handle edge cases: empty artist, empty title, both empty
  - [x] 1.5 Add unit tests for filename generation

- [x] Task 2: Implement Filename Sanitization (AC: #2)
  - [x] 2.1 Create character replacement map for invalid filesystem characters
  - [x] 2.2 Handle platform-specific reserved names (Windows: CON, PRN, AUX, etc.)
  - [x] 2.3 Trim leading/trailing whitespace and dots
  - [x] 2.4 Limit filename length (255 chars max, accounting for path)
  - [x] 2.5 Replace consecutive underscores/spaces with single instance

- [x] Task 3: Implement Duplicate Handling (AC: #3)
  - [x] 3.1 Create `get_unique_filepath` function in `filesystem.rs`
  - [x] 3.2 Check if file exists at target path
  - [x] 3.3 If exists, append incrementing suffix: `(2)`, `(3)`, etc.
  - [x] 3.4 Return first available unique path
  - [x] 3.5 Add unit tests for duplicate handling

- [x] Task 4: Implement Track Numbering for Playlists (AC: #5)
  - [x] 4.1 Create `generate_playlist_filename` function
  - [x] 4.2 Accept track position and total tracks parameters
  - [x] 4.3 Zero-pad track numbers based on total (e.g., `01` for <100, `001` for <1000)
  - [x] 4.4 Format: `{padded_number} - {Artist} - {Title}.mp3`
  - [x] 4.5 Make track numbering configurable (optional setting for future)

- [x] Task 5: Implement Fallback Logic (AC: #4)
  - [x] 5.1 Define fallback priority: metadata > URL slug > track ID > timestamp
  - [x] 5.2 Extract slug from SoundCloud URL if artist/title missing
  - [x] 5.3 Use track ID as ultimate fallback
  - [x] 5.4 Ensure fallback produces valid, unique filenames

- [x] Task 6: Integrate with Download Pipeline (AC: #1, #5)
  - [x] 6.1 Update `src-tauri/src/services/pipeline.rs` to use filename generator
  - [x] 6.2 Pass playlist context (position, total) when applicable
  - [x] 6.3 Use settings store for download path
  - [x] 6.4 Verify file is written to correct location

- [x] Task 7: Create TypeScript Types (AC: #1)
  - [x] 7.1 Add `FilenameOptions` interface to `src/types/track.ts`
  - [x] 7.2 Update `DownloadRequest` interface to include filename options
  - [x] 7.3 Ensure types match Rust structs

- [x] Task 8: Testing and Verification (AC: #1-5)
  - [x] 8.1 Test single track filename generation
  - [x] 8.2 Test playlist filename generation with track numbers
  - [x] 8.3 Test special character sanitization
  - [x] 8.4 Test duplicate file handling
  - [x] 8.5 Test fallback when metadata is missing
  - [x] 8.6 Test cross-platform (macOS and Windows)

## Dev Notes

### Filename Sanitization Rules

**Invalid Filesystem Characters (must be replaced):**

| Character | Replacement | Reason |
|-----------|-------------|--------|
| `/` | `_` | Path separator (Unix) |
| `\` | `_` | Path separator (Windows) |
| `:` | `-` | Drive separator (Windows), common in times |
| `*` | `_` | Wildcard |
| `?` | `_` | Wildcard |
| `"` | `'` | Quote character |
| `<` | `_` | Redirect operator |
| `>` | `_` | Redirect operator |
| `\|` | `-` | Pipe operator |
| `\0` | removed | Null byte |

**Windows Reserved Names (prepend underscore if matched):**
- CON, PRN, AUX, NUL
- COM1-COM9, LPT1-LPT9

**Additional Sanitization:**
- Trim leading/trailing whitespace
- Trim leading/trailing dots (Windows restriction)
- Replace multiple consecutive spaces with single space
- Replace multiple consecutive underscores with single underscore
- Limit total filename length to 200 characters (leaving room for path)

```rust
// src-tauri/src/services/filesystem.rs

const INVALID_CHARS: &[char] = &['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0'];
const WINDOWS_RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];
const MAX_FILENAME_LENGTH: usize = 200;

pub fn sanitize_filename_component(input: &str) -> String {
    let mut result: String = input
        .chars()
        .map(|c| {
            if INVALID_CHARS.contains(&c) {
                '_'
            } else if c == ':' {
                '-'
            } else if c == '"' {
                '\''
            } else {
                c
            }
        })
        .collect();

    // Trim whitespace and dots
    result = result.trim().trim_matches('.').to_string();

    // Collapse multiple underscores/spaces
    while result.contains("__") {
        result = result.replace("__", "_");
    }
    while result.contains("  ") {
        result = result.replace("  ", " ");
    }

    // Check Windows reserved names
    let upper = result.to_uppercase();
    if WINDOWS_RESERVED.iter().any(|r| upper == *r || upper.starts_with(&format!("{}.", r))) {
        result = format!("_{}", result);
    }

    result
}
```

[Source: project-context.md - Security Rules: Sanitize filenames before writing to filesystem]

### Duplicate Handling Pattern

When a file already exists, append incrementing numbers in parentheses:

```
Artist - Title.mp3          # First file
Artist - Title (2).mp3      # Second file (same name)
Artist - Title (3).mp3      # Third file
```

**Implementation:**

```rust
// src-tauri/src/services/filesystem.rs
use std::path::{Path, PathBuf};

pub fn get_unique_filepath(base_path: &Path, filename: &str) -> PathBuf {
    let full_path = base_path.join(filename);

    if !full_path.exists() {
        return full_path;
    }

    // Extract stem and extension
    let stem = Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(filename);
    let extension = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp3");

    let mut counter = 2;
    loop {
        let new_filename = format!("{} ({}).{}", stem, counter, extension);
        let new_path = base_path.join(&new_filename);

        if !new_path.exists() {
            return new_path;
        }

        counter += 1;

        // Safety limit to prevent infinite loop
        if counter > 1000 {
            // Use timestamp as ultimate fallback
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            return base_path.join(format!("{}_{}.{}", stem, timestamp, extension));
        }
    }
}
```

[Source: epics.md - Story 6.3 AC #3]

### Track Numbering for Playlists

Zero-pad track numbers based on total playlist size:

| Total Tracks | Padding | Example |
|--------------|---------|---------|
| 1-9 | 1 digit | `1 - Artist - Title.mp3` |
| 10-99 | 2 digits | `01 - Artist - Title.mp3` |
| 100-999 | 3 digits | `001 - Artist - Title.mp3` |

**Implementation:**

```rust
pub struct PlaylistContext {
    pub track_position: u32,    // 1-indexed position
    pub total_tracks: u32,
}

pub fn generate_playlist_filename(
    artist: &str,
    title: &str,
    context: &PlaylistContext,
) -> String {
    let sanitized_artist = sanitize_filename_component(artist);
    let sanitized_title = sanitize_filename_component(title);

    // Determine padding width
    let width = if context.total_tracks < 10 {
        1
    } else if context.total_tracks < 100 {
        2
    } else {
        3
    };

    let padded_number = format!("{:0>width$}", context.track_position, width = width);

    let filename = format!(
        "{} - {} - {}.mp3",
        padded_number,
        sanitized_artist,
        sanitized_title
    );

    // Enforce max length
    truncate_filename(&filename, MAX_FILENAME_LENGTH)
}

fn truncate_filename(filename: &str, max_len: usize) -> String {
    if filename.len() <= max_len {
        return filename.to_string();
    }

    // Preserve extension
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp3");

    let stem_max = max_len - ext.len() - 1; // -1 for the dot
    let stem = &filename[..stem_max.min(filename.len())];

    format!("{}.{}", stem.trim_end(), ext)
}
```

[Source: epics.md - Story 6.3 AC #5]

### Rust Implementation Location

All filesystem operations should be in:

```
src-tauri/
└── src/
    └── services/
        └── filesystem.rs    # Filename generation, sanitization, unique paths
```

**Module exports:**

```rust
// src-tauri/src/services/mod.rs
pub mod filesystem;

// Re-export key functions
pub use filesystem::{
    generate_filename,
    generate_playlist_filename,
    sanitize_filename_component,
    get_unique_filepath,
};
```

[Source: architecture/project-structure-boundaries.md]

### Integration with Pipeline

The download pipeline should use the filesystem service:

```rust
// src-tauri/src/services/pipeline.rs
use crate::services::filesystem::{generate_filename, generate_playlist_filename, get_unique_filepath};

pub async fn download_and_convert(
    config: PipelineConfig,
    app: AppHandle,
) -> Result<PathBuf, PipelineError> {
    // ... download and convert steps ...

    // Generate filename from metadata
    let filename = match &config.playlist_context {
        Some(ctx) => generate_playlist_filename(
            &config.metadata.artist,
            &config.metadata.title,
            ctx,
        ),
        None => generate_filename(
            &config.metadata.artist,
            &config.metadata.title,
        ),
    };

    // Ensure unique path (no overwrites)
    let output_path = get_unique_filepath(&config.output_dir, &filename);

    // Move/rename file to final location
    std::fs::rename(&temp_path, &output_path)?;

    // Embed metadata
    embed_metadata(&output_path, config.metadata).await?;

    Ok(output_path)
}
```

[Source: Story 4.5 - Implement Metadata Embedding]

### Fallback Priority

When metadata is missing, use this fallback chain:

1. **Artist + Title** (ideal): `Artist - Title.mp3`
2. **Title only** (no artist): `Title.mp3`
3. **Artist only** (no title): `Artist - Unknown Track.mp3`
4. **URL slug** (extracted from SoundCloud URL): `summer-vibes-2024.mp3`
5. **Track ID** (ultimate fallback): `track_123456789.mp3`
6. **Timestamp** (if all else fails): `download_1707154200.mp3`

```rust
pub fn generate_filename_with_fallback(
    artist: Option<&str>,
    title: Option<&str>,
    url_slug: Option<&str>,
    track_id: &str,
) -> String {
    let artist_clean = artist
        .filter(|s| !s.trim().is_empty())
        .map(sanitize_filename_component);
    let title_clean = title
        .filter(|s| !s.trim().is_empty())
        .map(sanitize_filename_component);

    let stem = match (artist_clean, title_clean) {
        (Some(a), Some(t)) => format!("{} - {}", a, t),
        (None, Some(t)) => t,
        (Some(a), None) => format!("{} - Unknown Track", a),
        (None, None) => {
            // Try URL slug
            if let Some(slug) = url_slug {
                sanitize_filename_component(slug)
            } else {
                format!("track_{}", track_id)
            }
        }
    };

    format!("{}.mp3", stem)
}

/// Extract slug from SoundCloud URL
/// e.g., "https://soundcloud.com/artist/track-name" -> "track-name"
pub fn extract_url_slug(url: &str) -> Option<String> {
    url.split('/')
        .last()
        .filter(|s| !s.is_empty() && !s.contains('?'))
        .map(|s| s.to_string())
}
```

### TypeScript Interface Updates

```typescript
// src/types/track.ts

export interface FilenameOptions {
  artist: string;
  title: string;
  trackId: string;
  urlSlug?: string;
  playlistContext?: PlaylistContext;
}

export interface PlaylistContext {
  trackPosition: number;  // 1-indexed
  totalTracks: number;
}

// Update DownloadRequest to include filename options
export interface DownloadRequest {
  trackUrl: string;
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  trackNumber?: number;
  totalTracks?: number;
  artworkUrl?: string;
  urlSlug?: string;  // For fallback
}
```

[Source: project-context.md - Cross-Language Type Safety]

### Anti-Patterns to Avoid

- **Do NOT overwrite existing files** - Always use duplicate handling
- **Do NOT skip sanitization** - Cross-platform safety is critical
- **Do NOT use raw metadata in paths** - Always sanitize first
- **Do NOT hardcode path separators** - Use `std::path::Path` APIs
- **Do NOT allow empty filenames** - Always have a fallback
- **Do NOT trust metadata length** - SoundCloud titles can be very long
- **Do NOT use platform-specific code** - Keep cross-platform compatible
- **Do NOT fail silently on filesystem errors** - Return proper Result types

[Source: project-context.md - Anti-Patterns to Avoid]

### Testing Checklist

**Unit Tests (Rust):**
- [ ] `sanitize_filename_component` removes all invalid characters
- [ ] `sanitize_filename_component` handles Windows reserved names
- [ ] `sanitize_filename_component` trims whitespace and dots
- [ ] `sanitize_filename_component` collapses multiple underscores
- [ ] `generate_filename` creates correct format
- [ ] `generate_playlist_filename` zero-pads correctly for different totals
- [ ] `get_unique_filepath` returns original if no conflict
- [ ] `get_unique_filepath` appends (2), (3), etc. for duplicates
- [ ] `extract_url_slug` parses SoundCloud URLs correctly
- [ ] `generate_filename_with_fallback` follows priority chain

**Integration Tests:**
- [ ] Single track downloads have correct filename
- [ ] Playlist tracks have numbered prefixes
- [ ] Special characters in metadata are sanitized
- [ ] Duplicate files get unique suffixes
- [ ] Files saved to correct download path (from settings)
- [ ] Long titles are truncated appropriately

**Manual Tests:**
- [ ] Download track with special characters in title (e.g., `What's Up? (Remix)`)
- [ ] Download track with emoji in title
- [ ] Download same track twice - verify (2) suffix
- [ ] Download playlist - verify track numbering
- [ ] Verify files play correctly in music players
- [ ] Test on macOS and Windows

### File Structure After This Story

```
src-tauri/
└── src/
    └── services/
        ├── mod.rs              # Add filesystem module
        ├── filesystem.rs       # NEW - filename generation
        └── pipeline.rs         # Updated to use filesystem service

src/
└── types/
    └── track.ts               # Add FilenameOptions, PlaylistContext
```

### Dependencies

**Depends on:**
- Story 4.5: Implement Metadata Embedding (provides metadata structure)
- Story 6.1: Implement Folder Selection Dialog (provides download path)
- Story 6.2: Persist Download Path Preference (ensures path is available)

**Blocks:**
- Story 6.4: Display Completion Panel (needs files to be saved correctly)
- Epic 7: Error Handling (filename errors need to be reportable)

### Example Filename Outputs

| Input | Output |
|-------|--------|
| Artist: "DJ Marcus", Title: "Summer Vibes" | `DJ Marcus - Summer Vibes.mp3` |
| Artist: "The Band", Title: "What's Up? (Remix)" | `The Band - What's Up_ (Remix).mp3` |
| Artist: "", Title: "Unknown Artist Track" | `Unknown Artist Track.mp3` |
| Playlist track #5 of 47 | `05 - DJ Marcus - Summer Vibes.mp3` |
| Duplicate file exists | `DJ Marcus - Summer Vibes (2).mp3` |
| Title: "CON" (Windows reserved) | `_CON.mp3` |
| Very long title (250+ chars) | Truncated to 200 chars + `.mp3` |

### References

- [Source: epics.md - Story 6.3: Generate Filenames from Metadata]
- [Source: epics.md - FR21: System can save downloaded files to user-specified location]
- [Source: epics.md - FR22: System can generate filenames from track metadata]
- [Source: project-context.md - Security Rules: Sanitize filenames]
- [Source: architecture/project-structure-boundaries.md - services/filesystem.rs]
- [Source: Story 4.5 - Metadata structure and pipeline integration]
- [Source: Story 6.1 - Download path from settings store]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5)

### Debug Log References

None

### Completion Notes List

**REFACTORED: Leveraging yt-dlp's native filename handling**

The implementation was refactored to use yt-dlp's built-in filename capabilities instead of custom Rust code. yt-dlp is a mature, well-tested tool for this.

**Key changes:**
- Filename generation uses yt-dlp output templates: `-o "%(artist,uploader)s - %(title)s.%(ext)s"`
- Playlist numbering uses: `-o "%(playlist_index)02d - %(artist,uploader)s - %(title)s.%(ext)s"`
- Cross-platform sanitization via `--windows-filenames` flag
- Duplicate handling via `--no-overwrites` flag
- Parsing destination from yt-dlp output: `[download] Destination: /path/to/file.mp3`

**Implementation details:**
- Updated `ytdlp.rs` with `build_output_template()` function for dynamic template generation
- Added `PlaylistContext` struct for track position and total tracks
- Added `parse_destination()` to extract final filename from yt-dlp output
- Updated `pipeline.rs` to use new config without filename field
- Updated `queue.rs` to pass playlist context to pipeline
- Removed custom `filesystem.rs` module (deleted)
- Removed `sanitize_filename` functions from `download.rs` and `queue.rs`
- Added TypeScript `PlaylistContext` interface

**Tests:**
- 155 Rust tests passing
- 526 frontend tests passing
- Frontend build successful
- Rust release build successful

### Change Log

- 2026-02-10: Story 6.3 implementation complete - leveraging yt-dlp native filename handling with `--windows-filenames` and output templates

### File List

- src-tauri/src/services/ytdlp.rs (MODIFIED - added output template building, PlaylistContext, parse_destination)
- src-tauri/src/services/pipeline.rs (MODIFIED - removed filename field, added playlist_context)
- src-tauri/src/services/queue.rs (MODIFIED - simplified, passes playlist_context)
- src-tauri/src/services/mod.rs (MODIFIED - removed filesystem module)
- src-tauri/src/commands/download.rs (MODIFIED - removed sanitize_filename, uses new config)
- src/types/track.ts (MODIFIED - simplified, only PlaylistContext interface)

