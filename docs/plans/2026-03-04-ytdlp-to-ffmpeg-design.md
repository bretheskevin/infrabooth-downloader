# yt-dlp to ffmpeg Migration — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Goal

Replace yt-dlp sidecar with native SoundCloud stream resolution + ffmpeg for audio downloading and conversion. Remove all yt-dlp binaries and code.

## Context

Currently, the app uses yt-dlp to:
1. Resolve SoundCloud track URLs to audio streams
2. Download audio streams (progressive HTTP or HLS)
3. Convert to MP3 at 320kbps

The app already has:
- SoundCloud API integration (`playlist.rs`) with OAuth + app tokens
- ffmpeg bundled as a sidecar for conversion
- ID3 metadata embedding via `metadata.rs`
- A hardcoded `CLIENT_ID` that works with SoundCloud's v2 API

## Research: SoundCloud Stream Resolution

Reverse-engineered from yt-dlp's SoundCloud extractor:

### API Flow (two calls per track)

1. **Resolve track** — `GET api-v2.soundcloud.com/resolve?url=<permalink>&client_id=<cid>`
   - Returns track JSON with `media.transcodings[]` array
   - Each transcoding has: `url` (API endpoint), `preset`, `format.protocol`, `format.mime_type`, `quality`

2. **Get CDN stream URL** — `GET <transcoding.url>?client_id=<cid>` (+ OAuth header for HQ)
   - Returns `{ "url": "<CloudFront signed CDN URL>" }`
   - CDN URLs have expiration via `Policy`, `Signature`, `Key-Pair-Id` params

### Stream Types

| Preset | Protocol | Quality | Bitrate | Auth Required |
|--------|----------|---------|---------|---------------|
| `mp3_0_0` | progressive | sq | 128kbps | No |
| `hls_mp3_128` | hls | sq | 128kbps | No |
| `hls_opus_64` | hls | sq | 64kbps | No |
| `aac_hq` / `hls_aac_hi` | hls | hq | 256kbps | Go+ OAuth |

**Note:** SoundCloud does NOT serve 320kbps MP3. Highest is 256kbps AAC (Go+) or 128kbps MP3 (standard).

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `api-v2.soundcloud.com/resolve?url=<url>&client_id=<cid>` | Resolve permalink → track/playlist JSON |
| `api-v2.soundcloud.com/media/soundcloud:tracks:<id>/...?client_id=<cid>` | Resolve transcoding → CDN URL |
| `api-v2.soundcloud.com/tracks/<id>/download?client_id=<cid>` | Original download (if enabled) |

## Architecture

### New Files

- **`src-tauri/src/services/stream.rs`** — SoundCloud stream URL resolution
  - Picks best transcoding (progressive preferred, then HLS; HQ with OAuth)
  - Resolves transcoding API URL → signed CDN URL

- **`src-tauri/src/services/downloader.rs`** — ffmpeg-based audio downloader
  - Replaces `ytdlp.rs`
  - Invokes ffmpeg sidecar: `ffmpeg -i <stream_url> -codec:a libmp3lame -b:a 320k -progress pipe:1 -y <output.mp3>`
  - Parses ffmpeg progress output (key=value format with `out_time_us`)
  - Same public API: `download_track_to_mp3()`, `DownloadProgressEvent`, `PlaylistContext`

### Modified Files

- **`src-tauri/src/services/playlist.rs`** — Extend `TrackInfo` with `media.transcodings` data
  - Switch resolve endpoint from `api.soundcloud.com` to `api-v2.soundcloud.com`
  - Add `transcodings: Vec<Transcoding>` to track response parsing

- **`src-tauri/src/models/error.rs`** — Rename `YtDlpError` → `DownloadError`
  - Add `StreamResolutionFailed(String)` variant
  - Remove yt-dlp-specific error message ("yt-dlp binary not found" → "ffmpeg binary not found")

