# Story 4.1: Configure yt-dlp Sidecar Binary

Status: review

## Story

As a **developer**,
I want **yt-dlp bundled as a Tauri sidecar binary**,
so that **the app can extract audio from SoundCloud without external dependencies**.

## Acceptance Criteria

1. **Given** the Tauri project
   **When** configuring sidecar binaries
   **Then** yt-dlp binaries are placed in `/src-tauri/binaries/` with platform suffixes:
   - `yt-dlp-x86_64-pc-windows-msvc.exe`
   - `yt-dlp-aarch64-apple-darwin`
   - `yt-dlp-x86_64-apple-darwin`

2. **Given** sidecar binaries are configured
   **When** examining `tauri.conf.json`
   **Then** the sidecar configuration references yt-dlp
   **And** the correct binary is selected based on target platform

3. **Given** yt-dlp is bundled (NFR11)
   **When** verifying the binary
   **Then** the version is pinned (documented in project)
   **And** a checksum verification can be performed
   **And** the binary is not downloaded at runtime

4. **Given** the sidecar is configured
   **When** invoking yt-dlp from Rust
   **Then** the `Command::new_sidecar("yt-dlp")` API works
   **And** the binary executes with provided arguments
   **And** stdout/stderr are capturable

## Tasks / Subtasks

