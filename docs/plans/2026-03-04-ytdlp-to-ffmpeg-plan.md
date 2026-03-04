# yt-dlp to ffmpeg Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace yt-dlp sidecar with native SoundCloud stream resolution + ffmpeg-based downloading.

**Architecture:** New `stream.rs` resolves SoundCloud transcodings → CDN URLs. New `downloader.rs` uses ffmpeg sidecar to download + convert to MP3. `playlist.rs` extended to return transcodings. All yt-dlp code and binaries removed.

**Tech Stack:** Rust, Tauri 2.x, reqwest, ffmpeg sidecar, SoundCloud API v2

---

### Task 1: Rename YtDlpError → DownloadError in error model

**Files:**
- Modify: `src-tauri/src/models/error.rs`

**Step 1: Update the enum name and variants**

In `src-tauri/src/models/error.rs`, rename `YtDlpError` to `DownloadError` throughout the file:
- The enum declaration: `pub enum YtDlpError` → `pub enum DownloadError`
- The `HasErrorCode` impl: `impl HasErrorCode for YtDlpError` → `impl HasErrorCode for DownloadError`
- The `PipelineError::Download` variant: `Download(#[from] YtDlpError)` → `Download(#[from] DownloadError)`
- The `BinaryNotFound` error message: `"yt-dlp binary not found"` → `"Download binary not found"`
- Add new variant: `StreamResolutionFailed(String)` with code `"STREAM_RESOLUTION_FAILED"`
- Update all test function names from `test_ytdlp_*` to `test_download_*`
- Update all test assertions that reference "yt-dlp" strings

**Step 2: Run cargo check to verify**

