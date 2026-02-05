# Story 4.2: Configure FFmpeg Sidecar Binary

Status: ready-for-dev

## Story

As a **developer**,
I want **FFmpeg bundled as a Tauri sidecar binary**,
so that **the app can convert audio formats without external dependencies**.

## Acceptance Criteria

1. **Given** the Tauri project
   **When** configuring sidecar binaries
   **Then** FFmpeg binaries are placed in `/src-tauri/binaries/` with platform suffixes:
   - `ffmpeg-x86_64-pc-windows-msvc.exe`
   - `ffmpeg-aarch64-apple-darwin`
   - `ffmpeg-x86_64-apple-darwin`

2. **Given** sidecar binaries are configured
   **When** examining `tauri.conf.json`
   **Then** the sidecar configuration references ffmpeg
   **And** the correct binary is selected based on target platform

3. **Given** FFmpeg is bundled (NFR12)
   **When** verifying the binary
   **Then** the version is pinned (documented in project)
   **And** a checksum verification can be performed
   **And** the binary is not downloaded at runtime

4. **Given** the sidecar is configured
   **When** invoking FFmpeg from Rust
   **Then** the `Command::new_sidecar("ffmpeg")` API works
   **And** the binary executes with provided arguments
   **And** conversion operations complete successfully

## Tasks / Subtasks