- **`src-tauri/src/services/pipeline.rs`** — Update imports from `ytdlp` → `downloader`
- **`src-tauri/src/services/queue.rs`** — Update imports, error variant references
- **`src-tauri/src/commands/download.rs`** — Update imports
- **`src-tauri/src/commands/mod.rs`** — Remove `ytdlp` module, remove `test_ytdlp` export
- **`src-tauri/src/services/mod.rs`** — Replace `ytdlp`/`ytdlp_errors` with `stream`/`downloader`
- **`src-tauri/src/lib.rs`** — Remove `test_ytdlp` from command registration
- **`src-tauri/src/services/cancellation.rs`** — Update log messages
- **`tauri.conf.json`** — Remove `"binaries/yt-dlp"` from sidecar list
- **`src-tauri/Cargo.toml`** — Remove `test_ytdlp` binary entry

### Deleted Files

- `src-tauri/src/services/ytdlp.rs`
- `src-tauri/src/services/ytdlp_errors.rs`
- `src-tauri/src/commands/ytdlp.rs`
- `src-tauri/src/bin/test_ytdlp.rs`
- `src-tauri/binaries/yt-dlp-aarch64-apple-darwin`
- `src-tauri/binaries/yt-dlp-x86_64-apple-darwin`
- `src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe`

### Unchanged

- `metadata.rs` — ID3 embedding stays the same
- `oauth.rs` / `storage.rs` — Auth flow unchanged
- `ffmpeg.rs` / `commands/ffmpeg.rs` — ffmpeg version check unchanged
- Frontend download flow — Same event shape, same commands (minus `test_ytdlp`)

## ffmpeg Download Strategy

ffmpeg handles both progressive HTTP and HLS streams transparently:

```bash
# Progressive stream (direct HTTP)
ffmpeg -i "https://cf-media.sndcdn.com/media/.../stream?Policy=..." \
  -codec:a libmp3lame -b:a 320k -progress pipe:1 -y "output.mp3"

# HLS stream (m3u8)
ffmpeg -i "https://cf-hls-media.sndcdn.com/media/.../stream.m3u8?Policy=..." \
  -codec:a libmp3lame -b:a 320k -progress pipe:1 -y "output.mp3"
```

### Progress Parsing

ffmpeg's `-progress pipe:1` outputs:
```
out_time_us=5000000
total_size=80000
speed=2.5x
progress=continue
```

Percent calculated as: `out_time_us / (track_duration_ms * 1000)`

### Stream Selection Priority

1. Progressive MP3 (simplest, no transcoding overhead if already MP3)
2. Progressive AAC HQ (with OAuth — highest quality)
3. HLS MP3 128kbps (fallback)
4. HLS Opus (last resort)

## Error Model

`YtDlpError` → `DownloadError`:

```rust
pub enum DownloadError {
    DownloadFailed(String),
    BinaryNotFound,              // ffmpeg not found
    RateLimited,
    GeoBlocked(String),
    TrackUnavailable(String),
    NetworkError(String),
    ConversionFailed(String),
    AuthRequired(String),
    Cancelled,
    AuthRefreshFailed,
    StreamResolutionFailed(String),  // NEW
}
```

Error classification moves from stderr parsing (ytdlp_errors.rs) to:
- HTTP status codes during stream resolution (403 → GeoBlocked, 429 → RateLimited, etc.)
- ffmpeg exit codes and stderr for conversion errors

## Frontend Impact

Minimal:
- `bindings.ts` auto-regenerated (removes `test_ytdlp` command)
- `DownloadProgressEvent` shape unchanged
- No UI changes needed (progress events, error codes stay the same)

## Bundle Size Impact

Removing yt-dlp binaries saves significant bundle size:
- yt-dlp-aarch64-apple-darwin: ~11MB
- yt-dlp-x86_64-apple-darwin: ~11MB
- yt-dlp-x86_64-pc-windows-msvc.exe: ~11MB

Total savings: ~33MB across platforms.
