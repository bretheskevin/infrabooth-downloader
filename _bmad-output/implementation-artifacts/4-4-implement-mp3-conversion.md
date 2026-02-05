# Story 4.4: Implement MP3 Conversion Pipeline

Status: ready-for-dev

## Story

As a **user**,
I want **my downloaded tracks converted to MP3**,
so that **they're compatible with all my devices and players**.

## Acceptance Criteria

1. **Given** FFmpeg is configured from Story 4.2
   **When** an AAC file needs conversion (FR9)
   **Then** FFmpeg is invoked with appropriate arguments
   **And** the output format is MP3
   **And** quality is preserved (high bitrate encoding)

2. **Given** FFmpeg converts a file
   **When** the conversion completes
   **Then** the MP3 file is created in the output location
   **And** the temporary AAC file is cleaned up
   **And** the conversion maintains audio quality

3. **Given** conversion is in progress
   **When** FFmpeg outputs progress
   **Then** progress can be parsed (if needed for long files)
   **And** the UI can indicate conversion status

4. **Given** conversion fails
   **When** FFmpeg returns an error
   **Then** the error is logged with details
   **And** the original file is preserved if possible
   **And** a user-friendly error is returned

## Tasks / Subtasks

- [ ] Task 1: Create conversion pipeline function (AC: #1, #2)
  - [ ] 1.1 Update `src-tauri/src/services/ffmpeg.rs`:
    ```rust
    use crate::models::error::FfmpegError;
    use std::path::PathBuf;
    use tauri::{AppHandle, Manager};

    pub struct ConversionConfig {
        pub input_path: PathBuf,
        pub output_dir: PathBuf,
        pub filename: String,  // Without extension
        pub track_id: String,
    }

    pub async fn convert_to_mp3(
        config: ConversionConfig,
        app: AppHandle,
    ) -> Result<PathBuf, FfmpegError> {
        let output_path = config.output_dir.join(format!("{}.mp3", config.filename));

        // Emit converting status
        let _ = app.emit("download-progress", serde_json::json!({
            "trackId": config.track_id,
            "status": "converting",
            "percent": 0.0,
        }));

        let (mut rx, _child) = Command::new_sidecar("ffmpeg")
            .expect("ffmpeg sidecar")
            .args([
                "-i", config.input_path.to_str().unwrap(),
                "-vn",                      // No video
                "-acodec", "libmp3lame",    // MP3 encoder
                "-ab", "320k",              // High quality bitrate
                "-ar", "44100",             // Standard sample rate
                "-map_metadata", "0",       // Preserve metadata
                "-id3v2_version", "3",      // ID3v2.3 tags
                "-y",                       // Overwrite
                "-progress", "pipe:1",      // Progress output
                output_path.to_str().unwrap(),
            ])
            .spawn()
            .map_err(|_| FfmpegError::BinaryNotFound)?;

        let mut duration: Option<f32> = None;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    // Parse progress
                    if let Some((current, total)) = parse_ffmpeg_progress(&line, &mut duration) {
                        let progress = if total > 0.0 { current / total } else { 0.0 };
                        let _ = app.emit("download-progress", serde_json::json!({
                            "trackId": config.track_id,
                            "status": "converting",
                            "percent": progress.min(1.0),
                        }));
                    }
                }
                CommandEvent::Stderr(line) => {
                    // FFmpeg outputs metadata to stderr
                    if line.contains("Duration:") {
                        duration = parse_duration_from_line(&line);
                    }
                }
                CommandEvent::Terminated(status) => {
                    if !status.success() {
                        return Err(FfmpegError::ConversionFailed);
                    }
                }
                _ => {}
            }
        }

        // Verify output exists
        if !output_path.exists() {
            return Err(FfmpegError::OutputError);
        }

        // Clean up input file
        let _ = std::fs::remove_file(&config.input_path);

        Ok(output_path)
    }

    fn parse_ffmpeg_progress(line: &str, duration: &mut Option<f32>) -> Option<(f32, f32)> {
        if line.starts_with("out_time_ms=") {
            if let Ok(ms) = line[12..].trim().parse::<i64>() {
                let current = ms as f32 / 1_000_000.0;
                return Some((current, duration.unwrap_or(0.0)));
            }
        }
        None
    }

    fn parse_duration_from_line(line: &str) -> Option<f32> {
        // "Duration: 00:03:45.67, ..."
        if let Some(start) = line.find("Duration: ") {
            let end = line[start + 10..].find(',').unwrap_or(11);
            let duration_str = &line[start + 10..start + 10 + end];
            return parse_duration(duration_str);
        }
        None
    }

    fn parse_duration(s: &str) -> Option<f32> {
        let parts: Vec<&str> = s.trim().split(':').collect();
        if parts.len() == 3 {
            let hours: f32 = parts[0].parse().ok()?;
            let minutes: f32 = parts[1].parse().ok()?;
            let seconds: f32 = parts[2].parse().ok()?;
            return Some(hours * 3600.0 + minutes * 60.0 + seconds);
        }
        None
    }
    ```

- [ ] Task 2: Create combined download+convert function (AC: #1, #2)
  - [ ] 2.1 Create `src-tauri/src/services/pipeline.rs`:
    ```rust
    use crate::services::ytdlp::{download_track, DownloadConfig};
    use crate::services::ffmpeg::{convert_to_mp3, ConversionConfig};
    use std::path::PathBuf;
    use tempfile::tempdir;

    pub struct PipelineConfig {
        pub track_url: String,
        pub track_id: String,
        pub output_dir: PathBuf,
        pub filename: String,
    }

    pub async fn download_and_convert(
        config: PipelineConfig,
        app: AppHandle,
    ) -> Result<PathBuf, PipelineError> {
        // Create temp directory
        let temp_dir = tempdir().map_err(|_| PipelineError::TempDirError)?;

        // Download
        let download_config = DownloadConfig {
            track_url: config.track_url,
            track_id: config.track_id.clone(),
            temp_dir: temp_dir.path().to_path_buf(),
        };

        let downloaded_path = download_track(download_config, app.clone())
            .await
            .map_err(PipelineError::Download)?;

        // Convert
        let convert_config = ConversionConfig {
            input_path: downloaded_path,
            output_dir: config.output_dir,
            filename: config.filename,
            track_id: config.track_id,
        };

        let output_path = convert_to_mp3(convert_config, app)
            .await
            .map_err(PipelineError::Conversion)?;

        // Temp dir cleaned up automatically

        Ok(output_path)
    }
    ```

- [ ] Task 3: Update Tauri command to use pipeline (AC: #1, #2, #3)
  - [ ] 3.1 Update `src-tauri/src/commands/download.rs`:
    ```rust
    use crate::services::pipeline::{download_and_convert, PipelineConfig};
    use crate::stores::settingsStore;

    #[tauri::command]
    pub async fn download_track_full(
        track_url: String,
        track_id: String,
        filename: String,
        app: AppHandle,
    ) -> Result<String, String> {
        // Get download path from settings (or default)
        let output_dir = get_download_path(&app)?;

        let config = PipelineConfig {
            track_url,
            track_id: track_id.clone(),
            output_dir,
            filename,
        };

        let output_path = download_and_convert(config, app.clone())
            .await
            .map_err(|e| {
                // Emit error
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

        // Emit complete
        let _ = app.emit("download-progress", serde_json::json!({
            "trackId": track_id,
            "status": "complete",
            "percent": 1.0,
        }));

        Ok(output_path.to_str().unwrap().to_string())
    }

    fn get_download_path(app: &AppHandle) -> Result<PathBuf, String> {
        // Try to get from app state, fall back to downloads folder
        app.path()
            .download_dir()
            .map_err(|e| e.to_string())
    }
    ```

- [ ] Task 4: Define pipeline error type (AC: #4)
  - [ ] 4.1 Add to `src-tauri/src/models/error.rs`:
    ```rust
    #[derive(Debug, thiserror::Error)]
    pub enum PipelineError {
        #[error("Download failed: {0}")]
        Download(#[from] YtDlpError),
        #[error("Conversion failed: {0}")]
        Conversion(#[from] FfmpegError),
        #[error("Failed to create temp directory")]
        TempDirError,
    }

    impl PipelineError {
        pub fn code(&self) -> &'static str {
            match self {
                PipelineError::Download(e) => e.code(),
                PipelineError::Conversion(_) => "CONVERSION_FAILED",
                PipelineError::TempDirError => "DOWNLOAD_FAILED",
            }
        }
    }
    ```

- [ ] Task 5: Update TypeScript types and functions (AC: #3)
  - [ ] 5.1 Update `src/lib/download.ts`:
    ```typescript
    export async function downloadAndConvertTrack(
      trackUrl: string,
      trackId: string,
      filename: string
    ): Promise<string> {
      return invoke<string>('download_track_full', {
        trackUrl,
        trackId,
        filename,
      });
    }
    ```

- [ ] Task 6: Test full pipeline (AC: #1, #2, #3, #4)
  - [ ] 6.1 Test with real SoundCloud track
  - [ ] 6.2 Verify AAC → MP3 conversion quality
  - [ ] 6.3 Verify temp file cleanup
  - [ ] 6.4 Verify progress events: downloading → converting → complete
  - [ ] 6.5 Test error scenarios (network, conversion failure)

## Dev Notes

### FFmpeg Quality Settings

For high-quality MP3 conversion:
```bash
-acodec libmp3lame  # LAME MP3 encoder
-ab 320k            # 320kbps (highest MP3 bitrate)
-ar 44100           # 44.1kHz sample rate (CD quality)
```

Source is 256kbps AAC; 320kbps MP3 preserves quality.
[Source: _bmad-output/planning-artifacts/epics.md#FR9]

### Status Transitions

Full pipeline status flow:
```
pending → downloading → converting → complete
                ↓            ↓
              failed       failed
```

Each transition emits `download-progress` event.

### Progress During Conversion

For short tracks (< 5 min), conversion is nearly instant.
Progress is still emitted for consistency and longer files.

### Temp File Handling

```
1. Create temp dir
2. yt-dlp writes: temp_dir/{track_id}.aac
3. FFmpeg reads temp, writes: output_dir/{filename}.mp3
4. FFmpeg deletes temp file
5. temp dir auto-cleaned on drop
```

### File Structure After This Story

```
src-tauri/
├── src/
│   ├── commands/
│   │   └── download.rs       # download_track_full
│   ├── services/
│   │   ├── ytdlp.rs
│   │   ├── ffmpeg.rs         # Updated
│   │   └── pipeline.rs       # New - combined flow
│   └── models/
│       └── error.rs          # + PipelineError

src/
├── lib/
│   └── download.ts           # downloadAndConvertTrack
```

### Output Path Handling

1. Get user's download path from settings
2. Fall back to system Downloads folder
3. Create filename from metadata: `{artist} - {title}.mp3`
4. Handle duplicates (added in Story 6.3)

### What This Story Does NOT Include

- Metadata embedding (Story 4.5)
- Queue processing (Story 4.6)
- Filename sanitization (Story 6.3)
- Duplicate handling (Story 6.3)

This story completes download+convert; metadata is next.

### Anti-Patterns to Avoid

- Do NOT skip the conversion step — AAC compatibility varies
- Do NOT use low bitrate — preserve quality
- Do NOT leave temp files on success — clean up
- Do NOT swallow conversion errors — surface them

### Testing the Result

After completing all tasks:
1. Full pipeline: URL → download → convert → MP3
2. Progress events for each stage
3. Output file is valid MP3 at 320kbps
4. Temp files cleaned up
5. Errors properly categorized and emitted
6. Original AAC quality preserved in MP3

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4]
- [Source: _bmad-output/planning-artifacts/epics.md#FR9]
- [Source: architecture/implementation-patterns-consistency-rules.md#Tauri Events]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