- [ ] Task 1: Download and prepare FFmpeg binaries (AC: #1, #3)
  - [ ] 1.1 Download static FFmpeg builds:
    - Windows: https://www.gyan.dev/ffmpeg/builds/ (essentials build)
    - macOS: https://evermeet.cx/ffmpeg/ or build from source
  - [ ] 1.2 Extract only the `ffmpeg` binary (not ffprobe, ffplay)
  - [ ] 1.3 Rename binaries with Tauri target triple suffixes:
    ```
    ffmpeg-x86_64-pc-windows-msvc.exe
    ffmpeg-aarch64-apple-darwin
    ffmpeg-x86_64-apple-darwin
    ```
  - [ ] 1.4 Make macOS binaries executable: `chmod +x ffmpeg-*-darwin`
  - [ ] 1.5 Document pinned version in `BINARY_VERSIONS.md`

- [ ] Task 2: Generate and store checksums (AC: #3)
  - [ ] 2.1 Add to `src-tauri/binaries/checksums.txt`:
    ```
    sha256sum ffmpeg-x86_64-pc-windows-msvc.exe
    sha256sum ffmpeg-aarch64-apple-darwin
    sha256sum ffmpeg-x86_64-apple-darwin
    ```

- [ ] Task 3: Configure Tauri sidecar (AC: #2)
  - [ ] 3.1 Update `src-tauri/tauri.conf.json`:
    ```json
    {
      "bundle": {
        "externalBin": [
          "binaries/yt-dlp",
          "binaries/ffmpeg"
        ]
      }
    }
    ```

- [ ] Task 4: Create FFmpeg service wrapper (AC: #4)
  - [ ] 4.1 Create `src-tauri/src/services/ffmpeg.rs`:
    ```rust
    use tauri::api::process::{Command, CommandEvent};
    use std::path::PathBuf;

    pub struct ConversionConfig {
        pub input_path: PathBuf,
        pub output_path: PathBuf,
        pub bitrate: Option<String>,  // e.g., "320k"
    }

    pub async fn convert_to_mp3(
        config: ConversionConfig,
        on_progress: impl Fn(f32) + Send + 'static,
    ) -> Result<PathBuf, FfmpegError> {
        let bitrate = config.bitrate.unwrap_or_else(|| "320k".to_string());

        let (mut rx, _child) = Command::new_sidecar("ffmpeg")
            .expect("failed to create sidecar command")
            .args([
                "-i", config.input_path.to_str().unwrap(),
                "-vn",                    // No video
                "-acodec", "libmp3lame",  // MP3 codec
                "-ab", &bitrate,          // Audio bitrate
                "-ar", "44100",           // Sample rate
                "-y",                     // Overwrite output
                "-progress", "pipe:1",    // Progress to stdout
                config.output_path.to_str().unwrap(),
            ])
            .spawn()
            .expect("failed to spawn ffmpeg");

        let mut duration: Option<f32> = None;
        let mut current_time: f32 = 0.0;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    // Parse progress output
                    if line.starts_with("duration=") {
                        duration = parse_duration(&line[9..]);
                    } else if line.starts_with("out_time_ms=") {
                        if let Ok(ms) = line[12..].trim().parse::<f32>() {
                            current_time = ms / 1_000_000.0;
                            if let Some(dur) = duration {
                                on_progress(current_time / dur);
                            }
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    // FFmpeg outputs info to stderr (normal behavior)
                    // Parse duration from stderr if needed
                    if line.contains("Duration:") {
                        duration = parse_duration_from_stderr(&line);
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

        // Clean up input file
        let _ = std::fs::remove_file(&config.input_path);

        Ok(config.output_path)
    }

    fn parse_duration(s: &str) -> Option<f32> {
        // Parse "HH:MM:SS.ms" format
        let parts: Vec<&str> = s.trim().split(':').collect();
        if parts.len() == 3 {
            let hours: f32 = parts[0].parse().ok()?;
            let minutes: f32 = parts[1].parse().ok()?;
            let seconds: f32 = parts[2].parse().ok()?;
            return Some(hours * 3600.0 + minutes * 60.0 + seconds);
        }
        None
    }

    fn parse_duration_from_stderr(line: &str) -> Option<f32> {
        // "Duration: 00:03:45.67, ..."
        if let Some(start) = line.find("Duration: ") {
            let duration_str = &line[start + 10..start + 21];
            return parse_duration(duration_str);
        }
        None
    }
    ```
  - [ ] 4.2 Add to `src-tauri/src/services/mod.rs`

- [ ] Task 5: Define error types (AC: #4)
  - [ ] 5.1 Add to `src-tauri/src/models/error.rs`:
    ```rust
    #[derive(Debug, thiserror::Error, Serialize)]
    pub enum FfmpegError {
        #[error("Conversion failed")]
        ConversionFailed,
        #[error("Binary not found")]
        BinaryNotFound,
        #[error("Invalid input file")]
        InvalidInput,
        #[error("Output path error")]
        OutputError,
    }
    ```

- [ ] Task 6: Test sidecar execution (AC: #4)
  - [ ] 6.1 Create test command:
    ```rust
    #[tauri::command]
    pub async fn test_ffmpeg() -> Result<String, String> {
        let (mut rx, _) = Command::new_sidecar("ffmpeg")
            .expect("sidecar")
            .args(["-version"])
            .spawn()
            .expect("spawn");

        let mut output = String::new();
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                output = line;
                break;
            }
        }
        Ok(output)
    }
    ```
  - [ ] 6.2 Verify version output in dev mode
  - [ ] 6.3 Test actual conversion with sample file

## Dev Notes

### FFmpeg Binary Sources

**Windows:**
- https://www.gyan.dev/ffmpeg/builds/ (recommended)
- Use "essentials" build for smaller size
- Only need `ffmpeg.exe`, not full package

**macOS:**
- https://evermeet.cx/ffmpeg/ (pre-built)
- Or use Homebrew and copy: `cp $(which ffmpeg) ./`
- Universal binary works for both Intel and ARM

### Binary Size Considerations

FFmpeg binaries are large (~80-100MB each). Consider:
- Using essentials/minimal builds
- Stripping debug symbols
- Documenting impact on app bundle size

Full app bundle (with both sidecars) may be ~200-300MB.

### FFmpeg Arguments for MP3 Conversion

```bash
ffmpeg \
  -i input.aac \           # Input file
  -vn \                    # No video stream
  -acodec libmp3lame \     # MP3 encoder
  -ab 320k \               # 320kbps bitrate (high quality)
  -ar 44100 \              # 44.1kHz sample rate
  -y \                     # Overwrite without asking
  -progress pipe:1 \       # Progress output
  output.mp3
```

### Progress Tracking

FFmpeg with `-progress pipe:1` outputs:
```
frame=N/A
fps=N/A
stream_0_0_q=-1.0
bitrate=N/A
total_size=N/A
out_time_us=123456
out_time_ms=123
out_time=00:00:00.123456
dup_frames=0
drop_frames=0
speed=1.23x
progress=continue
```

Parse `out_time_ms` and compare to duration for percentage.

### File Structure After This Story

```
src-tauri/
├── binaries/
│   ├── yt-dlp-*              # From 4.1
│   ├── ffmpeg-x86_64-pc-windows-msvc.exe
│   ├── ffmpeg-aarch64-apple-darwin
│   ├── ffmpeg-x86_64-apple-darwin
│   └── checksums.txt         # Updated
├── tauri.conf.json           # + ffmpeg in externalBin
├── src/
│   └── services/
│       ├── ytdlp.rs          # From 4.1
│       └── ffmpeg.rs         # FFmpeg wrapper
├── BINARY_VERSIONS.md        # + FFmpeg version
```

### Version Documentation

Update `BINARY_VERSIONS.md`:
```markdown
## FFmpeg
- Version: 6.1 (example)
- Source: https://www.gyan.dev/ffmpeg/builds/
- Build: essentials
- Checksums: See binaries/checksums.txt
```

### What This Story Does NOT Include

- Metadata embedding (Story 4.5)
- Integration with download flow (Story 4.3)
- Queue processing (Story 4.6)

This story sets up FFmpeg infrastructure only.

### Cleanup Behavior

After successful conversion:
- Input file (AAC) is deleted
- Only output file (MP3) remains
- Failure preserves input file for debugging

### Anti-Patterns to Avoid

- Do NOT use system FFmpeg — use bundled sidecar
- Do NOT skip version pinning — reproducibility matters
- Do NOT include unnecessary FFmpeg components (ffprobe, ffplay)
- Do NOT ignore FFmpeg stderr — it contains useful info

### Testing the Result

After completing all tasks:
1. `ffmpeg -version` executes via sidecar
2. Version matches pinned version
3. Binaries exist for all target platforms
4. Checksums match documented values
5. Sample AAC → MP3 conversion succeeds
6. Progress callback receives updates

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: _bmad-output/planning-artifacts/epics.md#NFR12]
- [Source: architecture/core-architectural-decisions.md#Binary Management]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