- [x] Task 1: Download and prepare yt-dlp binaries (AC: #1, #3)
  - [x] 1.1 Create `/src-tauri/binaries/` directory
  - [x] 1.2 Download yt-dlp releases from https://github.com/yt-dlp/yt-dlp/releases:
    - Windows: `yt-dlp.exe`
    - macOS Intel: `yt-dlp_macos`
    - macOS ARM: `yt-dlp_macos` (universal binary)
  - [x] 1.3 Rename binaries with Tauri target triple suffixes:
    ```
    yt-dlp-x86_64-pc-windows-msvc.exe
    yt-dlp-aarch64-apple-darwin
    yt-dlp-x86_64-apple-darwin
    ```
  - [x] 1.4 Make macOS binaries executable: `chmod +x yt-dlp-*-darwin`
  - [x] 1.5 Document pinned version in `BINARY_VERSIONS.md`

- [x] Task 2: Generate and store checksums (AC: #3)
  - [x] 2.1 Create `src-tauri/binaries/checksums.txt`:
    ```
    sha256sum yt-dlp-x86_64-pc-windows-msvc.exe
    sha256sum yt-dlp-aarch64-apple-darwin
    sha256sum yt-dlp-x86_64-apple-darwin
    ```
  - [x] 2.2 Add checksum verification script (optional CI step)

- [x] Task 3: Configure Tauri sidecar (AC: #2)
  - [x] 3.1 Update `src-tauri/tauri.conf.json`:
    ```json
    {
      "bundle": {
        "externalBin": [
          "binaries/yt-dlp"
        ]
      }
    }
    ```
  - [x] 3.2 Verify Tauri resolves correct binary per platform

- [x] Task 4: Create yt-dlp service wrapper (AC: #4)
  - [x] 4.1 Create `src-tauri/src/services/ytdlp.rs`:
    ```rust
    use tauri::api::process::{Command, CommandEvent};
    use std::path::PathBuf;

    pub struct YtDlpConfig {
        pub url: String,
        pub output_path: PathBuf,
        pub cookies: Option<String>,
        pub format: Option<String>,
    }

    pub async fn download_audio(
        config: YtDlpConfig,
        on_progress: impl Fn(f32) + Send + 'static,
    ) -> Result<PathBuf, YtDlpError> {
        let (mut rx, _child) = Command::new_sidecar("yt-dlp")
            .expect("failed to create sidecar command")
            .args([
                "--no-playlist",
                "-x",  // Extract audio
                "--audio-format", "best",
                "--audio-quality", "0",
                "-o", config.output_path.to_str().unwrap(),
                &config.url,
            ])
            .spawn()
            .expect("failed to spawn yt-dlp");

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    if let Some(progress) = parse_progress(&line) {
                        on_progress(progress);
                    }
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("yt-dlp stderr: {}", line);
                }
                CommandEvent::Terminated(status) => {
                    if !status.success() {
                        return Err(YtDlpError::DownloadFailed);
                    }
                }
                _ => {}
            }
        }

        Ok(config.output_path)
    }

    fn parse_progress(line: &str) -> Option<f32> {
        // Parse yt-dlp progress output: "[download]  50.0% of 5.00MiB"
        if line.contains("[download]") && line.contains("%") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pct_str) = parts.get(1) {
                if let Ok(pct) = pct_str.trim_end_matches('%').parse::<f32>() {
                    return Some(pct / 100.0);
                }
            }
        }
        None
    }
    ```
  - [x] 4.2 Add to `src-tauri/src/services/mod.rs`

- [x] Task 5: Define error types (AC: #4)
  - [x] 5.1 Add to `src-tauri/src/models/error.rs`:
    ```rust
    #[derive(Debug, thiserror::Error, Serialize)]
    pub enum YtDlpError {
        #[error("Download failed")]
        DownloadFailed,
        #[error("Binary not found")]
        BinaryNotFound,
        #[error("Rate limited")]
        RateLimited,
        #[error("Geo-blocked content")]
        GeoBlocked,
        #[error("Invalid URL")]
        InvalidUrl,
    }
    ```

- [x] Task 6: Test sidecar execution (AC: #4)
  - [x] 6.1 Create test command:
    ```rust
    #[tauri::command]
    pub async fn test_ytdlp() -> Result<String, String> {
        let (mut rx, _) = Command::new_sidecar("yt-dlp")
            .expect("sidecar")
            .args(["--version"])
            .spawn()
            .expect("spawn");

        let mut output = String::new();
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                output = line;
            }
        }
        Ok(output)
    }
    ```
  - [x] 6.2 Verify version output in dev mode
  - [x] 6.3 Verify in built app (production bundle)

## Dev Notes

### Tauri Sidecar Pattern

Tauri sidecars are external binaries bundled with the app:
- Placed in `src-tauri/binaries/`
- Named with target triple suffix for cross-platform
- Referenced in `tauri.conf.json` under `bundle.externalBin`
- Invoked via `Command::new_sidecar("binary-name")`

[Source: architecture/core-architectural-decisions.md#Binary Management]

### Binary Naming Convention

Tauri expects specific suffixes for cross-platform binaries:

| Platform | Target Triple | Example |
|----------|---------------|---------|
| Windows x64 | `x86_64-pc-windows-msvc` | `yt-dlp-x86_64-pc-windows-msvc.exe` |
| macOS Intel | `x86_64-apple-darwin` | `yt-dlp-x86_64-apple-darwin` |
| macOS ARM | `aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` |

### yt-dlp Version Pinning

**CRITICAL:** Pin yt-dlp version for reproducible builds (NFR11).

Create `BINARY_VERSIONS.md`:
```markdown
# Binary Versions

## yt-dlp
- Version: 2024.01.01 (example)
- Source: https://github.com/yt-dlp/yt-dlp/releases/tag/2024.01.01
- Checksums: See binaries/checksums.txt
```

[Source: project-context.md#Version Constraints]

### yt-dlp Arguments for SoundCloud

```bash
yt-dlp \
  --no-playlist \        # Don't expand playlist (we handle that)
  -x \                   # Extract audio only
  --audio-format best \  # Best available format
  --audio-quality 0 \    # Best quality
  -o "output.%(ext)s" \  # Output template
  --cookies-from-browser chrome \  # Or use OAuth token
  "https://soundcloud.com/..."
```

For authenticated access, we'll pass cookies or use `--add-header` with OAuth token.

### Progress Parsing

yt-dlp outputs progress to stdout:
```
[download]  50.0% of 5.00MiB at 1.00MiB/s ETA 00:02
[download] 100% of 5.00MiB in 00:05
```

Parse the percentage for progress events.

### File Structure After This Story

```
src-tauri/
├── binaries/
│   ├── yt-dlp-x86_64-pc-windows-msvc.exe
│   ├── yt-dlp-aarch64-apple-darwin
│   ├── yt-dlp-x86_64-apple-darwin
│   └── checksums.txt
├── tauri.conf.json          # + externalBin config
├── src/
│   ├── services/
│   │   ├── mod.rs
│   │   └── ytdlp.rs         # yt-dlp wrapper
│   └── models/
│       └── error.rs         # + YtDlpError
├── BINARY_VERSIONS.md       # Version documentation
```

### Sidecar Permissions

On macOS, the binary must be executable:
```bash
chmod +x src-tauri/binaries/yt-dlp-*-darwin
```

Git should preserve this, but verify after clone.

### What This Story Does NOT Include

- FFmpeg configuration (Story 4.2)
- Actual download command exposed to frontend (Story 4.3)
- MP3 conversion (Story 4.4)
- Queue processing (Story 4.6)

This story sets up the yt-dlp infrastructure only.

### Anti-Patterns to Avoid

- Do NOT download yt-dlp at runtime — bundle it
- Do NOT use system-installed yt-dlp — use sidecar
- Do NOT skip version pinning — reproducibility matters
- Do NOT ignore stderr — it contains error information

### Testing the Result

After completing all tasks:
1. `yt-dlp --version` executes via sidecar
2. Version matches pinned version
3. Binaries exist for all target platforms
4. Checksums match documented values
5. Progress parsing extracts percentage correctly

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- [Source: _bmad-output/planning-artifacts/epics.md#NFR11]
- [Source: architecture/core-architectural-decisions.md#Binary Management]
- [Source: project-context.md#Version Constraints]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Tauri 2.0 uses `Vec<u8>` for CommandEvent stdout/stderr instead of String - required conversion via `String::from_utf8_lossy`
- yt-dlp_macos is a universal binary that works on both Intel and ARM Macs

### Completion Notes List

- Downloaded yt-dlp v2026.02.04 binaries for Windows x64, macOS Intel, and macOS ARM
- Created checksums.txt with SHA256 hashes for binary verification
- Configured Tauri sidecar in tauri.conf.json under `bundle.externalBin`
- Created ytdlp.rs service with download_audio() and get_version() functions
- Added YtDlpError enum with proper error codes: DOWNLOAD_FAILED, BINARY_NOT_FOUND, RATE_LIMITED, GEO_BLOCKED, INVALID_URL
- Created test_ytdlp command to verify sidecar execution
- Added progress parsing for yt-dlp download output
- 103 unit tests pass including 7 new ytdlp tests and 10 new YtDlpError tests

### File List

**New Files:**
- src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe
- src-tauri/binaries/yt-dlp-aarch64-apple-darwin
- src-tauri/binaries/yt-dlp-x86_64-apple-darwin
- src-tauri/binaries/checksums.txt
- src-tauri/src/services/ytdlp.rs
- src-tauri/src/commands/ytdlp.rs
- BINARY_VERSIONS.md

**Modified Files:**
- src-tauri/tauri.conf.json (added externalBin configuration)
- src-tauri/src/services/mod.rs (added ytdlp module)
- src-tauri/src/models/error.rs (added YtDlpError enum and tests)
- src-tauri/src/models/mod.rs (exported YtDlpError)
- src-tauri/src/commands/mod.rs (added ytdlp module and test_ytdlp export)
- src-tauri/src/lib.rs (added test_ytdlp to invoke_handler)

### Change Log

- 2026-02-09: Implemented Story 4.1 - Configure yt-dlp Sidecar Binary