Run: `cd src-tauri && cargo check 2>&1 | head -50`
Expected: Compilation errors in files that reference `YtDlpError` (this is expected — we'll fix them in subsequent tasks)

**Step 3: Commit**

```bash
git add src-tauri/src/models/error.rs
git commit -m "refactor: rename YtDlpError to DownloadError"
```

---

### Task 2: Update all YtDlpError references across the codebase

**Files:**
- Modify: `src-tauri/src/services/ytdlp.rs`
- Modify: `src-tauri/src/services/ytdlp_errors.rs`
- Modify: `src-tauri/src/services/pipeline.rs`
- Modify: `src-tauri/src/services/queue.rs`
- Modify: `src-tauri/src/services/cancellation.rs`
- Modify: `src-tauri/src/commands/download.rs`

**Step 1: Update all import statements and type references**

In every file that imports or references `YtDlpError`, change to `DownloadError`:
- `use crate::models::error::YtDlpError` → `use crate::models::error::DownloadError`
- All pattern matches: `YtDlpError::*` → `DownloadError::*`
- All function return types: `Result<_, YtDlpError>` → `Result<_, DownloadError>`
- All log messages referencing "yt-dlp" in cancellation.rs

**Step 2: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -50`
Expected: Should compile successfully (all references updated)

**Step 3: Run tests**

Run: `cd src-tauri && cargo test 2>&1 | tail -20`
Expected: All existing tests pass

**Step 4: Commit**

```bash
git add -A src-tauri/src/
git commit -m "refactor: update all YtDlpError references to DownloadError"
```

---

### Task 3: Create stream resolution service

**Files:**
- Create: `src-tauri/src/services/stream.rs`
- Modify: `src-tauri/src/services/mod.rs` (add `pub mod stream;`)

**Step 1: Write the stream.rs module with types and resolution logic**

Create `src-tauri/src/services/stream.rs` with:

```rust
//! SoundCloud stream URL resolution.
//!
//! Resolves track transcodings from SoundCloud API v2 into
//! signed CDN URLs that ffmpeg can download.

use serde::Deserialize;
use crate::models::error::DownloadError;
use crate::services::oauth::CLIENT_ID;

/// Format info from a SoundCloud transcoding entry.
#[derive(Debug, Clone, Deserialize)]
pub struct TranscodingFormat {
    pub protocol: String,
    pub mime_type: String,
}

/// A single transcoding option from SoundCloud's media API.
#[derive(Debug, Clone, Deserialize)]
pub struct Transcoding {
    pub url: String,
    pub preset: String,
    pub format: TranscodingFormat,
    pub quality: String,
    #[serde(default)]
    pub snipped: bool,
}

/// Resolved stream info ready for ffmpeg.
#[derive(Debug, Clone)]
pub struct StreamInfo {
    pub url: String,
    pub is_hls: bool,
    pub quality: String,
    pub preset: String,
}

/// CDN URL response from SoundCloud's media endpoint.
#[derive(Debug, Deserialize)]
struct StreamUrlResponse {
    url: String,
}

/// Select the best transcoding from available options.
///
/// Priority:
/// 1. Progressive streams (simpler for ffmpeg, no segment fetching)
/// 2. HQ quality (256kbps AAC, requires OAuth)
/// 3. MP3 over Opus (native format, no conversion needed)
/// 4. Non-snipped (full track, not preview)
pub fn select_best_transcoding(transcodings: &[Transcoding], has_oauth: bool) -> Option<&Transcoding> {
    if transcodings.is_empty() {
        return None;
    }

    // Filter out snipped (preview) tracks
    let candidates: Vec<&Transcoding> = transcodings.iter()
        .filter(|t| !t.snipped)
        .collect();

    if candidates.is_empty() {
        // Fall back to snipped if that's all we have
        return transcodings.first();
    }

    // If we have OAuth, prefer HQ streams
    if has_oauth {
        // Progressive HQ first
        if let Some(t) = candidates.iter().find(|t|
            t.format.protocol == "progressive" && t.quality == "hq"
        ) {
            return Some(t);
        }
        // HLS HQ
        if let Some(t) = candidates.iter().find(|t|
            t.format.protocol == "hls" && t.quality == "hq"
        ) {
            return Some(t);
        }
    }

    // Progressive MP3 (best standard option)
    if let Some(t) = candidates.iter().find(|t|
        t.format.protocol == "progressive" && t.format.mime_type.contains("mpeg")
    ) {
        return Some(t);
    }

    // Any progressive stream
    if let Some(t) = candidates.iter().find(|t|
        t.format.protocol == "progressive"
    ) {
        return Some(t);
    }

    // HLS MP3
    if let Some(t) = candidates.iter().find(|t|
        t.format.protocol == "hls" && t.format.mime_type.contains("mpeg")
    ) {
        return Some(t);
    }

    // Any HLS stream
    if let Some(t) = candidates.iter().find(|t|
        t.format.protocol == "hls"
    ) {
        return Some(t);
    }

    // Last resort: first non-snipped candidate
    candidates.first().copied()
}

/// Resolve a transcoding API URL to an actual CDN stream URL.
///
/// The transcoding `url` field is an API endpoint, not the stream itself.
/// This function calls that endpoint to get the signed CDN URL.
pub async fn resolve_stream_url(
    transcoding: &Transcoding,
    access_token: Option<&str>,
) -> Result<StreamInfo, DownloadError> {
    let client = reqwest::Client::new();

    // Build URL with client_id
    let separator = if transcoding.url.contains('?') { '&' } else { '?' };
    let url = format!("{}{}client_id={}", transcoding.url, separator, CLIENT_ID);

    let mut request = client.get(&url);

    if let Some(token) = access_token {
        request = request.header("Authorization", format!("OAuth {}", token));
    }

    let response = request.send().await.map_err(|e|
        DownloadError::StreamResolutionFailed(format!("Network error: {}", e))
    )?;

    let status = response.status();

    if status == reqwest::StatusCode::FORBIDDEN {
        return Err(DownloadError::GeoBlocked("Stream access forbidden".to_string()));
    }
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err(DownloadError::AuthRequired("Authentication required for this stream".to_string()));
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(DownloadError::RateLimited);
    }
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(DownloadError::TrackUnavailable("Stream not found".to_string()));
    }

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(DownloadError::StreamResolutionFailed(
            format!("HTTP {}: {}", status, body)
        ));
    }

    let stream_response: StreamUrlResponse = response.json().await.map_err(|e|
        DownloadError::StreamResolutionFailed(format!("Invalid response: {}", e))
    )?;

    Ok(StreamInfo {
        url: stream_response.url,
        is_hls: transcoding.format.protocol == "hls",
        quality: transcoding.quality.clone(),
        preset: transcoding.preset.clone(),
    })
}
```

**Step 2: Register the module**

In `src-tauri/src/services/mod.rs`, add `pub mod stream;`

**Step 3: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -30`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src-tauri/src/services/stream.rs src-tauri/src/services/mod.rs
git commit -m "feat: add SoundCloud stream URL resolution service"
```

---

### Task 4: Write tests for stream selection logic

**Files:**
- Modify: `src-tauri/src/services/stream.rs` (add `#[cfg(test)] mod tests`)

**Step 1: Add unit tests for select_best_transcoding**

