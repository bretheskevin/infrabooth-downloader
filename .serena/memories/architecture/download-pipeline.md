# Download Pipeline

## Flow
1. **URL input** → validate SoundCloud URL (url_validator.rs)
2. **Media info fetch** → resolve track/playlist via API v2 (stream.rs: fetch_track_data_v2 / fetch_track_data_with_fallback)
3. **Queue creation** → DownloadQueue with QueueItems (TrackCore + track_number)
4. **Concurrent processing** → spawn_pending_tasks up to max_concurrent
5. **Per-track pipeline** (pipeline.rs: download_and_convert):
   a. Build PipelineConfig (track_url, output_dir, metadata, playlist_context, oauth_token, download_url)
   b. Check for existing file (scan_existing_track_ids)
   c. Resolve stream URL (stream.rs: resolve_stream_url)
   d. Try original download first (lossless if available)
   e. Fall back to transcoding download via FFmpeg sidecar
6. **FFmpeg execution** (downloader.rs):
   - Sidecar binary from `src-tauri/binaries/`
   - Progress parsing from stderr (time-based percentage)
   - Format detection: WAV, FLAC, MP3, AAC
   - Output: MP3 320kbps (or copy if already MP3)
7. **Metadata** (metadata.rs): ID3 tags + artwork download + embedding
8. **Progress events** → streamed to frontend via Tauri events

## Stream Resolution (stream.rs)
- Fetch track media info from SoundCloud API v2
- Score-based transcoding selection: codec priority (AAC > Opus > MP3), protocol (progressive > HLS), quality (hq preferred), filter snipped/DRM/ABR
- Resolve CDN URL from transcoding URL
- Auth retry on 401/403
- Geo-block detection

## Rate Limiting
- Detected from FFmpeg 429 errors or API responses
- RateLimitInfo: remaining_requests, reset_time, max_nr_of_requests, time_window
- User choice: wait (auto-resume), skip track, cancel queue
- rate_limit_choice.rs + auth_choice.rs for async user decision flow

## Cancellation
- CancellationState: broadcast channel + active process tracking
- Process tree killing on cancel
- Partial file cleanup
