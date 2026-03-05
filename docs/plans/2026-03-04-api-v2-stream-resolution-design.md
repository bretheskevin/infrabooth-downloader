# API v2 Stream Resolution Design

## Problem

SoundCloud's Datadome bot protection returns 403 when `stream.rs` fetches the HTML page to extract `__sc_hydration` data. The hardcoded `WEB_CLIENT_ID` is also fragile and will break when SoundCloud rotates it.

## Solution

Align stream resolution with yt-dlp's approach: use SoundCloud API v2 directly instead of web scraping, with dynamically scraped client_id.

## Scope

Stream resolution only (`stream.rs`). No changes to `playlist.rs`, `downloader.rs`, `pipeline.rs`, `queue.rs`, or frontend code.

## Architecture

### 1. Dynamic Client ID Module (`client_id.rs`)

New module responsible for:
- Scraping `client_id` from SoundCloud's homepage JS bundles
- In-memory caching via `Lazy<Mutex<Option<String>>>`
- Invalidation + re-scrape on 401/403

**Scraping flow:**
1. `GET https://soundcloud.com/` with browser-like User-Agent
2. Extract `<script src="...">` tags from HTML
3. Iterate scripts in reverse order (client_id is usually in later bundles)
4. `GET` each script URL
5. Apply regex: `client_id\s*:\s*"([0-9a-zA-Z]{32})"`
6. First match wins — cache and return

**Public API:**
- `get_client_id() -> Result<String, DownloadError>` — returns cached or freshly scraped
- `invalidate_client_id()` — clears cache, forcing next call to re-scrape

### 2. Stream Resolution via API v2 (`stream.rs` rewrite)

**New flow:**
1. Get client_id from `client_id` module
2. `GET api-v2.soundcloud.com/resolve?url={track_url}&client_id={id}`
   - Returns track JSON with `media.transcodings[]` and `policy` field
3. Check `policy == "BLOCK"` → GeoBlocked error
4. Select best transcoding
5. `GET transcoding.url?client_id={id}`
   - Returns `{"url": "cdn-stream-url"}`
6. Return `StreamInfo { url, is_hls }`

**Retry on 401/403:**
- First failure → `invalidate_client_id()` + re-scrape + retry
- Second failure → return error

### 3. Updated Transcoding Selection

Priority order (matching yt-dlp `_DEFAULT_FORMATS`):
1. Progressive AAC HQ (`http_aac`)
2. HLS AAC HQ (`hls_aac`)
3. Progressive Opus (`http_opus`)
4. HLS Opus (`hls_opus`)
5. Progressive MP3 (`http_mp3`)
6. HLS MP3 (`hls_mp3`)

Filters:
- Skip DRM protocols (`ctr-*`, `cbc-*`)
- Skip `abr` preset (broken)
- Skip snipped/preview tracks
- Normalize `progressive` → `http`

Codec detection from `mime_type`:
- `audio/mp4; codecs="mp4a.40.2"` → AAC
- `audio/ogg; codecs="opus"` → Opus
- `audio/mpeg` → MP3

### 4. Error Handling

| HTTP Status | First attempt | Second attempt |
|-------------|--------------|----------------|
| 401 | Invalidate client_id, retry | `AuthRequired` |
| 403 | Invalidate client_id, retry | `GeoBlocked` |
| 429 | `RateLimited` (queue handles backoff) | — |
| 404 | `TrackUnavailable` | — |

Track-level: `policy: "BLOCK"` → `GeoBlocked`

## Files Changed

| File | Change |
|------|--------|
| `src-tauri/src/services/client_id.rs` | **NEW** — Dynamic client_id scraping + caching |
| `src-tauri/src/services/stream.rs` | **REWRITE** — API v2, remove HTML scraping, update transcoding selection |
| `src-tauri/src/services/mod.rs` | Add `pub mod client_id;` |

## Downstream Impact

None. `StreamInfo` return type is unchanged. `downloader.rs` and `pipeline.rs` consume `StreamInfo` and are unaffected.