Add a `#[cfg(test)]` module at the end of `stream.rs` with tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn make_transcoding(protocol: &str, mime: &str, quality: &str, preset: &str, snipped: bool) -> Transcoding {
        Transcoding {
            url: format!("https://api-v2.soundcloud.com/media/test/stream/{}", protocol),
            preset: preset.to_string(),
            format: TranscodingFormat {
                protocol: protocol.to_string(),
                mime_type: mime.to_string(),
            },
            quality: quality.to_string(),
            snipped,
        }
    }

    #[test]
    fn test_select_prefers_progressive_mp3() {
        let transcodings = vec![
            make_transcoding("hls", "audio/mpeg", "sq", "hls_mp3_128", false),
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0_0", false),
            make_transcoding("hls", "audio/ogg; codecs=\"opus\"", "sq", "hls_opus_64", false),
        ];
        let best = select_best_transcoding(&transcodings, false).unwrap();
        assert_eq!(best.preset, "mp3_0_0");
        assert_eq!(best.format.protocol, "progressive");
    }

    #[test]
    fn test_select_prefers_hq_with_oauth() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0_0", false),
            make_transcoding("hls", "audio/mp4; codecs=\"mp4a.40.2\"", "hq", "aac_hq", false),
        ];
        let best = select_best_transcoding(&transcodings, true).unwrap();
        assert_eq!(best.quality, "hq");
    }

    #[test]
    fn test_select_ignores_hq_without_oauth() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0_0", false),
            make_transcoding("hls", "audio/mp4; codecs=\"mp4a.40.2\"", "hq", "aac_hq", false),
        ];
        let best = select_best_transcoding(&transcodings, false).unwrap();
        assert_eq!(best.preset, "mp3_0_0");
    }

    #[test]
    fn test_select_filters_snipped() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0_0", true),
            make_transcoding("hls", "audio/mpeg", "sq", "hls_mp3_128", false),
        ];
        let best = select_best_transcoding(&transcodings, false).unwrap();
        assert_eq!(best.preset, "hls_mp3_128");
    }

    #[test]
    fn test_select_falls_back_to_snipped_if_all_snipped() {
        let transcodings = vec![
            make_transcoding("progressive", "audio/mpeg", "sq", "mp3_0_0", true),
        ];
        let best = select_best_transcoding(&transcodings, false).unwrap();
        assert_eq!(best.preset, "mp3_0_0");
    }

    #[test]
    fn test_select_empty_returns_none() {
        let transcodings: Vec<Transcoding> = vec![];
        assert!(select_best_transcoding(&transcodings, false).is_none());
    }

    #[test]
    fn test_select_hls_mp3_over_hls_opus() {
        let transcodings = vec![
            make_transcoding("hls", "audio/ogg; codecs=\"opus\"", "sq", "hls_opus_64", false),
            make_transcoding("hls", "audio/mpeg", "sq", "hls_mp3_128", false),
        ];
        let best = select_best_transcoding(&transcodings, false).unwrap();
        assert_eq!(best.preset, "hls_mp3_128");
    }

    #[test]
    fn test_select_progressive_hq_preferred_over_hls_hq() {
        let transcodings = vec![
            make_transcoding("hls", "audio/mp4; codecs=\"mp4a.40.2\"", "hq", "hls_aac_hi", false),
            make_transcoding("progressive", "audio/mp4; codecs=\"mp4a.40.2\"", "hq", "aac_hq", false),
        ];
        let best = select_best_transcoding(&transcodings, true).unwrap();
        assert_eq!(best.format.protocol, "progressive");
    }
}
```

**Step 2: Run the tests**

Run: `cd src-tauri && cargo test stream::tests -- --nocapture 2>&1 | tail -20`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src-tauri/src/services/stream.rs
git commit -m "test: add stream selection unit tests"
```

---

### Task 5: Extend playlist.rs to return transcodings

**Files:**
- Modify: `src-tauri/src/services/playlist.rs`

**Step 1: Add transcodings to RawTrackInfo and TrackInfo**

In `playlist.rs`:

1. Import the `Transcoding` type from `stream.rs`:
   ```rust
   use crate::services::stream::Transcoding;
   ```

2. Add `media` field to `RawTrackInfo`:
   ```rust
   #[derive(Debug, Clone, Deserialize)]
   struct MediaInfo {
       pub transcodings: Vec<Transcoding>,
   }

   struct RawTrackInfo {
       // ... existing fields ...
       pub media: Option<MediaInfo>,
   }
   ```

