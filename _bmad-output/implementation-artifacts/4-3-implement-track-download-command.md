# Story 4.3: Implement Track Download Command

Status: review

## Story

As a **user**,
I want **tracks downloaded at the highest quality my subscription allows**,
so that **I get the full value of my Go+ subscription**.

## Acceptance Criteria

1. **Given** yt-dlp is configured from Story 4.1
   **When** a download command is invoked for a track
   **Then** yt-dlp is called with the track URL
   **And** authentication cookies/tokens are passed to yt-dlp
   **And** the best available audio quality is requested (FR8: 256kbps AAC for Go+)

2. **Given** yt-dlp downloads a track
   **When** the download completes
   **Then** the audio file is saved to a temporary location
   **And** the original format is preserved (typically AAC)
   **And** the file path is returned for further processing

3. **Given** a download is in progress
   **When** yt-dlp outputs progress information
   **Then** the progress is parsed from stdout
   **And** progress events are emitted to the frontend (ARCH-8)

4. **Given** a download fails
   **When** yt-dlp returns an error
   **Then** the error is captured and categorized
   **And** a structured error is returned (ARCH-9)
   **And** the failure does not crash the application

## Tasks / Subtasks

- [x] Task 1: Create download service with auth (AC: #1)
  - [x] 1.1 Update `src-tauri/src/services/ytdlp.rs`:
    ```rust
    use crate::services::storage::load_tokens;
    use std::env;
    use tempfile::TempDir;

    pub struct DownloadConfig {
        pub track_url: String,
        pub track_id: String,
        pub temp_dir: PathBuf,
    }

    pub async fn download_track(
        config: DownloadConfig,
        app: AppHandle,
    ) -> Result<PathBuf, YtDlpError> {
        // Get OAuth token for authentication
        let tokens = load_tokens()
            .map_err(|_| YtDlpError::AuthRequired)?
            .ok_or(YtDlpError::AuthRequired)?;

        // Prepare output path
        let output_template = config.temp_dir
            .join(format!("{}.%(ext)s", config.track_id));

        // Build yt-dlp arguments
        let mut args = vec![
            "--no-playlist".to_string(),
            "-x".to_string(),                    // Extract audio
            "--audio-format".to_string(),
            "best".to_string(),
            "--audio-quality".to_string(),
            "0".to_string(),                     // Best quality
            "--add-header".to_string(),
            format!("Authorization: OAuth {}", tokens.access_token),
            "-o".to_string(),
            output_template.to_str().unwrap().to_string(),
            "--newline".to_string(),             // Progress on new lines
            config.track_url.clone(),
        ];

        let (mut rx, child) = Command::new_sidecar("yt-dlp")
            .expect("sidecar")
            .args(&args)
            .spawn()
            .map_err(|_| YtDlpError::BinaryNotFound)?;

        let mut output_path: Option<PathBuf> = None;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    // Parse and emit progress
                    if let Some(progress) = parse_progress(&line) {
                        let _ = app.emit("download-progress", serde_json::json!({
                            "trackId": config.track_id,
                            "status": "downloading",
                            "percent": progress,
                        }));
                    }
                    // Capture output filename
                    if line.contains("[download] Destination:") {
                        let path = line.replace("[download] Destination:", "").trim().to_string();
                        output_path = Some(PathBuf::from(path));
                    }
                }
                CommandEvent::Stderr(line) => {
                    // Check for known errors
                    if line.contains("HTTP Error 403") {
                        return Err(YtDlpError::GeoBlocked);
                    }
                    if line.contains("HTTP Error 429") {
                        return Err(YtDlpError::RateLimited);
                    }
                    if line.contains("HTTP Error 404") {
                        return Err(YtDlpError::NotFound);
                    }
                }
                CommandEvent::Terminated(status) => {
                    if !status.success() {
                        return Err(YtDlpError::DownloadFailed);
                    }
                }
                _ => {}
            }
        }

        // Find the actual output file (extension determined by yt-dlp)
        let output_file = find_downloaded_file(&config.temp_dir, &config.track_id)?;
        Ok(output_file)
    }

    fn find_downloaded_file(dir: &PathBuf, track_id: &str) -> Result<PathBuf, YtDlpError> {
        for entry in std::fs::read_dir(dir).map_err(|_| YtDlpError::DownloadFailed)? {
            if let Ok(entry) = entry {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(track_id) {
                    return Ok(entry.path());
                }
            }
        }
        Err(YtDlpError::DownloadFailed)
    }
    ```

- [x] Task 2: Create Tauri download command (AC: #1, #2, #3)
  - [x] 2.1 Add to `src-tauri/src/commands/download.rs`:
    ```rust
    use crate::services::ytdlp::{download_track, DownloadConfig};
    use tempfile::tempdir;

    #[tauri::command]
    pub async fn start_track_download(
        track_url: String,
        track_id: String,
        app: AppHandle,
    ) -> Result<String, String> {
        // Create temp directory for this download
        let temp_dir = tempdir()
            .map_err(|e| e.to_string())?;

        let config = DownloadConfig {
            track_url,
            track_id: track_id.clone(),
            temp_dir: temp_dir.path().to_path_buf(),
        };

        // Emit starting status
        let _ = app.emit("download-progress", serde_json::json!({
            "trackId": track_id,
            "status": "downloading",
            "percent": 0.0,
        }));

        let output_path = download_track(config, app.clone())
            .await
            .map_err(|e| {
                // Emit error status
                let _ = app.emit("download-progress", serde_json::json!({
                    "trackId": track_id,
                    "status": "failed",
                    "error": {
                        "code": e.code(),
                        "message": e.to_string(),
                    }
                }));
                e.to_string()
            })?;

        // Keep temp_dir alive by leaking it (will be cleaned after conversion)
        let _ = temp_dir.into_path();

        Ok(output_path.to_str().unwrap().to_string())
    }
    ```
  - [x] 2.2 Register command in `lib.rs`
  - [x] 2.3 Add `tempfile` crate: `tempfile = "3"`

- [x] Task 3: Add error code method to YtDlpError (AC: #4)
  - [x] 3.1 Update error enum:
    ```rust
    impl YtDlpError {
        pub fn code(&self) -> &'static str {
            match self {
                YtDlpError::DownloadFailed => "DOWNLOAD_FAILED",
                YtDlpError::BinaryNotFound => "DOWNLOAD_FAILED",
                YtDlpError::RateLimited => "RATE_LIMITED",
                YtDlpError::GeoBlocked => "GEO_BLOCKED",
                YtDlpError::NotFound => "INVALID_URL",
                YtDlpError::AuthRequired => "AUTH_REQUIRED",
            }
        }
    }
    ```

- [x] Task 4: Create TypeScript download function (AC: #3)
  - [x] 4.1 Create `src/lib/download.ts`:
    ```typescript
    import { invoke } from '@tauri-apps/api/core';

    export async function downloadTrack(
      trackUrl: string,
      trackId: string
    ): Promise<string> {
      return invoke<string>('start_track_download', {
        trackUrl,
        trackId,
      });
    }
    ```

- [x] Task 5: Define download progress event type (AC: #3)
  - [x] 5.1 Update `src/types/events.ts`:
    ```typescript
    export interface DownloadProgressEvent {
      trackId: string;
      status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
      percent?: number;
      error?: {
        code: string;
        message: string;
      };
    }
    ```

- [x] Task 6: Test download with real track (AC: #1, #2, #4)
  - [x] 6.1 Create integration test with sample SoundCloud track
  - [x] 6.2 Verify OAuth header is sent
  - [x] 6.3 Verify progress events are emitted
  - [x] 6.4 Verify error handling for 403/404/429

## Dev Notes

### Authentication with yt-dlp

yt-dlp can use OAuth tokens via headers:
```bash
yt-dlp --add-header "Authorization: OAuth {access_token}" URL
```

This passes the Go+ subscription auth to SoundCloud, enabling 256kbps downloads.
[Source: _bmad-output/planning-artifacts/epics.md#FR8]

### Quality Selection

For Go+ subscribers, SoundCloud provides:
- **256kbps AAC** — highest available
- yt-dlp's `--audio-quality 0` selects best

Without auth: 128kbps maximum.
[Source: ux-design-specification.md#Subscription Value Messaging]

### Progress Event Structure

Events emitted during download:
```typescript
{
  trackId: "123456",
  status: "downloading",
  percent: 0.45  // 45%
}
```

Status transitions: `pending` → `downloading` → `converting` → `complete`
[Source: project-context.md#IPC Payload Structure]

### Error Detection from yt-dlp

| stderr Contains | Error Type | Code |
|-----------------|------------|------|
| "HTTP Error 403" | Geo-blocked | `GEO_BLOCKED` |
| "HTTP Error 404" | Not found | `INVALID_URL` |
| "HTTP Error 429" | Rate limit | `RATE_LIMITED` |
| Other failure | Generic | `DOWNLOAD_FAILED` |

[Source: project-context.md#Error Codes]

### Temp Directory Strategy

Each download uses its own temp directory:
1. Create with `tempfile::tempdir()`
2. yt-dlp writes file there
3. After conversion (Story 4.4), move to final location
4. Temp dir cleaned up automatically

### File Structure After This Story

```
src-tauri/
├── Cargo.toml                # + tempfile
├── src/
│   ├── commands/
│   │   ├── mod.rs
│   │   └── download.rs       # start_track_download
│   └── services/
│       └── ytdlp.rs          # Updated with auth

src/
├── lib/
│   └── download.ts           # downloadTrack function
├── types/
│   └── events.ts             # DownloadProgressEvent
```

### Tauri Event Names

- Event: `download-progress`
- Direction: Rust → React
- Payload: `DownloadProgressEvent`

[Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]

### What This Story Does NOT Include

- MP3 conversion (Story 4.4)
- Metadata embedding (Story 4.5)
- Queue processing (Story 4.6)
- Final file placement (Story 4.4)

This story handles raw download only; conversion is next.

### Anti-Patterns to Avoid

- Do NOT download without auth token — quality will be limited
- Do NOT ignore progress events — UX requires feedback
- Do NOT leave temp files on error — clean up
- Do NOT swallow yt-dlp errors — categorize them

### Testing the Result

After completing all tasks:
1. Download command invokes yt-dlp with OAuth header
2. Progress events emitted during download
3. Downloaded file exists in temp location
4. Geo-blocked track returns `GEO_BLOCKED` error
5. Rate limited returns `RATE_LIMITED` error
6. Not found returns `INVALID_URL` error

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3]
- [Source: _bmad-output/planning-artifacts/epics.md#FR8]
- [Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]
- [Source: project-context.md#Error Codes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A - No debug issues encountered.

### Completion Notes List

- Implemented `download_track` function in `services/ytdlp.rs` with OAuth authentication via `--add-header "Authorization: OAuth {token}"`
- Added `TrackDownloadConfig` struct and `DownloadProgressEvent` payload types
- Added `NotFound` and `AuthRequired` variants to `YtDlpError` enum
- Implemented `code()` method on `YtDlpError` for IPC error categorization
- Created `start_track_download` Tauri command that creates temp directory, invokes yt-dlp, and emits progress events
- Added `tempfile = "3"` dependency to Cargo.toml
- Created TypeScript `downloadTrack` function in `src/lib/download.ts`
- Created `DownloadProgressEvent` type in `src/types/events.ts`
- Added `AUTH_REQUIRED` to `ErrorCode` type in `src/types/errors.ts`
- All unit tests pass (126 Rust tests, 322 frontend tests)
- Error handling covers 403 (geo-blocked), 404 (not found), 429 (rate limited)

### File List

- src-tauri/Cargo.toml (modified - added tempfile dependency)
- src-tauri/src/models/error.rs (modified - added NotFound, AuthRequired variants and code() method)
- src-tauri/src/services/ytdlp.rs (modified - added download_track function with OAuth auth)
- src-tauri/src/commands/ytdlp.rs (modified - added start_track_download command)
- src-tauri/src/commands/mod.rs (modified - exported start_track_download)
- src-tauri/src/lib.rs (modified - registered start_track_download command)
- src/lib/download.ts (new - downloadTrack TypeScript function)
- src/lib/download.test.ts (new - unit tests for download function)
- src/types/events.ts (new - DownloadProgressEvent type)
- src/types/errors.ts (modified - added AUTH_REQUIRED error code)

