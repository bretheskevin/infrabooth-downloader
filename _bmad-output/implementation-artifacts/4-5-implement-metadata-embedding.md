# Story 4.5: Implement Metadata Embedding

Status: ready-for-dev

## Story

As a **user**,
I want **downloaded files to have proper metadata**,
so that **my music library shows correct artist, title, and artwork**.

## Acceptance Criteria

1. **Given** a track has been converted to MP3
   **When** metadata embedding is triggered (FR10)
   **Then** ID3 tags are written to the file including:
   - Title (track name)
   - Artist (creator name)
   - Album (playlist name, if from playlist)
   - Track number (position in playlist, if applicable)

2. **Given** the track has artwork available
   **When** embedding metadata
   **Then** the artwork is downloaded (if URL provided)
   **And** the artwork is embedded as album art in the MP3
   **And** artwork is resized if needed (reasonable file size)

3. **Given** metadata embedding completes
   **When** opening the file in a music player
   **Then** all metadata fields display correctly
   **And** artwork appears as album cover

4. **Given** metadata is unavailable or partial
   **When** embedding
   **Then** available fields are written
   **And** missing fields are left empty (not error state)
   **And** the file is still valid and playable

## Tasks / Subtasks

- [ ] Task 1: Add ID3 tag library (AC: #1)
  - [ ] 1.1 Add to `Cargo.toml`:
    ```toml
    id3 = "1"
    ```

- [ ] Task 2: Create metadata service (AC: #1, #4)
  - [ ] 2.1 Create `src-tauri/src/services/metadata.rs`:
    ```rust
    use id3::{Tag, TagLike, Version};
    use id3::frame::Picture;
    use std::path::Path;

    pub struct TrackMetadata {
        pub title: String,
        pub artist: String,
        pub album: Option<String>,
        pub track_number: Option<u32>,
        pub total_tracks: Option<u32>,
        pub artwork_url: Option<String>,
    }

    pub async fn embed_metadata(
        file_path: &Path,
        metadata: TrackMetadata,
    ) -> Result<(), MetadataError> {
        let mut tag = Tag::new();

        // Set basic metadata
        tag.set_title(&metadata.title);
        tag.set_artist(&metadata.artist);

        if let Some(album) = &metadata.album {
            tag.set_album(album);
        }

        if let Some(track_num) = metadata.track_number {
            tag.set_track(track_num);
        }

        if let Some(total) = metadata.total_tracks {
            tag.set_total_tracks(total);
        }

        // Download and embed artwork
        if let Some(artwork_url) = &metadata.artwork_url {
            if let Ok(artwork_data) = download_artwork(artwork_url).await {
                let picture = Picture {
                    mime_type: "image/jpeg".to_string(),
                    picture_type: id3::frame::PictureType::CoverFront,
                    description: "Cover".to_string(),
                    data: artwork_data,
                };
                tag.add_frame(picture);
            }
        }

        // Write tag to file
        tag.write_to_path(file_path, Version::Id3v24)
            .map_err(|_| MetadataError::WriteFailed)?;

        Ok(())
    }

    async fn download_artwork(url: &str) -> Result<Vec<u8>, reqwest::Error> {
        // Use higher resolution artwork
        let hq_url = url.replace("-large", "-t500x500");

        let response = reqwest::get(&hq_url).await?;
        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }
    ```

- [ ] Task 3: Define metadata types and errors (AC: #4)
  - [ ] 3.1 Add to `src-tauri/src/models/error.rs`:
    ```rust
    #[derive(Debug, thiserror::Error)]
    pub enum MetadataError {
        #[error("Failed to write metadata")]
        WriteFailed,
        #[error("Failed to download artwork")]
        ArtworkFailed,
    }
    ```

- [ ] Task 4: Update pipeline to include metadata (AC: #1, #2)
  - [ ] 4.1 Update `src-tauri/src/services/pipeline.rs`:
    ```rust
    use crate::services::metadata::{embed_metadata, TrackMetadata};

    pub struct PipelineConfig {
        pub track_url: String,
        pub track_id: String,
        pub output_dir: PathBuf,
        pub filename: String,
        pub metadata: TrackMetadata,
    }

    pub async fn download_and_convert(
        config: PipelineConfig,
        app: AppHandle,
    ) -> Result<PathBuf, PipelineError> {
        // ... existing download and convert code ...

        // Embed metadata
        if let Err(e) = embed_metadata(&output_path, config.metadata).await {
            // Log but don't fail - metadata is enhancement, not critical
            eprintln!("Metadata embedding failed: {}", e);
        }

        Ok(output_path)
    }
    ```

- [ ] Task 5: Update download command to accept metadata (AC: #1, #2)
  - [ ] 5.1 Update `src-tauri/src/commands/download.rs`:
    ```rust
    #[derive(Deserialize)]
    pub struct DownloadRequest {
        pub track_url: String,
        pub track_id: String,
        pub title: String,
        pub artist: String,
        pub album: Option<String>,
        pub track_number: Option<u32>,
        pub total_tracks: Option<u32>,
        pub artwork_url: Option<String>,
    }

    #[tauri::command]
    pub async fn download_track_full(
        request: DownloadRequest,
        app: AppHandle,
    ) -> Result<String, String> {
        let filename = sanitize_filename(&request.artist, &request.title);
        let output_dir = get_download_path(&app)?;

        let metadata = TrackMetadata {
            title: request.title,
            artist: request.artist,
            album: request.album,
            track_number: request.track_number,
            total_tracks: request.total_tracks,
            artwork_url: request.artwork_url,
        };

        let config = PipelineConfig {
            track_url: request.track_url,
            track_id: request.track_id.clone(),
            output_dir,
            filename,
            metadata,
        };

        // ... rest of function
    }

    fn sanitize_filename(artist: &str, title: &str) -> String {
        let raw = format!("{} - {}", artist, title);
        // Remove invalid characters
        raw.chars()
            .map(|c| match c {
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
                _ => c,
            })
            .collect()
    }
    ```

- [ ] Task 6: Update TypeScript interface (AC: #1)
  - [ ] 6.1 Update `src/lib/download.ts`:
    ```typescript
    export interface DownloadRequest {
      trackUrl: string;
      trackId: string;
      title: string;
      artist: string;
      album?: string;
      trackNumber?: number;
      totalTracks?: number;
      artworkUrl?: string;
    }

    export async function downloadTrack(
      request: DownloadRequest
    ): Promise<string> {
      return invoke<string>('download_track_full', { request });
    }
    ```

- [ ] Task 7: Test metadata embedding (AC: #1, #2, #3, #4)
  - [ ] 7.1 Download track with full metadata
  - [ ] 7.2 Verify ID3 tags with audio player
  - [ ] 7.3 Verify artwork appears as album art
  - [ ] 7.4 Test with missing artwork URL
  - [ ] 7.5 Test with missing album name

## Dev Notes

### ID3 Tag Mapping

| SoundCloud Field | ID3 Tag | Example |
|------------------|---------|---------|
| Track title | TIT2 (Title) | "Summer Vibes" |
| Username | TPE1 (Artist) | "DJ Marcus" |
| Playlist title | TALB (Album) | "Chill 2024" |
| Position | TRCK (Track) | "5/47" |
| Artwork | APIC (Picture) | JPEG data |

### Artwork Resolution

SoundCloud artwork URL suffixes:
- `-large`: 100x100 (default)
- `-t300x300`: 300x300
- `-t500x500`: 500x500 (use this)
- `-original`: Original size (may be huge)

Use 500x500 for good quality without excessive file size.

### Filename Sanitization

Invalid filesystem characters to replace:
- `/` `\` `:` `*` `?` `"` `<` `>` `|`

Replace with underscore `_` for safety across Windows/macOS.
[Source: _bmad-output/planning-artifacts/epics.md#FR22]

### Graceful Degradation

Metadata failures should NOT fail the download:
```rust
if let Err(e) = embed_metadata(&path, metadata).await {
    eprintln!("Metadata failed: {}", e);
    // Continue - file is still playable
}
```

The file without metadata is better than no file.

### File Structure After This Story

```
src-tauri/
├── Cargo.toml                # + id3
├── src/
│   ├── commands/
│   │   └── download.rs       # Updated with metadata
│   ├── services/
│   │   ├── metadata.rs       # New - ID3 embedding
│   │   └── pipeline.rs       # Updated
│   └── models/
│       └── error.rs          # + MetadataError

src/
├── lib/
│   └── download.ts           # Updated interface
```

### Playlist Context

When downloading from a playlist:
- `album` = Playlist title
- `track_number` = Position in playlist (1-indexed)
- `total_tracks` = Playlist track count

For single tracks:
- `album` = None
- `track_number` = None

### What This Story Does NOT Include

- Full filename handling (Story 6.3)
- Queue processing (Story 4.6)
- Duplicate file handling (Story 6.3)

This story embeds metadata; file management is in Epic 6.

### Anti-Patterns to Avoid

- Do NOT fail download on metadata error — graceful degradation
- Do NOT use low-res artwork — use t500x500
- Do NOT skip filename sanitization — cross-platform safety
- Do NOT embed huge artwork — 500x500 is enough

### Testing the Result

After completing all tasks:
1. Downloaded MP3 has correct title, artist
2. Playlist downloads have album and track number
3. Artwork displays in music players (iTunes, VLC, etc.)
4. Missing metadata doesn't cause errors
5. Filename is sanitized (no invalid chars)
6. File plays correctly in all players

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.5]
- [Source: _bmad-output/planning-artifacts/epics.md#FR10]
- [Source: _bmad-output/planning-artifacts/epics.md#FR22]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