3. Add `transcodings` to `TrackInfo`:
   ```rust
   pub struct TrackInfo {
       // ... existing fields ...
       #[serde(skip_serializing)]
       pub transcodings: Vec<Transcoding>,
   }
   ```
   Note: `skip_serializing` because transcodings don't need to go to the frontend.

4. Update the `From<RawTrackInfo> for TrackInfo` impl to pass through transcodings:
   ```rust
   transcodings: raw.media.map(|m| m.transcodings).unwrap_or_default(),
   ```

5. Switch API base URL for resolve from `api.soundcloud.com` to `api-v2.soundcloud.com`:
   - In `resolve_url()`, change the base URL
   - Add `client_id` query parameter alongside OAuth header

6. Update existing tests to include the new `transcodings` field (empty vec for existing tests).

**Step 2: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -30`
Expected: Compiles (may have warnings about unused transcodings field)

**Step 3: Run tests**

Run: `cd src-tauri && cargo test playlist::tests -- --nocapture 2>&1 | tail -30`
Expected: All existing playlist tests pass

**Step 4: Commit**

```bash
git add src-tauri/src/services/playlist.rs
git commit -m "feat: extend TrackInfo with SoundCloud media transcodings"
```

---

### Task 6: Create ffmpeg downloader service

**Files:**
- Create: `src-tauri/src/services/downloader.rs`
- Modify: `src-tauri/src/services/mod.rs` (add `pub mod downloader;`)

**Step 1: Create the downloader module**

Create `src-tauri/src/services/downloader.rs` with the same public API as `ytdlp.rs`:

Key functions and types to implement:
- `pub struct PlaylistContext` (same as ytdlp.rs)
- `pub struct TrackDownloadToMp3Config` (same, but add `transcodings: Vec<Transcoding>` and `duration_ms: u64`)
- `pub struct DownloadProgressEvent` (same as ytdlp.rs)
- `pub struct DownloadProgress` (same)
- `fn sanitize_filename()` (same)
- `fn build_base_filename()` (same)
- `fn cleanup_partial_files()` (adapted: clean .part files instead of .ytdl)

New functions:
- `fn parse_ffmpeg_progress(line: &str, duration_ms: u64) -> Option<DownloadProgress>` — parse ffmpeg's key=value progress output
- `fn classify_ffmpeg_error(stderr: &str) -> Option<DownloadError>` — classify ffmpeg stderr errors

Core download function:
```rust
pub async fn download_track_to_mp3<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: TrackDownloadToMp3Config,
    active_child: Option<Arc<Mutex<Option<CommandChild>>>>,
    cancel_rx: Option<watch::Receiver<bool>>,
    active_pid: Option<Arc<Mutex<Option<u32>>>>,
    skip_auth: bool,
) -> Result<PathBuf, DownloadError>
```

The implementation:
1. Handle OAuth token refresh (same logic as ytdlp.rs)
2. Call `stream::select_best_transcoding()` to pick best stream
3. Call `stream::resolve_stream_url()` to get CDN URL
4. Build output filename using `build_base_filename()`
5. Spawn ffmpeg sidecar with args:
   ```
   -i <stream_url> -codec:a libmp3lame -b:a 320k -progress pipe:1 -v error -y <output.mp3>
   ```
6. Parse stdout for progress (key=value format)
7. Emit `download-progress` events
8. Handle cancellation via `cancel_rx`
9. Return output file path

Also implement `get_version()` — this can be removed since `ffmpeg.rs` already has it, or redirect to test ffmpeg instead.

**Step 2: Register the module**

In `src-tauri/src/services/mod.rs`, add `pub mod downloader;`

**Step 3: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -30`
Expected: Compiles

**Step 4: Commit**

```bash
git add src-tauri/src/services/downloader.rs src-tauri/src/services/mod.rs
git commit -m "feat: add ffmpeg-based audio downloader service"
```

---

### Task 7: Write tests for ffmpeg progress parsing

**Files:**
- Modify: `src-tauri/src/services/downloader.rs` (add tests)

**Step 1: Add unit tests**

Add tests for:
- `parse_ffmpeg_progress` with various ffmpeg output lines
- `classify_ffmpeg_error` with ffmpeg error patterns
- `sanitize_filename` (carried over from ytdlp.rs)
- `build_base_filename` (carried over from ytdlp.rs)

