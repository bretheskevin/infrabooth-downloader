# Tauri Event System

## Event Constants (from services/events.rs)
- `DOWNLOAD_PROGRESS` — per-track download progress (DownloadProgressEvent)
- `QUEUE_PROGRESS` — queue-level progress (QueueProgressEvent: current/total/track_id)
- `QUEUE_COMPLETE` — queue finished (QueueCompleteEvent: completed/failed/total/failed_tracks)
- `QUEUE_CANCELLED` — queue cancelled (QueueCancelledEvent: completed/cancelled/total)
- `DOWNLOAD_RATE_LIMITED` — rate limit hit (RateLimitInfo)
- `PLAYLIST_TRACKS_BATCH` — streamed playlist track batches (TracksBatchEvent)
- `ARTIST_TRACKS_BATCH` — streamed artist track batches
- `ARTIST_PLAYLIST_TRACKS_BATCH` — streamed artist playlist track batches
- `ARTIST_ALBUMS_BATCH` — streamed artist album batches (ArtistAlbumsBatchEvent)
- `AUTH_STATE_CHANGED` — auth state changes
- `AUTH_REAUTH_NEEDED` — re-authentication required
- `OPEN_SETTINGS` — open settings dialog (from menu)
- `UPDATE_DOWNLOAD_PROGRESS` — app update download progress

## Frontend Event Listeners
Queue store (`setupQueueEventListeners`): listens to download-progress, queue-progress, queue-complete, queue-cancelled
Auth store: listens to AUTH_STATE_CHANGED, AUTH_REAUTH_NEEDED
Settings hooks: listens to OPEN_SETTINGS

## Pattern
Rust emits events via `app_handle.emit(EVENT_NAME, payload)`
Frontend listens via `listen(eventName, callback)` from @tauri-apps/api/event
TracksBatchEvent used for streaming large track lists incrementally (entity_id + tracks batch)