Key test cases:
```rust
#[test]
fn test_parse_ffmpeg_progress_basic() {
    // out_time_us=5000000 means 5 seconds
    // For a 10-second track (10000ms), this is 50%
    let progress = parse_ffmpeg_progress("out_time_us=5000000", 10000);
    assert!(progress.is_some());
    let p = progress.unwrap();
    assert!((p.percent - 0.5).abs() < 0.01);
}

#[test]
fn test_parse_ffmpeg_progress_complete() {
    let progress = parse_ffmpeg_progress("progress=end", 10000);
    // Should indicate completion
}

#[test]
fn test_parse_ffmpeg_progress_speed() {
    let progress = parse_ffmpeg_progress("speed=2.5x", 10000);
    // Speed should be captured
}
```

**Step 2: Run tests**

Run: `cd src-tauri && cargo test downloader::tests -- --nocapture 2>&1 | tail -20`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src-tauri/src/services/downloader.rs
git commit -m "test: add ffmpeg progress parsing and filename tests"
```

---

### Task 8: Update pipeline.rs to use new downloader

**Files:**
- Modify: `src-tauri/src/services/pipeline.rs`

**Step 1: Update imports**

Change:
```rust
use crate::services::ytdlp::{download_track_to_mp3, PlaylistContext, TrackDownloadToMp3Config};
```
To:
```rust
use crate::services::downloader::{download_track_to_mp3, PlaylistContext, TrackDownloadToMp3Config};
```

**Step 2: Update PipelineConfig to include transcodings and duration**

Add to `PipelineConfig`:
```rust
pub transcodings: Vec<crate::services::stream::Transcoding>,
pub duration_ms: u64,
```

Update `download_and_convert` to pass these to `TrackDownloadToMp3Config`.

**Step 3: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -30`
Expected: Compilation errors in callers of `PipelineConfig` (download.rs, queue.rs) — expected

**Step 4: Commit**

```bash
git add src-tauri/src/services/pipeline.rs
git commit -m "refactor: update pipeline to use new downloader service"
```

---

### Task 9: Update commands and queue to use new imports

**Files:**
- Modify: `src-tauri/src/commands/download.rs`
- Modify: `src-tauri/src/services/queue.rs`

**Step 1: Update download.rs imports**

Change:
```rust
use crate::services::ytdlp::DownloadProgressEvent;
```
To:
```rust
use crate::services::downloader::DownloadProgressEvent;
```

Update `PipelineConfig` construction to include `transcodings` and `duration_ms` fields.
Note: The `download_track_full` command currently doesn't have transcodings. We need to resolve them here or add a step. The simplest approach: add a call to `fetch_track_info()` to get transcodings before starting the pipeline, OR modify `DownloadRequest` to include transcodings from the frontend.

Since the frontend already calls `get_track_info` before downloading, the cleanest approach is to pass transcodings through the download request. However, transcodings contain API URLs (not useful for frontend). Better approach: resolve transcodings in the download command itself by fetching from the API.

Add to `download_track_full`:
```rust
// Resolve track transcodings for stream URL
let track_info = crate::services::playlist::fetch_track_info(&request.track_url).await
    .map_err(|e| ErrorResponse { code: "STREAM_RESOLUTION_FAILED".to_string(), message: e.to_string() })?;
```

Then pass `track_info.transcodings` and `track_info.duration` to `PipelineConfig`.

**Step 2: Update queue.rs imports**

Change:
```rust
use crate::services::ytdlp::PlaylistContext;
```
To:
```rust
use crate::services::downloader::PlaylistContext;
```

Update error references from `YtDlpError` to `DownloadError`.

Update `PipelineConfig` construction in queue processing to include transcodings.
For queue items, we need transcodings. Add a `transcodings` field to `QueueItem` or resolve them per-track in the queue loop.

Best approach: resolve transcodings per-track in the queue loop (before calling `download_and_convert`), similar to `download_track_full`. This keeps the frontend API unchanged.

**Step 3: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -50`
Expected: Should compile (may still have ytdlp module references in mod.rs/lib.rs)

**Step 4: Commit**

```bash
git add src-tauri/src/commands/download.rs src-tauri/src/services/queue.rs
git commit -m "refactor: update download command and queue to use new downloader"
```

---

### Task 10: Remove yt-dlp modules and update registrations

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Delete: `src-tauri/src/commands/ytdlp.rs`
- Delete: `src-tauri/src/services/ytdlp.rs`
- Delete: `src-tauri/src/services/ytdlp_errors.rs`
- Delete: `src-tauri/src/bin/test_ytdlp.rs`

**Step 1: Update commands/mod.rs**

Remove:
```rust
pub mod ytdlp;
pub use ytdlp::test_ytdlp;
```

**Step 2: Update services/mod.rs**

Remove:
```rust
pub mod ytdlp;
pub mod ytdlp_errors;
```

Ensure `pub mod stream;` and `pub mod downloader;` are present.

**Step 3: Update lib.rs**

Remove `test_ytdlp` from:
- The `use commands::{ ... }` import
- The `collect_commands![ ... ]` macro

**Step 4: Delete the old files**

```bash
rm src-tauri/src/commands/ytdlp.rs
rm src-tauri/src/services/ytdlp.rs
rm src-tauri/src/services/ytdlp_errors.rs
rm src-tauri/src/bin/test_ytdlp.rs
```

**Step 5: Remove test_ytdlp binary from Cargo.toml**

In `src-tauri/Cargo.toml`, remove:
```toml
[[bin]]
name = "test_ytdlp"
path = "src/bin/test_ytdlp.rs"
```

**Step 6: Run cargo check**

Run: `cd src-tauri && cargo check 2>&1 | head -30`
Expected: Compiles successfully with no yt-dlp references

**Step 7: Run all tests**

Run: `cd src-tauri && cargo test 2>&1 | tail -30`
Expected: All tests pass

**Step 8: Commit**

```bash
git add -A src-tauri/
git commit -m "refactor: remove all yt-dlp modules and command registration"
```

---

### Task 11: Remove yt-dlp binaries and update build config

**Files:**
- Delete: `src-tauri/binaries/yt-dlp-aarch64-apple-darwin`
- Delete: `src-tauri/binaries/yt-dlp-x86_64-apple-darwin`
- Delete: `src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/binaries/checksums.txt` (remove yt-dlp entries)

**Step 1: Delete yt-dlp binaries**

```bash
rm src-tauri/binaries/yt-dlp-aarch64-apple-darwin
rm src-tauri/binaries/yt-dlp-x86_64-apple-darwin
rm src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe
```

**Step 2: Update tauri.conf.json**

Remove `"binaries/yt-dlp"` from the `externalBin` array. Keep `"binaries/ffmpeg"` and `"binaries/ffprobe"`.

**Step 3: Update checksums.txt**

Remove any lines referencing yt-dlp binaries.

**Step 4: Commit**

```bash
git add -A src-tauri/binaries/ src-tauri/tauri.conf.json
git commit -m "chore: remove yt-dlp sidecar binaries and config"
```

---

### Task 12: Update frontend references and regenerate bindings

**Files:**
- Modify: `src/bindings.ts` (auto-regenerated)
- Check: `src/features/queue/store.ts`
- Check: `src/features/queue/api/download.ts`
- Check: `src/features/queue/types/track.ts`
- Check: `src/locales/en.json` and `src/locales/fr.json`

**Step 1: Search for yt-dlp references in frontend**

Run a search for "yt-dlp" or "ytdlp" across all frontend `.ts`, `.tsx`, `.json` files. Update any comments or strings that reference yt-dlp.

**Step 2: Regenerate TypeScript bindings**

Run: `npm run tauri dev` briefly (or trigger specta export) to regenerate `src/bindings.ts` without the `test_ytdlp` command.

Alternatively, manually remove the `testYtdlp` function from `src/bindings.ts`.

**Step 3: Check for broken imports**

Run: `npm run typecheck 2>&1 | head -30`
Expected: No TypeScript errors

**Step 4: Run frontend tests**

Run: `npm test 2>&1 | tail -20`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/
git commit -m "chore: update frontend references and regenerate bindings"
```

---

### Task 13: Full integration test

**Step 1: Run complete cargo test suite**

Run: `cd src-tauri && cargo test 2>&1`
Expected: All Rust tests pass

**Step 2: Run frontend test suite**

Run: `npm test 2>&1`
Expected: All frontend tests pass

**Step 3: Run typecheck**

Run: `npm run typecheck 2>&1`
Expected: No errors

**Step 4: Try cargo build**

Run: `cd src-tauri && cargo build 2>&1 | tail -20`
Expected: Builds successfully

**Step 5: Commit any fixes**

If any tests or checks fail, fix and commit the fixes.

---

### Task 14: Update CLAUDE.md and documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update architecture docs**

Update the "Download Pipeline" section in CLAUDE.md:
- Remove references to yt-dlp
- Document the new flow: URL validation → Stream resolution → ffmpeg download → metadata embedding
- Update the "Sidecar Binaries" section to remove yt-dlp
- Update the "Key Files" table

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for yt-dlp to ffmpeg migration"
```
